import { useId } from "react";

// The AtmosFusion mark: a circular badge, a raindrop at its centre and one orbit around it carrying a model.
// Rain, and the models that circle it and fuse into one forecast. public/favicon.svg is the same drawing.
export default function Logo({ size = 32, className = "" }: { size?: number; className?: string }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} role="img" aria-label="AtmosFusion">
      <defs>
        <linearGradient id={`${id}-bg`} x1="6" y1="3" x2="26" y2="29" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3B82F6" />
          <stop offset="1" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="16" fill={`url(#${id}-bg)`} />
      <ellipse cx="16" cy="17.5" rx="11.5" ry="4.2" transform="rotate(-22 16 17.5)" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.4" />
      <path d="M16 6.5c0 0-5.6 6.6-5.6 10.8a5.6 5.6 0 0 0 11.2 0C21.6 13.1 16 6.5 16 6.5Z" fill="#fff" />
      <circle cx="26.2" cy="13.3" r="1.9" fill="#BFDBFE" stroke="#fff" strokeWidth="0.8" />
    </svg>
  );
}
