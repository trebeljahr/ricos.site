import { MDXProvider } from "@mdx-js/react";
import Layout from "../../components/layout";

import { SAT } from "../../components/collision-detection/SAT";
import { ProjectionDemo } from "../../components/collision-detection/ProjectionDemo";
import { AxisByAxis } from "../../components/collision-detection/AxisByAxis";
import { ExampleWith2Polygons } from "../../components/collision-detection/ExampleWith2Polygons";
import * as frontmatter from "../../content/posts/a.mdx";
import { Post } from "../../@types/post";
import { MDXProps } from "mdx/types";
import { CodeBlock } from "../../components/CodeBlock";

interface MDXPost extends Post {
  default(props: MDXProps): JSX.Element;
}
const {
  title,
  excerpt,
  default: CollisionDetectionPost,
} = frontmatter as MDXPost;

import { Sandpack } from "@codesandbox/sandpack-react";

// const CustomMDXCode = (props: any) => {
//   console.log(props);
//   return (
//     <Sandpack
//       template={props.template}
//       files={{ [`/${props.filename}`]: props.children.props.children }}
//     />
//   );
// };

import type { SandpackFile } from "@codesandbox/sandpack-react";
import React from "react";

export const createFileMap = (
  children: JSX.Element
): Record<string, SandpackFile> => {
  let codeSnippets = React.Children.toArray(children) as React.ReactElement[];

  console.log({ codeSnippets });

  return codeSnippets.reduce(
    (result: Record<string, SandpackFile>, codeSnippet: React.ReactElement) => {
      if (codeSnippet.props.mdxType !== "pre") {
        return result;
      }
      const { props } = codeSnippet.props.children;
      let filePath; // path in the folder structure
      let fileHidden = false; // if the file is available as a tab
      let fileActive = false; // if the file tab is shown by default

      console.log({ props });
      if (props.metastring) {
        const [name, ...params] = props.metastring.split(" ");
        filePath = "/" + name;
        if (params.includes("hidden")) {
          fileHidden = true;
        }
        if (params.includes("active")) {
          fileActive = true;
        }
      } else {
        if (props.className === "language-js") {
          filePath = "/App.js";
        } else if (props.className === "language-ts") {
          filePath = "/App.tsx";
        } else if (props.className === "language-tsx") {
          filePath = "/App.tsx";
        } else if (props.className === "language-css") {
          filePath = "/styles.css";
        } else {
          throw new Error(
            `Code block is missing a filename: ${props.children}`
          );
        }
      }
      if (result[filePath]) {
        throw new Error(
          `File ${filePath} was defined multiple times. Each file snippet should have a unique path name`
        );
      }
      result[filePath] = {
        code: props.children as string,
        hidden: fileHidden,
        active: fileActive,
      };

      return result;
    },
    {}
  );
};

const SandpackEditor = ({
  children,
  dependencies = {},
}: {
  children: JSX.Element;
  dependencies: { [key: string]: string };
}) => {
  console.log(children);
  const files = createFileMap(children);

  console.log(files);
  return (
    <Sandpack
      template="react-ts"
      files={files}
      options={{
        showNavigator: true,
      }}
      customSetup={{
        dependencies,
      }}
    />
  );
};

const PostComponent = () => {
  return (
    <Layout title={title} description={excerpt}>
      <main>
        <article>
          <MDXProvider
            components={{
              SAT,
              ProjectionDemo,
              AxisByAxis,
              ExampleWith2Polygons,
              SandpackEditor,
              // CodeBlock,
              // pre: (props) => {
              //   console.log(props);
              //   return <CustomMDXCode {...props} />;
              // },
            }}
          >
            <CollisionDetectionPost />
          </MDXProvider>
        </article>
      </main>
    </Layout>
  );
};

export default PostComponent;
