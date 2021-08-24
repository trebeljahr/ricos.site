import { AvatarWithAuthor as Avatar } from "./avatar";
import DateFormatter from "./date-formatter";
// import CoverImage from "./cover-image";
import { PostTitle, PostSubTitle } from "./post-title";
import Author from "../types/author";

type Props = {
  title: string;
  coverImage?: string;
  date: string;
  author: Author;
  subtitle?: string;
};

const Date = ({ date }: { date: string }) => {
  return (
    <div className="font-bold flex text-lg mr-4">
      <DateFormatter dateString={date} />
    </div>
  );
};

const PostHeader = ({ title, subtitle, coverImage, date, author }: Props) => {
  return (
    <div className="post-header">
      <PostTitle>{title}</PostTitle>
      <PostSubTitle>{subtitle}</PostSubTitle>
      <div className="flex flex-row items-center mb-12">
        <Date date={date} />
        <Avatar name={author.name} picture={author.picture} />
      </div>
      {/* <div className="mb-8 md:mb-16 sm:mx-0"> */}
      {/*   <CoverImage title={title} src={coverImage} /> */}
      {/* </div> */}
    </div>
  );
};

export default PostHeader;
