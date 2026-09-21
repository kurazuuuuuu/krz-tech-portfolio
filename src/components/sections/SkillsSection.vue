<template>
  <section id="skills" class="skills">
    <div class="container">
      <SectionHeading number="02" en="SKILLS" ja="技術領域" />

      <ul class="skill-grid">
        <li v-for="group in skillGroups" :key="group.id" data-reveal="skills" class="skill-card">
          <div class="skill-head">
            <h3 class="skill-title">{{ group.title }}</h3>
            <span class="skill-level" :class="`is-${group.level.toLowerCase()}`">
              {{ group.level }}
            </span>
          </div>
          <p class="skill-description">{{ group.description }}</p>
          <ul class="tech-tags">
            <li v-for="tech in group.technologies" :key="tech.name" class="tech-tag">
              <component :is="tech.icon" :size="16" :stroke="2" aria-hidden="true" />
              {{ tech.name }}
            </li>
          </ul>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup>
import SectionHeading from "../SectionHeading.vue";
import { skillGroups } from "../../data/skills.js";
</script>

<style scoped>
.skills {
  position: relative;
  overflow: hidden;
  overflow: clip;
  background: rgb(var(--color-surface-rgb) / 0.94);
  /* 前のセクションと --deco-angle の平行な切れ目をあけ、そこから 3D 背景が覗く */
  margin-top: calc(28px - var(--section-cut));
  padding: calc(var(--section-cut) + 3rem) 0 calc(var(--section-cut) + 3rem);
  clip-path: polygon(0 var(--section-cut), 100% 0, 100% calc(100% - var(--section-cut)), 0 100%);
}

.container {
  width: min(1100px, 100%);
  margin: 0 auto;
  padding: 0 2rem;
}

.skill-grid {
  display: grid;
  /* auto-fit だと 3 列 + 1 枚余りになり、タグの多い INFRA に合わせて他が伸びる */
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.5rem;
  list-style: none;
}

.skill-card {
  background: var(--color-surface);
  border: 2px solid var(--color-ink);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
  padding: 1.6rem;
  /* GSAP は transform を使うので、hover は translate プロパティ側で当てて衝突を避ける */
  transition:
    box-shadow 0.18s ease,
    translate 0.18s ease;
}

.skill-card:hover {
  translate: 3px 3px;
  box-shadow: var(--card-shadow-hover);
}

.skill-head {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.6rem;
}

.skill-title {
  font-family: var(--font-display);
  font-variation-settings:
    "ROND" 100,
    "wght" 800;
  font-size: 1.5rem;
  line-height: 1.1;
  letter-spacing: 0.04em;
  color: var(--color-ink);
}

.skill-level {
  font-family: var(--font-display);
  font-variation-settings:
    "ROND" 100,
    "wght" 700;
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  border: 2px solid var(--color-ink);
}

.skill-level.is-main {
  background: var(--color-primary);
  color: var(--color-ink);
}

.skill-level.is-sub {
  background: var(--color-surface-mint);
  color: var(--color-ink-sub);
}

.skill-description {
  font-size: 0.9rem;
  color: var(--color-ink-sub);
  margin-bottom: 1.1rem;
}

.tech-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  list-style: none;
}

.tech-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  background: var(--color-surface-mint);
  color: var(--color-ink);
  border: 1px solid rgb(var(--color-ink-rgb) / 0.15);
}

@media (max-width: 768px) {
  .container {
    padding: 0 1.25rem;
  }

  .skill-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 1.25rem;
  }

  .skill-card {
    padding: 1.35rem;
  }
}
</style>
