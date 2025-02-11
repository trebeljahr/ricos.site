import Link from "next/link";
import { getShaderFileNames } from "src/lib/getShaderFileNames";

export default function Page({ shaderFiles }: { shaderFiles: string[] }) {
  return (
    <div>
      Shader Ideas/Snippets/Whatever
      {shaderFiles.map((shaderFile) => (
        <Link key={shaderFile} href={"/r3f/shaders/" + shaderFile}>
          {shaderFile}
        </Link>
      ))}
    </div>
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
