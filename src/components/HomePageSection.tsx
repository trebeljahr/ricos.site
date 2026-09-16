import type { SectionDescription } from "@velite";
import type { ReactNode } from "react";
import { CardGallery, type CardGalleryProps, ScrollableCardGallery } from "./CardGalleries";
import { MDXContent } from "./MDXContent";

type HomePageSectionProps = {
  title: string;
  cardGalleryProps: CardGalleryProps;
  description?: SectionDescription["content"];
  linkElem?: JSX.Element;
  carousel?: boolean;
  // Inline description for sections without a Velite section description.
  children?: ReactNode;
};

export const HomePageSection = ({
  title,
  carousel,
  linkElem,
  cardGalleryProps,
  description,
  children,
}: HomePageSectionProps) => {
  return (
    <div className="mx-auto max-w-(--breakpoint-lg)">
      <h2 className="text-5xl">{title}</h2>

      {(description || children) && (
        <div className="mb-14 max-w-prose">
          {description ? <MDXContent source={description} /> : children}
        </div>
      )}
      {carousel ? (
        <ScrollableCardGallery {...cardGalleryProps} />
      ) : (
        <CardGallery {...cardGalleryProps} />
      )}
      <div className="mt-12">{linkElem}</div>
    </div>
  );
};
