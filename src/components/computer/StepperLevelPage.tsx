import Layout from "@components/Layout";
import { PageMain } from "@components/PostHeader";
import clsx from "clsx";
import Link from "next/link";
import {
  hasPart,
  modelNumber,
  STEPPER_LEVELS,
  type StepperPart,
  stepperLevel,
} from "src/lib/computer/stepperLevels";
import { computerDemos } from "src/lib/computerDemos";
import { ComputerDemoNav } from "./ComputerDemoNav";
import { ProgramStepper } from "./ProgramStepper";

const two = (value: number) => String(value).padStart(2, "0");

/**
 * The page of one program stepper level: what its machine adds, the ladder of
 * models with this one marked, and the stepper for that machine.
 */
export function StepperLevelPage({ level: part }: { level: StepperPart }) {
  const level = stepperLevel(part);
  const title = computerDemos.find((demo) => demo.slug === level.slug)?.title ?? level.name;
  return (
    <Layout
      title={title}
      description={level.intro}
      keywords={[]}
      url={`computer/${level.slug}`}
      noindex
      fillViewport
    >
      <PageMain className="w-full">
        <ComputerDemoNav current={level.slug} />
        <header className="not-prose flow-label mt-para mb-para">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
            {title}
          </h1>
          <p className="text-gray-700 dark:text-gray-300">{level.intro}</p>
          <nav aria-label="Machine models">
            <ol className="flex flex-wrap gap-tight font-mono text-xs">
              {STEPPER_LEVELS.map((item) => {
                const current = item.part === part;
                return (
                  <li key={item.part}>
                    <Link
                      href={`/computer/${item.slug}`}
                      aria-current={current ? "page" : undefined}
                      title={
                        current
                          ? "This machine"
                          : hasPart(level, item.part)
                            ? "Part of this machine"
                            : "A later machine adds this"
                      }
                      className={clsx(
                        "inline-flex items-center rounded border px-tight py-hair transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500",
                        current
                          ? "border-cyan-600 bg-cyan-600 text-white"
                          : hasPart(level, item.part)
                            ? "border-gray-400 text-gray-800 hover:border-cyan-500 hover:text-cyan-600 dark:border-gray-500 dark:text-gray-200 dark:hover:text-cyan-300"
                            : "border-dashed border-gray-300 text-gray-500 hover:border-cyan-500 hover:text-cyan-600 dark:border-gray-700 dark:text-gray-400 dark:hover:text-cyan-300",
                      )}
                    >
                      {two(modelNumber(item))} {item.name}
                    </Link>
                  </li>
                );
              })}
            </ol>
          </nav>
        </header>
        <ProgramStepper key={part} level={part} demoLinks />
        <ComputerDemoNav current={level.slug} bottom />
      </PageMain>
    </Layout>
  );
}
