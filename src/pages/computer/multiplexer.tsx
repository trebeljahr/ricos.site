import { MultiplexerDemo } from "@components/computer/AddressRouting";
import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";

export default function MultiplexerPage() {
  return (
    <DeviceDemoPage
      slug="multiplexer"
      description="A multiplexer chooses which signal gets through."
    >
      <MultiplexerDemo />
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
