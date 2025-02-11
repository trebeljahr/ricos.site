import { ThreeFiberLayout } from "@components/dom/Layout";
import { getShaderFileNames } from "src/lib/getShaderFileNames";
import { toLinks } from "src/lib/toLinks";

export default function Page({ shaderFiles }: { shaderFiles: string[] }) {
  const extraLinks = (
    <>
      <p>Shaders</p>
      {shaderFiles.map(toLinks)}
    </>
  );

  return (
    <ThreeFiberLayout extraLinks={extraLinks}>
      <div>Shader Ideas/Snippets/Whatever</div>
    </ThreeFiberLayout>
  );
}

export async function getStaticProps() {
  const shaderFiles = await getShaderFileNames();
  return {
    props: {
      shaderFiles,
    },
  };
}
