import { LogicBuilder } from "@components/computer/LogicBuilder";
import Layout from "@components/Layout";

export default function LogicBuilderPage() {
  return (
    <Layout
      title="Logic circuit builder"
      description="Build circuits and watch signals travel through gates."
      keywords={[]}
      url="computer/logic-builder"
      noindex
      siteChrome={false}
    >
      <main className="h-svh w-full overflow-hidden">
        <LogicBuilder />
      </main>
    </Layout>
  );
}
