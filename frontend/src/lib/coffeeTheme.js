// Subtle tiled coffee-bean pattern on a white background, shared by the
// Coffee Express admin page and the POS rail so both match.
const BEAN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
  <g fill="#92400e" opacity="0.10">
    <ellipse cx="16" cy="16" rx="10" ry="6.5" transform="rotate(35 16 16)"/>
    <ellipse cx="46" cy="44" rx="10" ry="6.5" transform="rotate(-25 46 44)"/>
  </g>
  <g stroke="#92400e" stroke-width="1.1" opacity="0.18" fill="none">
    <path d="M8 16 Q16 10.5 24 16"/>
    <path d="M38 44 Q46 38.5 54 44"/>
  </g>
</svg>`;

export const coffeeBeansStyle = {
  backgroundColor: "#fffaf3",
  backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(BEAN_SVG)}")`,
  backgroundSize: "64px 64px",
  backgroundRepeat: "repeat",
};
