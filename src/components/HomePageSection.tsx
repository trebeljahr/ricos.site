import { SectionDescription } from "@velite";
import { MDXContent } from "./MDXContent";
import {
  CardGallery,
  CardGalleryProps,
  ScrollableCardGallery,
} from "./CardGalleries";

type HomePageSectionProps = {
  title: string;
  cardGalleryProps: CardGalleryProps;
  description?: SectionDescription["content"];
  linkElem?: JSX.Element;
  carousel?: boolean;
};

export const HomePageSection = ({
  title,
  carousel,
  linkElem,
  cardGalleryProps,
  description,
}: HomePageSectionProps) => {
  return (
    <>
      <div className="mx-auto max-w-screen-lg">
        <h2 className="text-5xl">{title}</h2>

        {description && (
          <div className="mb-14 max-w-prose">
            <MDXContent source={description} />
          </div>
        )}
        {carousel ? (
          <ScrollableCardGallery {...cardGalleryProps} />
        ) : (
          <CardGallery {...cardGalleryProps} />
        )}
        <div className="mt-12">{linkElem}</div>
      </div>
    </>
  );
};
