import Author from "./author";

type BookType = {
  slug: string;
  title: string;
  bookCover: string;
  bookAuthor: string;
  author: Author;
  amazonLink: string;
  rating: number;
  content: string;
};

export default BookType;
