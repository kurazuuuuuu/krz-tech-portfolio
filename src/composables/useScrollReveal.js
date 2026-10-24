import { onMounted, onUnmounted, unref, watch } from "vue";

const ROOT_MARGIN = "100000px 0px -10% 0px";

export function useScrollReveal(scope, { enabled = true } = {}) {
  let observer = null;

  const isEnabled = () => (typeof enabled === "function" ? enabled() : unref(enabled)) !== false;

  const onIntersect = (entries) => {
    const groups = new Map();
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      observer.unobserve(el);
      const key = el.dataset.reveal || el;
      const group = groups.get(key);
      if (group) {
        group.push(el);
      } else {
        groups.set(key, [el]);
      }
    });

    groups.forEach((group) => {
      group.forEach((el, index) => {
        el.style.setProperty("--reveal-index", index);
        el.classList.add("is-revealed");
      });
    });
  };

  const start = () => {
    const target = unref(scope);
    const scopeEl = target?.$el ?? target;
    if (observer || !scopeEl || !isEnabled()) return;

    observer = new IntersectionObserver(onIntersect, { rootMargin: ROOT_MARGIN });
    scopeEl.querySelectorAll("[data-reveal]").forEach((el) => observer.observe(el));
  };

  onMounted(start);

  watch(isEnabled, (on) => {
    if (on) start();
  });

  onUnmounted(() => {
    observer?.disconnect();
    observer = null;
  });
}
