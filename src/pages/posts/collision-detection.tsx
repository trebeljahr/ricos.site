import { MDXProvider } from "@mdx-js/react";
import Layout from "../../components/layout";
import { SAT } from "../../components/collision-detection/SAT";
import { ProjectionDemo } from "../../components/collision-detection/ProjectionDemo";
import { AxisByAxis } from "../../components/collision-detection/AxisByAxis";
import { ExampleWith2Polygons } from "../../components/collision-detection/ExampleWith2Polygons";
import * as frontmatter from "../../content/posts/collision-detection.mdx";
import { Post } from "../../@types/post";
import { MDXProps } from "mdx/types";

interface MDXPost extends Post {
  default(props: MDXProps): JSX.Element;
}
const {
  title,
  excerpt,
  default: CollisionDetectionPost,
} = frontmatter as MDXPost;

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
