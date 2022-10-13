import dynamic from "next/dynamic";
import { MDXProvider } from "@mdx-js/react";
import Layout from "../../components/layout";

import { SAT } from "../../components/collision-detection/SAT";
import { ProjectionDemo } from "../../components/collision-detection/ProjectionDemo";
import { AxisByAxis } from "../../components/collision-detection/AxisByAxis";
import { ExampleWith2Polygons } from "../../components/collision-detection/ExampleWith2Polygons";
import CollisionDetectionPost from "../../content/posts/a.mdx";

const Post = () => {
  return (
    <Layout title="Collisions" description="Stuff about Collisions">
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

export default Post;
