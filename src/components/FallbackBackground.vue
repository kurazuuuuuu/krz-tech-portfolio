<template>
  <div class="fallback-bg" aria-hidden="true">
    <div class="fallback-stripes">
      <i class="stripe stripe-1"></i>
      <i class="stripe stripe-2"></i>
      <i class="stripe stripe-3"></i>
      <i class="stripe stripe-4"></i>
    </div>
  </div>
</template>

<style scoped>
.fallback-bg {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  overflow: hidden;
  overflow: clip;
  background-color: var(--color-bg);
  background-image: radial-gradient(rgb(var(--color-primary-rgb) / 0.22) 2px, transparent 2.2px);
  background-size: 18px 18px;
}

.fallback-stripes {
  position: absolute;
  inset: -30%;
  transform: rotate(var(--deco-angle));
}

.stripe {
  display: block;
  position: absolute;
  left: 0;
  right: 0;
}

.stripe-1 {
  top: 22%;
  height: 14px;
  background: rgb(var(--color-primary-rgb) / 0.55);
}

.stripe-2 {
  top: 29%;
  height: 5px;
  background: var(--color-surface-mint);
}

.stripe-3 {
  top: 58%;
  height: 9px;
  background: rgb(var(--color-primary-rgb) / 0.35);
}

.stripe-4 {
  top: 63.5%;
  height: 3px;
  background: var(--color-neon);
  opacity: 0.55;
}
</style>
