import {
  CardGallery,
  CardGalleryProps,
  SwipeableCardCarouselGallery,
} from "./SwipeableCardCarousel";

type HomePageSectionProps = {
  title: string;
  cardGalleryProps: CardGalleryProps;
  description?: string;
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
        {description && <p className="mb-12 max-w-2xl">{description}</p>}
        {carousel ? (
          <SwipeableCardCarouselGallery {...cardGalleryProps} />
        ) : (
          <CardGallery {...cardGalleryProps} />
        )}
        {linkElem}
      </div>
    </>
  );
};
