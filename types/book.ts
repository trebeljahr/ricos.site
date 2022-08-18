type BookType = {
  slug: string;
  title: string;
  bookCover: string;
  bookAuthor: string;
  done: boolean;
  tags: [];
  summary: false;
  detailedNotes: false;
  amazonLink: string;
  rating: number;
  content: string;
};

export default BookType;
