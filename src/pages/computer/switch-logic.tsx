import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";
import { SwitchLogic } from "@components/computer/SwitchLogic";

export default function SwitchLogicPage() {
  return (
    <DeviceDemoPage
      slug="switch-logic"
      description="Wire two switches to a lamp and click the switches."
    >
      <SwitchLogic />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
