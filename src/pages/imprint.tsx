import { BreadCrumbs } from "@components/BreadCrumbs";
import { BreadcrumbJsonLd } from "@components/JsonLd";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterForm";
import { ToTopButton } from "@components/ToTopButton";

export default function ImprintPage() {
  return (
    <Layout
      title="Legal Notice – ricos.site"
      description="Legal notice and contact information for ricos.site, the personal website of Rico Trebeljahr."
      url="imprint"
      keywords={["imprint", "legal notice", "impressum", "contact", "Rico Trebeljahr"]}
    >
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Legal Notice", url: "/imprint" },
        ]}
      />
      <main className="py-20 px-3 max-w-5xl mx-auto">
        <article className="mx-auto max-w-prose prose dark:prose-invert">
          <BreadCrumbs path="imprint" />
          <h1 className="text-4xl mt-16!">Legal Notice</h1>

          <p>
            Information pursuant to § 5 DDG (German Digital Services Act) and
            § 18 (2) MStV (Interstate Media Treaty).
          </p>

          <h2>Service Provider</h2>
          <p>
            Rico Trebeljahr
            <br />
            c/o Block Services
            <br />
            Stuttgarter Str. 106
            <br />
            70736 Fellbach
            <br />
            Germany
          </p>

          <h2>Contact</h2>
          <p>
            Email:{" "}
            <a href="mailto:imprint+ricos.site@trebeljahr.com" className="text-myBlue hover:underline">
              imprint+ricos.site@trebeljahr.com
            </a>
          </p>

          <h2>Person Responsible for Content (§ 18 (2) MStV)</h2>
          <p>
            Rico Trebeljahr
            <br />
            c/o Block Services
            <br />
            Stuttgarter Str. 106
            <br />
            70736 Fellbach
            <br />
            Germany
          </p>

          <h2>Liability for Content</h2>
          <p>
            As a service provider, I am responsible for my own content on
            these pages in accordance with § 7 (1) DDG and general laws.
            However, pursuant to §§ 8 to 10 DDG, I am not obligated as a
            service provider to monitor transmitted or stored third-party
            information or to investigate circumstances that indicate illegal
            activity.
          </p>
          <p>
            Obligations to remove or block the use of information under
            general laws remain unaffected. However, liability in this regard
            is only possible from the point in time at which a specific legal
            violation becomes known. Upon becoming aware of such violations, I
            will remove this content immediately.
          </p>

          <h2>Liability for Links</h2>
          <p>
            This site contains links to external websites of third parties
            over whose content I have no influence. Therefore, I cannot
            assume any liability for these third-party contents. The
            respective provider or operator of the pages is always
            responsible for the content of the linked pages.
          </p>

          <h2>Copyright</h2>
          <p>
            The content and works created by the site operator on these pages
            are subject to German copyright law. Duplication, processing,
            distribution, and any kind of use outside the limits of copyright
            require the written consent of the respective author or creator.
          </p>
        </article>

        <footer className="mx-auto max-w-prose">
          <NewsletterForm />
          <ToTopButton />
        </footer>
      </main>
    </Layout>
  );
}
