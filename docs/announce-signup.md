# Announce list signup from other sites

`POST https://ricos.site/api/announce-signup` signs an address up for the
announce-only list "New things from Rico" (`announce` in
`src/lib/newsletter/lists.ts`). It runs the same double opt-in as the forms on
ricos.site: the reader gets a confirm email, and only the click puts the address
on the list. The confirm link and the page after it are on ricos.site.

On ricos.site itself, use `<AnnounceSignup />` from `src/components/AnnounceSignup.tsx`.

## Rules

- Browsers may call it only from `https://` origins on the domains in
  `src/lib/newsletter/ricoOrigins.ts` and their subdomains. Any other `Origin`
  gets a 403 before the body is read. A new project domain goes into that list.
- Body: JSON `{ "email": "...", "website": "" }`. `website` is the honeypot and
  must stay empty; a filled one gets a normal-looking success and no email.
- Five signups per IP per minute, then 429.
- 503 while `LISTMONK_ANNOUNCE_LIST_ID` is unset on the deployment.
- The answer is `{ "success": "..." }` or `{ "error": "...", "errorMessage": "..." }`.
  Show `success` or `errorMessage` as it is.
- Send nothing else. The endpoint stores no page, site or referrer, and must not
  start to: aggregate list counts only.
- Only an inline line under the work, never a modal, popup, banner or toast
  (`ai-work-notes/projects/marketing-plans/making-and-sharing-values.md`).
- The site that hosts the form names this signup in its own privacy page and
  links to https://ricos.site/privacy.

## Copy-paste form

The sentence is Rico's and is used word for word.

```html
<form class="announce-signup" novalidate>
  <label for="announce-email">
    I make a new thing every month or two. Want one email when the next one is out? Nothing else.
  </label>
  <div aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden">
    <input type="text" name="website" tabindex="-1" autocomplete="off" />
  </div>
  <input id="announce-email" name="email" type="email" required autocomplete="email"
         placeholder="you@example.com" />
  <button type="submit">Subscribe</button>
  <p class="announce-signup-status" role="status"></p>
</form>
<script>
  document.querySelectorAll("form.announce-signup").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const status = form.querySelector(".announce-signup-status");
      const email = form.elements.email;
      if (!email.checkValidity()) {
        status.textContent = "Enter a valid email address first.";
        return;
      }
      status.textContent = "Subscribing…";
      try {
        const response = await fetch("https://ricos.site/api/announce-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.value, website: form.elements.website.value }),
        });
        const data = await response.json();
        status.textContent = data.success ?? data.errorMessage ?? "Something went wrong.";
      } catch {
        status.textContent = "Something went wrong. Try again?";
      }
    });
  });
</script>
```

## Sending an announcement

1. Add an entry to `ANNOUNCEMENTS` in `src/lib/announcements.ts` (project slug and
   the date and time it is out, UTC). It appears in `/projects/rss.xml` once that
   time has passed; no deploy is needed on the day.
2. `pnpm newsletter:announce <slug> --dry-run` prints the email,
   `pnpm newsletter:announce <slug>` creates a draft campaign on the announce list.
3. Edit the draft in Listmonk and start it there. The script never sends.
