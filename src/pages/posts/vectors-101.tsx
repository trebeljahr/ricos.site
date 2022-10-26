import { MDXProvider } from "@mdx-js/react";
import Layout from "../../components/layout";
import * as frontmatter from "../../content/posts/vectors-101.mdx";
import { Post } from "../../@types/post";
import { MDXProps } from "mdx/types";
import { ImageRenderer } from "../../components/ImageRenderer";
import { NewsletterForm } from "../../components/newsletter-signup";
import PostHeader from "../../components/post-header";
import { NormalDemo } from "../../components/collision-detection/NormalDemo";
import { DotProductDemo } from "../../components/collision-detection/DotProductDemo";

interface MDXPost extends Post {
  default(props: MDXProps): JSX.Element;
}

const {
  title,
  excerpt,
  subtitle,
  date,
  author,
  default: Vectors101Post,
} = frontmatter as MDXPost;

const PostComponent = () => {
  return (
    <Layout title={title} description={excerpt}>
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
              DotProductDemo,
              NormalDemo,
              PointAndLineDemo: () => null,
            }}
          >
            <Vectors101Post />
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
