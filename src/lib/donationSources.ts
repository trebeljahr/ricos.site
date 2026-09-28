// Which projects may send donors to /donate?from=<slug>. Kept apart from
// src/lib/donation.ts so the post strip, which imports that file, does not
// pull the whole project catalogue into every post.
import type { DonationSource } from "./donation";
import { PROJECTS } from "./projects";

// Projects that link to /donate but have no entry on /projects yet.
const UNLISTED_SOURCES: DonationSource[] = [
  { slug: "chemistry-sketcher", name: "Chemistry Sketcher" },
];

export function getDonationSource(slug: unknown): DonationSource | null {
  if (typeof slug !== "string") return null;
  const project = PROJECTS.find((entry) => entry.slug === slug);
  if (project) {
    // An on-site link such as /r3f needs no way back: the donor is already here.
    const url = /^https?:\/\//.test(project.link) ? project.link : undefined;
    return { slug, name: project.title, url };
  }
  return UNLISTED_SOURCES.find((source) => source.slug === slug) ?? null;
}
