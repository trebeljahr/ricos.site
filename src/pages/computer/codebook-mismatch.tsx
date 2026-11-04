import { CodebookMismatch } from "@components/computer/CodebookMismatch";
import { DeviceDemoPage } from "@components/computer/DeviceDemoPage";

export default function CodebookMismatchPage() {
  return (
    <DeviceDemoPage
      slug="codebook-mismatch"
      description="Read the same switches with a different codebook."
    >
      <div className="mx-auto max-w-prose">
        <CodebookMismatch />
      </div>
    </DeviceDemoPage>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
