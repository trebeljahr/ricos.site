import { ExternalLink } from "@components/ExternalLink";
import { BreadcrumbJsonLd } from "@components/JsonLd";
import Layout from "@components/Layout";
import { ProjectCard } from "@components/ProjectCard";
import Link from "next/link";
import { PROJECT_SECTIONS, projectsInSection } from "src/lib/projects";

const toAnchor = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export default function ProjectsPage() {
  return (
    <Layout
      title="Projects"
      description="Games, developer tools, apps and interactive art by Rico Trebeljahr. Most are open source and run in the browser."
      url="projects"
      image="/projects/collection-of-beauty.webp"
      imageAlt="Collage of classic paintings from Collection of Beauty"
      keywords={[
        "projects",
        "portfolio",
        "browser games",
        "open source",
        "developer tools",
        "creative coding",
        "Rico Trebeljahr",
      ]}
    >
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Projects", url: "/projects" },
        ]}
      />
      <main className="py-20 px-3 max-w-(--breakpoint-lg) mx-auto">
        <h1 className="text-5xl mt-16!">Projects</h1>
        <p className="max-w-prose">
          These are the things I have built and put online. Most of them are open source, so each
          card links to the live site and to the code. My software studio,{" "}
          <ExternalLink href="https://ricoslabs.com" rel="noopener">
            Ricos Labs
          </ExternalLink>
          , shows this work too.
        </p>
        <p className="max-w-prose mb-14">
          Some of these started as <Link href="/1-month-projects">1-month projects</Link>, where I
          spend one month on a single idea. My checklist of programming milestones lives on the{" "}
          <Link href="/achievements">achievements</Link> page.
        </p>

        {PROJECT_SECTIONS.map(({ title, intro }) => (
          <section key={title} id={toAnchor(title)} className="mb-16">
            <h2 className="text-3xl">{title}</h2>
            <p className="max-w-prose mb-8">{intro}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {projectsInSection(title).map((project) => (
                <ProjectCard key={project.slug} project={project} />
              ))}
            </div>
          </section>
        ))}
      </main>
    </Layout>
  );
}
