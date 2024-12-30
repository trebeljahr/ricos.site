import { SectionDescription } from "@velite";
import { MDXContent } from "./MDXContent";
import {
  CardGallery,
  CardGalleryProps,
  SwipeableCardCarouselGallery,
} from "./SwipeableCardCarousel";

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
      <div className="mx-auto max-w-4xl">
        <h2 className="text-5xl">{title}</h2>

        {description && (
          <div className="mb-14 max-w-2xl">
            <MDXContent source={description} />
          </div>
        )}
        {carousel ? (
          <SwipeableCardCarouselGallery {...cardGalleryProps} />
        ) : (
          <CardGallery {...cardGalleryProps} />
        )}
        <div className="mt-12">{linkElem}</div>
      </div>
    </>
  );
};
