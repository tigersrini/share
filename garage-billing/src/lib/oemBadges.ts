/**
 * Deterministic color badge for a make name — used in place of real OEM
 * logos, which we don't have licensed image assets for. Gives every make a
 * consistent, distinct, recognizable visual chip (initials on a colored
 * background) so mechanics can scan/pick a make quickly by eye.
 */
const PALETTE = [
  { bg: "#DC2626", fg: "#FFFFFF" }, // red
  { bg: "#EA580C", fg: "#FFFFFF" }, // orange
  { bg: "#CA8A04", fg: "#FFFFFF" }, // amber
  { bg: "#16A34A", fg: "#FFFFFF" }, // green
  { bg: "#0D9488", fg: "#FFFFFF" }, // teal
  { bg: "#2563EB", fg: "#FFFFFF" }, // blue
  { bg: "#4F46E5", fg: "#FFFFFF" }, // indigo
  { bg: "#9333EA", fg: "#FFFFFF" }, // purple
  { bg: "#DB2777", fg: "#FFFFFF" }, // pink
  { bg: "#334155", fg: "#FFFFFF" }, // slate
];

export function initialsFor(make: string): string {
  const words = make.trim().split(/[\s/]+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return make.trim().slice(0, 2).toUpperCase();
}

export function colorFor(make: string): { bg: string; fg: string } {
  let hash = 0;
  for (let i = 0; i < make.length; i++) hash = (hash * 31 + make.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}
