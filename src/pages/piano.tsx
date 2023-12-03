import { CircleOfFifths } from "src/components/piano-project/circle-of-fifths";
import { ToTopButton } from "../components/ToTopButton";
import Layout from "../components/layout";
import { NewsletterForm } from "../components/newsletter-signup";
import { CircleOfFifthsSvg } from "src/components/piano-project/circle-of-fifths-svg";

const PianoProject = () => {
  return (
    <Layout title="" description="" url="">
      <article className="">
        <section className="main-section">
          <CircleOfFifths />
          <CircleOfFifthsSvg />
        </section>
        <section className="main-section">
          <NewsletterForm />
          <ToTopButton />
        </section>
      </article>
    </Layout>
  );
};

export default PianoProject;
