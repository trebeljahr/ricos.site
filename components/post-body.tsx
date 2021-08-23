type Props = {
  content: string;
};

const PostBody = ({ content }: Props) => {
  return (
    <div className="text-2xl mx-auto font-sans">
      <div className="markdown" dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  );
};

export default PostBody;
