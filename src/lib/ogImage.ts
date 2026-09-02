type CoverLike = { src: string; width?: number; height?: number };

/**
 * Intrinsic dimensions to hand to `<Layout image={…}>` so it can emit an
 * accurate `og:image:height`. Only returns them when the resolved share card is
 * the document's own cover — an SEO `ogImage` override points at a different
 * file whose dimensions aren't known here.
 */
export const ogImageDimensions = (
  cover: CoverLike,
  resolvedImage: string,
): { imageWidth?: number; imageHeight?: number } =>
  resolvedImage === cover.src ? { imageWidth: cover.width, imageHeight: cover.height } : {};
