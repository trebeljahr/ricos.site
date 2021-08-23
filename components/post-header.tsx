import { AvatarWithAuthor as Avatar } from "./avatar";
import DateFormatter from "./date-formatter";
import CoverImage from "./cover-image";
import PostTitle from "./post-title";
import Author from "../types/author";

type Props = {
  title: string;
  coverImage: string;
  date: string;
  author: Author;
};

const Date = ({ date }: { date: string }) => {
  return (
    <div className="font-bold flex text-lg mr-4">
      <DateFormatter dateString={date} />
    </div>
  );
};

const PostHeader = ({ title, coverImage, date, author }: Props) => {
  return (
    <>
      <PostTitle>{title}</PostTitle>
      <div className="flex-col items-center md:flex-row mb-12">
        <Date date={date} />
        <Avatar name={author.name} picture={author.picture} />
      </div>
      <div className="mb-8 md:mb-16 sm:mx-0">
        <CoverImage title={title} src={coverImage} />
      </div>
    </>
  );
};

export default PostHeader;
