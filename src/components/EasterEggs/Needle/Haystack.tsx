/** A bale of hay, drawn so it reads as a haystack rather than a stalk of grain. */
export const Haystack = ({ size }: { size: number }) => (
  <svg
    viewBox="0 0 44 38"
    width={size}
    height={(size * 38) / 44}
    aria-hidden="true"
    focusable="false"
  >
    <ellipse cx="22" cy="34.8" rx="15" ry="2.4" fill="#000" opacity="0.18" />
    {/* Stray stalks poking out of the top and the flanks. */}
    <g stroke="#c08c2c" strokeWidth="1.1" strokeLinecap="round">
      <path d="M22 7.5 21 2.5M22 7.5 25 3.5M22 7.5 18.5 4" />
      <path d="M8.5 26 4 24M35.5 26 40 24M7.5 32 3.5 31.5M36.5 32 40.5 31.5" />
    </g>
    <path d="M22 6c6.6 2.6 13.6 15.4 15.2 28.2H6.8C8.4 21.4 15.4 8.6 22 6Z" fill="#dda93f" />
    {/* The right flank sits in shadow, which gives the mound its volume. */}
    <path d="M22 6c6.6 2.6 13.6 15.4 15.2 28.2H22V6Z" fill="#000" opacity="0.1" />
    <g stroke="#9a6a1d" strokeWidth="0.9" strokeLinecap="round" opacity="0.5" fill="none">
      <path d="M11.5 22c6 2.4 15 2.4 21 0" />
      <path d="M8.8 29c8 2.6 18.4 2.6 26.4 0" />
      <path d="M16 13.5c3.6 1.4 8.4 1.4 12 0" />
      <path d="M18 9.5 16.5 16M26 9.5 27.5 16M13 18 11 24M31 18 33 24M22 25v6" />
    </g>
  </svg>
);

/** The needle, with a thread still trailing from its eye. */
export const Needle = ({ size }: { size: number }) => (
  <svg
    viewBox="0 0 44 38"
    width={size}
    height={(size * 38) / 44}
    aria-hidden="true"
    focusable="false"
  >
    {/* Thread first, so the needle lies on top of it. */}
    <path
      d="M33.5 7.5c4.5-2.4 8 1.4 5.4 4.3-2.3 2.6-6 1.3-6.8 4.6"
      stroke="#d8514a"
      strokeWidth="1.5"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M32 9.8 14.5 25"
      stroke="#b9bfc8"
      strokeWidth="3.4"
      strokeLinecap="round"
      fill="none"
    />
    {/* The tip tapers to a point, which a stroke of one width cannot do. */}
    <path d="M13.2 23.6 16 26.6 6.6 32.4Z" fill="#b9bfc8" />
    <path d="M30 11 16 23.2" stroke="#fff" strokeWidth="1.1" strokeLinecap="round" opacity="0.75" />
    <ellipse
      cx="31.6"
      cy="10.2"
      rx="0.9"
      ry="2.1"
      fill="none"
      stroke="#7d848e"
      strokeWidth="1"
      transform="rotate(-41 31.6 10.2)"
    />
  </svg>
);
