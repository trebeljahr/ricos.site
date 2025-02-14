import Layout from "@components/Layout";
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
      <h1 className="mt-10">Hmm... seems like something went wrong. </h1>
      <p>Maybe try subscribing to the newsletter once more?</p>
    </Layout>
  );
}
