import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterForm";
import Header from "@components/PostHeader";
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
      <article className="pt-5 px-3 mx-auto max-w-prose">
        <Header title="Hmm... seems like something went wrong" />
        <p>Maybe try subscribing to the newsletter once more?</p>
        <div className="mt-[-80px]">
          <NewsletterForm />
        </div>
      </article>
    </Layout>
  );
}
