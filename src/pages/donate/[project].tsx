import type { GetServerSideProps } from "next";
import { THANKS_QUERY_KEY } from "src/lib/donation";
import { RETURN_QUERY_KEY, validateDonationReturn } from "src/lib/donationNavigation";
import { getDonationSource } from "src/lib/donationSources";
import type { DonatePageProps } from "../donate";

export { default } from "../donate";

export const getServerSideProps: GetServerSideProps<DonatePageProps> = async ({
  params,
  query,
  req,
}) => {
  const source = getDonationSource(params?.project);
  if (!source) return { notFound: true };
  return {
    props: {
      initialSourceSlug: source.slug,
      initialThanks: query[THANKS_QUERY_KEY] !== undefined,
      initialReturnTo:
        validateDonationReturn(source, query[RETURN_QUERY_KEY]) ??
        validateDonationReturn(source, req.headers.referer),
    },
  };
};
