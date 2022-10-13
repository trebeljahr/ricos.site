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

const CustomMDXCode = (props: any) => {
  console.log(props);
  return (
    <Sandpack
      template={props.template}
      files={{ [`/${props.filename}`]: props.children.props.children }}
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
              CodeBlock,
              pre: (props) => {
                console.log(props);
                return <CustomMDXCode {...props} />;
              },
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
