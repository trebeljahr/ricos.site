import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterForm";

const SubscribePage = () => {
  return (
    <Layout
      title="Subscribe Page"
      description="An page with only the subscribe form of the newsletter. Live and Learn is a newsletter of digital postcards that I send to people every other week or so."
      image={
        "/assets/midjourney/a-hand-writing-down-thoughts-on-a-piece-of-paper.jpg"
      }
      url={"sub"}
      imageAlt={"a hand writing down thoughts on a piece of paper"}
      keywords={[]}
    >
      <main className="py-20 px-3 max-w-5xl mx-auto">
        <footer>
          <NewsletterForm />
        </footer>
      </main>
    </Layout>
  );
};

export default SubscribePage;
