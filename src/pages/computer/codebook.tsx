import { Codebook } from "@components/computer/Codebook";
import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";

export default function CodebookPage() {
  return (
    <DeviceDemoPage slug="codebook" description="Give switch states a meaning with a codebook.">
      <div className="mx-auto max-w-prose">
        <Codebook />
      </div>
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
