interface BrandMarkProps {
  /** Pixel size of the square mark. */
  size?: number;
  className?: string;
}

/**
 * The product mark: a mortarboard on a rounded square, with a coral tassel.
 * Colours come from the theme tokens, so it follows light and dark.
 */
export default function BrandMark({ size = 40, className = "" }: BrandMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role="img"
      aria-label="Sistema Acadêmico"
      className={className}
    >
      <rect width="40" height="40" rx="12" fill="rgb(var(--c-brand-600))" />
      <path d="M20 9 4 17l16 8 16-8z" fill="#ffffff" />
      <path
        d="M11 21.500v5.200c0 1.800 4 4.300 9 4.300s9-2.500 9-4.300v-5.200l-9 4.500z"
        fill="#ffffff"
        fillOpacity="0.78"
      />
      <path
        d="M34 18v8"
        stroke="rgb(var(--c-coral))"
        strokeWidth="2.400"
        strokeLinecap="round"
      />
      <circle cx="34" cy="28.500" r="2.200" fill="rgb(var(--c-coral))" />
    </svg>
  );
}
