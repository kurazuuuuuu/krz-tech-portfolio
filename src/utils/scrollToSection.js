export function scrollToSection(elementId) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const top = element.getBoundingClientRect().top + window.scrollY;

  window.scrollTo({ top, behavior: "smooth" });
}
