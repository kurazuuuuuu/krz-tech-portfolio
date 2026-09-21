<template>
  <section id="works" class="works">
    <div class="container">
      <SectionHeading number="03" en="WORKS" ja="制作物" />

      <div v-if="projects.length === 0" data-reveal class="no-works">
        <h3>Coming Soon(´・ω・｀)</h3>
        <p>返事がない...</p>
      </div>

      <ul v-else class="work-grid">
        <li v-for="project in projects" :key="project.id" data-reveal="works" class="work-card">
          <img
            :src="`/img/projects/${project.id}.webp`"
            :alt="`${project.name} のサムネイル`"
            width="100"
            height="100"
            loading="lazy"
            decoding="async"
            class="work-image"
          />
          <h3 class="work-name">{{ project.name }}</h3>
          <p class="work-description">{{ project.description }}</p>
          <ul class="tech-tags">
            <li v-for="tech in project.technologies" :key="tech.name" class="tech-tag">
              <component :is="tech.icon" :size="16" :stroke="2" aria-hidden="true" />
              {{ tech.name }}
            </li>
          </ul>
          <div class="work-links">
            <a
              v-if="project.deploy_url"
              :href="project.deploy_url"
              class="work-link"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="`${project.name} のサイトを開く`"
            >
              <IconHome :size="20" :stroke="2" />
            </a>
            <a
              v-if="project.github_url"
              :href="project.github_url"
              class="work-link"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="`${project.name} の GitHub リポジトリを開く`"
            >
              <IconBrandGithub :size="20" :stroke="2" />
            </a>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup>
import { IconBrandGithub, IconHome } from "@tabler/icons-vue";
import SectionHeading from "../SectionHeading.vue";

defineProps({
  projects: { type: Array, required: true },
});
</script>

<style scoped>
.works {
  position: relative;
  overflow: hidden;
  overflow: clip;
  background: rgb(var(--color-mint-rgb) / 0.92);
  margin-top: calc(28px - var(--section-cut));
  padding: calc(var(--section-cut) + 3rem) 0 calc(var(--section-cut) + 3rem);
  clip-path: polygon(0 var(--section-cut), 100% 0, 100% calc(100% - var(--section-cut)), 0 100%);
}

.container {
  width: min(1100px, 100%);
  margin: 0 auto;
  padding: 0 2rem;
}

.work-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.75rem;
  list-style: none;
}

.work-card {
  background: var(--color-surface);
  border: 2px solid var(--color-ink);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
  padding: 1.75rem;
  /* GSAP は transform を使うので、hover は translate プロパティ側で当てて衝突を避ける */
  transition:
    box-shadow 0.18s ease,
    translate 0.18s ease;
}

.work-card:hover {
  translate: 3px 3px;
  box-shadow: var(--card-shadow-hover);
}

.work-image {
  width: 100px;
  height: 100px;
  border-radius: 24%;
  border: 2px solid var(--color-ink);
  margin-bottom: 1.25rem;
}

.work-name {
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1.3;
  color: var(--color-ink);
  margin-bottom: 0.75rem;
}

.work-description {
  white-space: pre-wrap;
  font-size: 0.92rem;
  color: var(--color-ink-sub);
  margin-bottom: 1.25rem;
}

.tech-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  list-style: none;
  margin-bottom: 1.25rem;
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

.work-links {
  display: flex;
  gap: 0.6rem;
}

.work-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid var(--color-ink);
  background: var(--color-surface);
  color: var(--color-ink);
  transition:
    background 0.18s ease,
    color 0.18s ease;
}

.work-link:hover {
  background: var(--color-primary);
}

.no-works {
  text-align: center;
  padding: 3.5rem 2rem;
  max-width: 520px;
  margin: 0 auto;
  background: var(--color-surface);
  border: 2px solid var(--color-ink);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
}

.no-works h3 {
  font-size: 1.6rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
  color: var(--color-ink);
}

.no-works p {
  color: var(--color-ink-sub);
}

@media (max-width: 768px) {
  .container {
    padding: 0 1.25rem;
  }

  .work-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 1.25rem;
  }
}
</style>
