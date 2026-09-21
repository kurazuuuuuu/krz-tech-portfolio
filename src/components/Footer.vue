<template>
  <footer class="footer">
    <div class="container">
      <p class="copyright">&copy; {{ year }} くらず / Kurazu. Built with Vue.js</p>

      <div class="footer-actions">
        <a
          href="https://github.com/kurazuuuuuu/"
          class="footer-icon"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub"
        >
          <IconBrandGithub :size="20" :stroke="2" />
        </a>

        <button type="button" class="to-top" @click="scrollToSection('hero')">
          <IconCrown :size="18" :stroke="2.2" aria-hidden="true" />
          TOP
        </button>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { IconBrandGithub, IconCrown } from "@tabler/icons-vue";
import { scrollToSection } from "../utils/scrollToSection.js";

const year = new Date().getFullYear();
</script>

<style scoped>
.footer {
  position: relative;
  overflow: hidden;
  overflow: clip;
  background: var(--color-primary);
  color: var(--color-ink);
  margin-top: calc(28px - var(--section-cut));
  padding: calc(var(--section-cut) + 2rem) 0 2rem;
  clip-path: polygon(0 var(--section-cut), 100% 0, 100% 100%, 0 100%);
}

/* ビビッドグリーンの面の上では、既定の深い緑の focus リングが 2.07:1 しかない */
.footer :focus-visible {
  outline-color: var(--color-ink);
}

.container {
  width: min(1100px, 100%);
  margin: 0 auto;
  padding: 0 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.copyright {
  font-size: 0.85rem;
  font-weight: 600;
}

.footer-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.footer-icon,
.to-top {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-height: 44px;
  color: var(--color-ink);
  background: var(--color-surface);
  border: 2px solid var(--color-ink);
  border-radius: 999px;
  text-decoration: none;
  cursor: pointer;
  transition:
    background 0.18s ease,
    translate 0.18s ease;
}

.footer-icon {
  width: 44px;
}

.to-top {
  font-family: var(--font-display);
  font-variation-settings:
    "ROND" 100,
    "wght" 800;
  font-size: 0.85rem;
  letter-spacing: 0.12em;
  padding: 0 1.1rem;
}

.footer-icon:hover,
.to-top:hover {
  background: var(--color-neon);
  translate: 0 -2px;
}

@media (max-width: 768px) {
  .container {
    flex-direction: column;
    text-align: center;
    padding: 0 1.25rem;
  }
}
</style>
