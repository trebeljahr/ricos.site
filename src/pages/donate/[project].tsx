import type { GetStaticPaths, GetStaticProps } from "next";
import { getDonationSource } from "src/lib/donationSources";
import { PROJECTS } from "src/lib/projects";
import type { DonatePageProps } from "../donate";

export { default } from "../donate";

// One static page per project that may send donors here. `?thanks` and
// `?returnTo` (or, failing that, the project-site referrer) are read in the
// browser by the page itself.
export const getStaticPaths: GetStaticPaths = async () => ({
  paths: PROJECTS.filter(({ slug }) => getDonationSource(slug)).map(({ slug }) => ({
    params: { project: slug },
  })),
  fallback: false,
});

export const getStaticProps: GetStaticProps<DonatePageProps> = async ({ params }) => {
  const source = getDonationSource(params?.project);
  if (!source) return { notFound: true };
  return {
    props: { initialSourceSlug: source.slug, initialThanks: false, initialReturnTo: null },
  };
};
