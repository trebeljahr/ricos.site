/**
 * Emoji the easter eggs draw as images, so they look the same on every platform.
 * The files in /public/sprites are Apple emoji rendered by
 * src/scripts/sprites/renderSprites.py: add an emoji here, then run the script on a Mac.
 */
export const EMOJI_SPRITES = [
  // Home page headings
  "👋🏻",
  "📝",
  "✍️",
  "🌍",
  "🌎",
  "🌏",
  "✈️",
  "💌",
  "📮",
  "📚",
  "📖",
  "💬",
  "📸",
  "🖼️",
  "🎨",
  "⚡",
  "🛠️",
  "🚧",
  "🕸️",
  "🕷️",
  // Newsletter form
  "🌱",
  "🌳",
  "🫗",
  "💧",
  "☁️",
  "🙈",
  "🙉",
  "🙊",
  "🐵",
  "🍌",
  // Post metadata, its clock and its pen
  "🕐",
  "🕑",
  "🕒",
  "🕓",
  "🕔",
  "🕕",
  "🕖",
  "🕗",
  "🕘",
  "🕙",
  "🕚",
  "🕛",
  "⏰",
  "✏️",
  "✒️",
  "🧽",
  // Everywhere else
  "🦉",
  "🪶",
  "🫧",
  "🦕",
  "🏆",
  "⭐",
  "🪡",
  "🔍",
  "🐇",
] as const;

/** Painted Easter eggs. The same script paints them onto the egg emoji. */
export const EASTER_EGG_SPRITES = [
  "easter-egg-pink",
  "easter-egg-blue",
  "easter-egg-yellow",
  "easter-egg-green",
  "easter-egg-purple",
] as const;

export type EmojiSprite = (typeof EMOJI_SPRITES)[number];
export type SpriteName = EmojiSprite | (typeof EASTER_EGG_SPRITES)[number];

/** Emoji files are named by code point, without the variation selector: "🕸️" is 1f578.webp. */
export function spriteSrc(name: SpriteName) {
  const file = name.startsWith("easter-egg-")
    ? name
    : [...name]
        .map((char) => char.codePointAt(0)?.toString(16))
        .filter((hex) => hex !== "fe0f")
        .join("-");
  return `/sprites/${file}.webp`;
}
