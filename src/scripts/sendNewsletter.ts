/**
 * Send the newest Live and Learn issue.
 *
 *   pnpm sendNewsletter                        → test list
 *   pnpm sendNewsletter --dry-run              → render only, send nothing
 *   NODE_ENV=production pnpm sendNewsletter    → live list
 *
 * Creates a ListMonk campaign on LISTMONK_TEST_LIST_ID or, in production,
 * LISTMONK_LIVE_LIST_ID, and starts it; ListMonk then sends through SES.
 * Until the cutover, NEWSLETTER_PROVIDER=mailgun mails the Mailgun list
 * address instead.
 */
import slugify from "@sindresorhus/slugify";
import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import Handlebars from "handlebars";
import rehypePresetMinify from "rehype-preset-minify";
import rehypeRewrite from "rehype-rewrite";
import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { newsletterListMail, sendEmail } from "src/lib/mailgun.js";
import { nextImageUrl } from "src/lib/mapToImageProps.js";
import { finalizeIssueBody, UNSUBSCRIBE_PLACEHOLDER } from "src/lib/newsletter/issueBody.js";
import { escapeGoTemplate, getList, sendCampaign } from "src/lib/newsletter/listmonk.js";
import { type NewsletterProvider, newsletterProvider } from "src/lib/newsletter/subscribe.js";
import { baseUrl } from "src/lib/urlUtils.js";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { newsletterPath, sortedNewsletterNames } from "./sortedNewsletters.js";

const number = sortedNewsletterNames[0].replace(".md", "");

const HOST = baseUrl;

const USAGE = "usage: pnpm sendNewsletter [--dry-run]";

function listIdFromEnv(name: string): number {
  const raw = process.env[name];
  const id = Number(raw);
  if (!raw || !Number.isInteger(id) || id <= 0) {
    throw new Error(`Set ${name} to the ListMonk list id to send to.`);
  }
  return id;
}

/**
 * Resolve the ListMonk list and refuse anything that is not clearly the
 * intended one: the test list outside production, the live list in it,
 * and never a single-opt-in list (ListMonk would mail unconfirmed members).
 */
async function resolveCampaignList(production: boolean) {
  const listId = listIdFromEnv(production ? "LISTMONK_LIVE_LIST_ID" : "LISTMONK_TEST_LIST_ID");
  const list = await getList(listId);
  const isTestList = list.name.endsWith("-test");
  if (production === isTestList) {
    throw new Error(
      `List ${list.id} "${list.name}" is ${isTestList ? "a test list" : "not a test list"}, ` +
        `but NODE_ENV=${process.env.NODE_ENV ?? "(unset)"}. Check LISTMONK_${production ? "LIVE" : "TEST"}_LIST_ID.`,
    );
  }
  if (list.optin !== "double") {
    throw new Error(
      `List ${list.id} "${list.name}" is ${list.optin} opt-in; make it double first.`,
    );
  }
  return list;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const unknownArgs = args.filter((arg) => arg !== "--dry-run");
  if (unknownArgs.length > 0) {
    console.error(
      `Unknown argument${unknownArgs.length === 1 ? "" : "s"}: ${unknownArgs.join(" ")}`,
    );
    console.error(USAGE);
    process.exit(1);
  }
  const provider: NewsletterProvider = newsletterProvider();
  const production = process.env.NODE_ENV === "production";

  const emailHandlebarsFile = await readFile(
    path.join(process.cwd(), "src", "content", "email-templates", "newsletter.hbs"),
    "utf-8",
  );

  const mdFileRaw = await readFile(path.join(newsletterPath, `${number}.md`), "utf-8");

  const {
    content,
    data: { cover, title, excerpt, excludeExcerpt },
  } = matter(mdFileRaw);

  function addHost(href: string): string | undefined {
    if (
      href.startsWith("/") &&
      (href.endsWith(".webp") ||
        href.endsWith(".jpg") ||
        href.endsWith(".png") ||
        href.endsWith(".jpeg") ||
        href.endsWith(".gif") ||
        href.endsWith(".svg"))
    ) {
      return nextImageUrl(href, 1080);
    }
    if (href.startsWith("/")) {
      return HOST + href;
    }
    return undefined;
  }

  function rewriteUrls() {
    // biome-ignore lint/suspicious/noExplicitAny: explicit any acknowledged
    return (tree: any) => {
      // biome-ignore lint/suspicious/noExplicitAny: explicit any acknowledged
      visit(tree, "element", (node: any) => {
        for (const prop of ["href", "src"]) {
          const value = node?.properties?.[prop];
          if (typeof value === "string") {
            const rewritten = addHost(value);
            if (rewritten !== undefined) node.properties[prop] = rewritten;
          }
        }
      });
    };
  }

  // Gmail's inbox row renders "Subject - snippet". Without an excerpt the hidden
  // preheader is only invisible filler, so the snippet looks empty and a lone
  // dash trails the subject. Collect the opening paragraph text as a fallback.
  let openingText = "";
  function collectOpeningText() {
    // biome-ignore lint/suspicious/noExplicitAny: explicit any acknowledged
    return (tree: any) => {
      // biome-ignore lint/suspicious/noExplicitAny: explicit any acknowledged
      visit(tree, "element", (node: any) => {
        if (node.tagName !== "p" || openingText.length >= 200) return;
        let paragraph = "";
        // biome-ignore lint/suspicious/noExplicitAny: explicit any acknowledged
        visit(node, "text", (textNode: any) => {
          paragraph += textNode.value;
        });
        paragraph = paragraph.replace(/\s+/g, " ").trim();
        if (paragraph) openingText = `${openingText} ${paragraph}`.trim();
      });
    };
  }

  // biome-ignore lint/suspicious/noExplicitAny: explicit any acknowledged
  function rewrite(node: any) {
    if (node.type === "element" && node.tagName === "img") {
      node.properties = {
        ...node.properties,
        alt: node?.properties?.alt?.replace(/\/[^/]*\//g, "") || "",
        width: "600",
        height: "",
        border: "0",
        style: `
          width: 100%;
          max-width: 600px;
          height: auto;
          background: #ffffff;
          font-family: sans-serif;
          font-size: 15px;
          line-height: 15px;
          color: #333333;
          margin: 10px auto;
          display: block;
        `,
        class: "g-img",
      };
    } else if (
      node.type === "element" &&
      node.tagName.startsWith("h") &&
      node.tagName.length === 2
    ) {
      node.properties = {
        ...node.properties,
        style: `
          margin: 0;
          margin-top: 3rem;
          margin-bottom: 1rem;
        `,
      };
    }
  }

  const file = await unified()
    // biome-ignore lint/suspicious/noExplicitAny: explicit any acknowledged
    .use(remarkParse as any)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rewriteUrls)
    .use(collectOpeningText)
    // biome-ignore lint/suspicious/noExplicitAny: explicit any acknowledged
    .use(rehypeRewrite as any, { rewrite })
    // biome-ignore lint/suspicious/noExplicitAny: explicit any acknowledged
    .use(rehypePresetMinify as any)
    // biome-ignore lint/suspicious/noExplicitAny: explicit any acknowledged
    .use(rehypeStringify as any)
    .process(content);

  const template = Handlebars.compile(emailHandlebarsFile);

  const webversion = `${HOST}/newsletters/${slugify(title)}`;

  const defaultExcerpt = "Live and Learn is a Newsletter filled with awesome links...";

  const newsletterTagLine = "Live and Learn #" + number;
  const realTitle = `${title}`;

  const visibleExcerpt = excludeExcerpt ? "" : excerpt || defaultExcerpt;
  const truncatedOpening =
    openingText.length > 200 ? `${openingText.slice(0, 200).replace(/\s+\S*$/, "")}…` : openingText;
  const preheader = visibleExcerpt || truncatedOpening || defaultExcerpt;

  const htmlEmail = template({
    content: file.value,
    tagLine: newsletterTagLine,
    title: realTitle.trim(),
    excerpt: visibleExcerpt,
    preheader,
    coverImageSrc: nextImageUrl(cover.src, 1080),
    coverImageAlt: cover.alt,
    webversion,
    unsubscribeUrl: UNSUBSCRIBE_PLACEHOLDER,
  });

  const subject = `🌱 ${title.trim()}`;
  const html = finalizeIssueBody(htmlEmail, provider);
  const text = finalizeIssueBody(
    `
🌱 ${realTitle.trim()}


${excerpt}

You can read also [read this on the web](${webversion}).

![${cover.alt}](${cover.src})

${content}

[Unsubscribe](${UNSUBSCRIBE_PLACEHOLDER})

Thanks for reading plaintext emails. You're cool!
`,
    provider,
  );

  console.info(`${title.trim()}: newsletter ${number}`);
  console.info(`provider: ${provider}, NODE_ENV=${process.env.NODE_ENV ?? "(unset)"}`);

  if (provider === "listmonk") {
    const list = await resolveCampaignList(production);
    const confirmed = list.subscriber_statuses?.confirmed ?? 0;
    // ListMonk refreshes list counts every few minutes, so this can lag.
    console.info(`target: ListMonk list ${list.id} "${list.name}", ~${confirmed} confirmed`);
    // An empty live list means the Mailgun readers are not imported yet:
    // the issue would reach nobody while they wait for it on Mailgun.
    if (production && confirmed === 0) {
      throw new Error(
        `Live list ${list.id} "${list.name}" has no confirmed subscribers. ` +
          "Import them first (pnpm newsletter:import), or send this issue with NEWSLETTER_PROVIDER=mailgun.",
      );
    }
    if (dryRun) {
      console.info(`dry run: nothing sent (html ${html.length} bytes, text ${text.length} bytes)`);
      return;
    }
    const campaign = await sendCampaign({
      listId: list.id,
      name: production
        ? `Live and Learn #${number}`
        : `[TEST ${new Date().toISOString().slice(0, 16)}] Live and Learn #${number}`,
      subject: escapeGoTemplate(production ? subject : `[TEST] ${subject}`),
      html,
      text,
    });
    console.info(`campaign ${campaign.id} started: ${campaign.url}`);
    return;
  }

  console.info(`target: Mailgun list ${newsletterListMail}`);
  if (dryRun) {
    console.info(`dry run: nothing sent (html ${html.length} bytes, text ${text.length} bytes)`);
    return;
  }
  await sendEmail({
    from: "Rico Trebeljahr <rico@trebeljahr.com>",
    to: newsletterListMail,
    subject,
    html,
    text,
  });
  console.info("Successfully sent email!");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
