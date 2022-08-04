import Author from "./author";

type BookType = {
  slug: string;
  title: string;
  bookCover: string;
  bookAuthor: string;
  author: Author;
  done: boolean;
  tags: [];
  summary: false;
  detailesNotes: false;
  amazonLink: string;
  rating: number;
  content: string;
};

export default BookType;
