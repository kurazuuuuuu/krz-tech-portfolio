export function resolveBackgroundQuality() {
  if (typeof window === "undefined") return "medium";

  const prefersReducedData = window.matchMedia("(prefers-reduced-data: reduce)").matches;
  const isMobile = window.matchMedia("(max-width: 768px)").matches;

  if (prefersReducedData) return "low";
  if (isMobile) return "medium";
  return "high";
}
