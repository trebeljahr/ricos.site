type Props = {
  content: string;
};

const PostBody = ({ content }: Props) => {
  return (
    <div className="markdown" dangerouslySetInnerHTML={{ __html: content }} />
  );
};

export default PostBody;
