// SuiteScout mark — inline SVG per BRAND.md ("The Scout Lens").
// Flat geometry, house palette; variants for footer/dark contexts.

const PALETTES = {
  color: {
    badge: "#1d3a2f",
    lens: "#f5efe3",
    backPeak: "#226355",
    frontPeak: "#a94e24",
    sun: "#a94e24",
    handle: "#a94e24",
    ring: null as string | null,
  },
  mono: {
    badge: "#1c2420",
    lens: "#ffffff",
    backPeak: "#1c2420",
    frontPeak: "#1c2420",
    sun: "#1c2420",
    handle: "#1c2420",
    ring: null as string | null,
  },
  reversed: {
    badge: "none",
    lens: "none",
    backPeak: "#f5efe3",
    frontPeak: "#a94e24",
    sun: "#a94e24",
    handle: "#f5efe3",
    ring: "#f5efe3",
  },
} as const;

export default function Logo({
  size = 32,
  variant = "color",
  label = "SuiteScout",
}: {
  size?: number;
  variant?: keyof typeof PALETTES;
  label?: string;
}) {
  const p = PALETTES[variant];
  const decorative = label === "";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative || undefined}
    >
      {p.ring ? (
        <circle
          cx="27"
          cy="27"
          r="14"
          fill="none"
          stroke={p.ring}
          strokeWidth="5"
        />
      ) : (
        <>
          <rect x="2" y="2" width="60" height="60" rx="15" fill={p.badge} />
          <circle cx="27" cy="27" r="14" fill={p.lens} />
        </>
      )}
      <polygon points="19,38 26,24 33,38" fill={p.backPeak} />
      <polygon points="24,38 30,26 35,38" fill={p.frontPeak} />
      <circle cx="35" cy="19" r="2.6" fill={p.sun} />
      <line
        x1="37"
        y1="37"
        x2="48"
        y2="48"
        stroke={p.handle}
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}
