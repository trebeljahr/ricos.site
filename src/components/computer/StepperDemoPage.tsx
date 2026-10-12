import Layout from "@components/Layout";
import { PageMain } from "@components/PostHeader";
import { STEPPER_DEMOS } from "src/lib/computer/stepperDemos";
import { type ComputerDemoSlug, computerDemos } from "src/lib/computerDemos";
import { ComputerDemoNav } from "./ComputerDemoNav";
import { ProgramStepper } from "./ProgramStepper";

/** The page of one program stepper demo: what it shows, then the stepper with its programs. */
export function StepperDemoPage({ slug }: { slug: ComputerDemoSlug }) {
  const demo = STEPPER_DEMOS.find((item) => item.slug === slug);
  const title = computerDemos.find((item) => item.slug === slug)?.title;
  if (!demo || !title) throw new Error(`No program stepper demo at “${slug}”.`);
  return (
    <Layout
      title={title}
      description={demo.intro}
      keywords={[]}
      url={`computer/${slug}`}
      noindex
      fillViewport
    >
      <PageMain className="w-full">
        <ComputerDemoNav current={slug} />
        <header className="not-prose flow-label mt-para mb-para">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
            {title}
          </h1>
          <p className="text-gray-700 dark:text-gray-300">{demo.intro}</p>
        </header>
        <ProgramStepper key={slug} focus={demo.focus ?? undefined} presets={demo.presets} />
        <ComputerDemoNav current={slug} bottom />
      </PageMain>
    </Layout>
  );
}
