export function scrollToSection(elementId) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const header = document.querySelector("header");
  const offset = header?.offsetHeight ?? 44;
  const top = element.getBoundingClientRect().top + window.scrollY - offset;

  window.scrollTo({ top, behavior: "smooth" });
}
