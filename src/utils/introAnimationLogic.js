export function isIntroProgressDone({ ready, minElapsed, displayProgress, prefersReducedMotion }) {
  if (prefersReducedMotion) return ready;
  return minElapsed && ready && displayProgress > 99.5;
}

export function isIntroStalled({ displayProgress, lastProgressAt, stallTimeout, now }) {
  return displayProgress < 99 && now - lastProgressAt > stallTimeout;
}
