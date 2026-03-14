import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterForm";
export default function EmailSignupError() {
  return (
    <Layout
      title="Email Signup Error"
      description="This page is displayed when a user couldn't complete signing up to the Live and Learn newsletter."
      url="email-signup-error"
      keywords={["newsletter", "email", "signup", "error"]}
      image="/assets/blog/error.png"
      imageAlt="an error sign in the middle of nowhere"
    >
      <article className="mt-16 mx-auto max-w-prose">
        <h1>Hmm... seems like something went wrong</h1>
        <p>Maybe try subscribing to the newsletter once more?</p>
        <div className="mt-[-80px]">
          <NewsletterForm />
        </div>
      </article>
    </Layout>
  );
}
