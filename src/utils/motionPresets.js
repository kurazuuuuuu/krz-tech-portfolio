function prefersReducedMotion() {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export const heroInitial = prefersReducedMotion() ? { opacity: 0 } : { opacity: 0, y: 36 };

export function heroEnterMotion(delay = 0) {
  if (prefersReducedMotion()) {
    return { opacity: 1, transition: { duration: 0 } };
  }

  return {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 340,
      damping: 28,
      delay,
    },
  };
}

export function scrollRevealMotion(delay = 0) {
  if (prefersReducedMotion()) {
    return {
      initial: { opacity: 0 },
      visibleOnce: { opacity: 1, transition: { duration: 0 } },
    };
  }

  return {
    initial: { opacity: 0, y: 40 },
    visibleOnce: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 260,
        damping: 26,
        delay,
      },
    },
  };
}
