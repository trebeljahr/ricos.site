import { SimplePage } from "../components/SimplePage";
import { getStaticPropsGetter } from "../lib/getSimplePageProps";

export default SimplePage;

export const getStaticProps = getStaticPropsGetter("1-month-projects.md");
