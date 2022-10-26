import { MDXProvider } from "@mdx-js/react";
import Layout from "../../components/layout";
import { SAT } from "../../components/collision-detection/SAT";
import { ProjectionDemo } from "../../components/collision-detection/ProjectionDemo";
import { AxisByAxis } from "../../components/collision-detection/AxisByAxis";
import { ExampleWith2Polygons } from "../../components/collision-detection/ExampleWith2Polygons";
import { SATWithResponse } from "../../components/collision-detection/SATWithResponse";
import * as post from "../../content/posts/collision-detection.mdx";
import { Post } from "../../@types/post";
import { MDXProps } from "mdx/types";
import { MatrixDemo } from "../../components/collision-detection/MatrixDemo";
import { Triangulation } from "../../components/collision-detection/Triangulation";
import { EarClipping } from "../../components/collision-detection/EarClipping";
import { ImageRenderer } from "../../components/ImageRenderer";
import { NewsletterForm } from "../../components/newsletter-signup";
import PostHeader from "../../components/post-header";
interface MDXPost extends Post {
  default(props: MDXProps): JSX.Element;
}

const {
  title,
  subtitle,
  date,
  author,
  excerpt,
  default: CollisionDetectionPost,
} = post as MDXPost;

const PostComponent = () => {
  return (
    <Layout title={title + " – " + subtitle} description={excerpt}>
      <main>
        <article className="main-section">
          <PostHeader
            subtitle={subtitle}
            title={title}
            date={date}
            author={author}
          />

          <MDXProvider
            components={{
              img: ImageRenderer,
              SAT,
              ProjectionDemo,
              AxisByAxis,
              ExampleWith2Polygons,
              MatrixDemo,
              Triangulation,
              SATWithConcaveShapes: () => (
                <SATWithResponse
                  drawProjections={false}
                  changeColorOnCollision={true}
                  withStar={true}
                />
              ),
              EarClipping,
              SATWithResponse,
            }}
          >
            <CollisionDetectionPost />
          </MDXProvider>
        </article>
        <article className="main-section">
          <NewsletterForm />
        </article>
      </main>
    </Layout>
  );
};

export default PostComponent;
