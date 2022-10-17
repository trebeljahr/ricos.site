import { MDXProvider } from "@mdx-js/react";
import Layout from "../../components/layout";
import { SAT } from "../../components/collision-detection/SAT";
import { ProjectionDemo } from "../../components/collision-detection/ProjectionDemo";
import { AxisByAxis } from "../../components/collision-detection/AxisByAxis";
import { ExampleWith2Polygons } from "../../components/collision-detection/ExampleWith2Polygons";
import * as frontmatter from "../../content/posts/collision-detection.mdx";
import { Post } from "../../@types/post";
import { MDXProps } from "mdx/types";
import { MatrixDemo } from "../../components/collision-detection/MatrixDemo";
import Image from "next/image";
import { ImgHTMLAttributes } from "react";
interface MDXPost extends Post {
  default(props: MDXProps): JSX.Element;
}

const ImageRenderer = (props: ImgHTMLAttributes<HTMLImageElement>) => {
  if (!props.src) return null;
  return (
    <>
      <span className="markdown-image">
        <Image
          src={props.src}
          layout="responsive"
          width={96}
          height={55}
          objectFit="contain"
          alt={props.alt}
        />
      </span>
    </>
  );
};

const {
  title,
  excerpt,
  default: CollisionDetectionPost,
} = frontmatter as MDXPost;

const PostComponent = () => {
  return (
    <Layout title={title} description={excerpt}>
      <main>
        <article className="main-section">
          <MDXProvider
            components={{
              img: ImageRenderer,
              SAT,
              ProjectionDemo,
              AxisByAxis,
              ExampleWith2Polygons,
              MatrixDemo,
              DotProductDemo: () => null,
              ShowWhatANormalIs: () => null,
              PointAndLineDemo: () => null,
              SATWithConvexShapes: () => null,
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
