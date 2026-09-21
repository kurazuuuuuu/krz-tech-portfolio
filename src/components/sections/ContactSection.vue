<template>
  <section id="contact" class="contact">
    <div class="container">
      <SectionHeading number="04" en="CONTACT" ja="お問い合わせ" />

      <div class="contact-body">
        <p data-reveal="contact" class="contact-text">
          どなたでも大歓迎です！技術的な話だけじゃなく色々見てみてください！
          Xが一番気が付くと思われます！
        </p>

        <a data-reveal="contact" href="mailto:contact@krz-tech.net" class="contact-email">
          <IconMail :size="24" :stroke="2" aria-hidden="true" />
          contact@krz-tech.net
        </a>

        <ul data-reveal="contact" class="contact-links">
          <li v-for="link in socialLinks" :key="link.name">
            <a :href="link.url" class="contact-link" target="_blank" rel="noopener noreferrer">
              <component :is="link.icon" :size="22" :stroke="2" aria-hidden="true" />
              {{ link.name }}
            </a>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup>
import { IconMail } from "@tabler/icons-vue";
import SectionHeading from "../SectionHeading.vue";
import { socialLinks } from "../../data/socialLinks.js";
</script>

<style scoped>
.contact {
  position: relative;
  overflow: hidden;
  overflow: clip;
  background: rgb(var(--color-surface-rgb) / 0.94);
  margin-top: calc(28px - var(--section-cut));
  padding: calc(var(--section-cut) + 3rem) 0 calc(var(--section-cut) + 4rem);
  clip-path: polygon(0 var(--section-cut), 100% 0, 100% calc(100% - var(--section-cut)), 0 100%);
}

.container {
  width: min(1100px, 100%);
  margin: 0 auto;
  padding: 0 2rem;
}

.contact-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1.75rem;
}

.contact-text {
  font-size: 1.05rem;
  color: var(--color-ink-sub);
  max-width: 620px;
}

.contact-email {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  font-size: clamp(1rem, 3vw, 1.3rem);
  font-weight: 700;
  text-decoration: none;
  color: var(--color-ink);
  padding: 1rem 1.75rem;
  background: var(--color-surface);
  border: 2px solid var(--color-ink);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
  /* GSAP は transform を使うので、hover は translate プロパティ側で当てて衝突を避ける */
  transition:
    box-shadow 0.18s ease,
    translate 0.18s ease,
    background 0.18s ease;
}

.contact-email:hover {
  translate: 3px 3px;
  background: var(--color-primary);
  box-shadow: var(--card-shadow-hover);
}

.contact-links {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1rem;
  list-style: none;
}

.contact-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-width: 170px;
  font-weight: 700;
  text-decoration: none;
  color: var(--color-ink);
  padding: 0.9rem 1.5rem;
  background: var(--color-surface);
  border: 2px solid var(--color-ink);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
  transition:
    box-shadow 0.18s ease,
    translate 0.18s ease,
    background 0.18s ease;
}

.contact-link:hover {
  translate: 3px 3px;
  background: var(--color-primary);
  box-shadow: var(--card-shadow-hover);
}

@media (max-width: 768px) {
  .container {
    padding: 0 1.25rem;
  }

  .contact-link {
    min-width: 0;
    width: 100%;
  }

  .contact-links {
    width: 100%;
    flex-direction: column;
  }
}
</style>
