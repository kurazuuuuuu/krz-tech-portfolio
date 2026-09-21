<template>
  <section id="profile" ref="root" class="profile">
    <div class="container">
      <SectionHeading number="01" en="PROFILE" ja="プロフィール" />

      <div class="profile-body">
        <div ref="figure" class="profile-figure">
          <img
            src="/img/krz-top-sticker-1.png"
            width="428"
            height="1159"
            alt="くらずの立ち絵"
            loading="lazy"
            decoding="async"
            class="profile-sticker"
          />
        </div>

        <div class="profile-main">
          <dl ref="specList" class="spec">
            <div v-for="spec in specs" :key="spec.label" data-spec-row class="spec-row">
              <dt>{{ spec.label }}</dt>
              <dd>{{ spec.value }}</dd>
            </div>
            <div data-spec-row class="spec-row">
              <dt>LINKS</dt>
              <dd>
                <ul class="spec-links">
                  <li v-for="link in socialLinks" :key="link.name">
                    <a :href="link.url" class="spec-link" target="_blank" rel="noopener noreferrer">
                      <component :is="link.icon" :size="18" :stroke="2" />
                      {{ link.name }}
                    </a>
                  </li>
                </ul>
              </dd>
            </div>
          </dl>

          <div data-reveal class="profile-intro">
            <p v-for="line in introductionLines" :key="line">{{ line }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from "vue";
import SectionHeading from "../SectionHeading.vue";
import { gsap, useGsap } from "../../composables/useGsap.js";
import { introductionLines, specs } from "../../data/profile.js";
import { socialLinks } from "../../data/socialLinks.js";

const root = ref(null);
const figure = ref(null);
const specList = ref(null);

const { add } = useGsap(root);

add(({ reduceMotion }) => {
  // reduced-motion では何も隠さない。要素は最初から最終状態のまま
  if (reduceMotion) return undefined;

  const clearProps = "transform,opacity,visibility";

  // 立ち絵は横からスライドイン
  gsap.set(figure.value, { autoAlpha: 0, x: -60 });
  gsap.to(figure.value, {
    autoAlpha: 1,
    x: 0,
    duration: 0.8,
    ease: "power3.out",
    clearProps,
    scrollTrigger: { trigger: figure.value, start: "clamp(top 85%)", once: true },
  });

  // スペック表は上から順に
  const rows = gsap.utils.toArray("[data-spec-row]", root.value);
  gsap.set(rows, { autoAlpha: 0, y: 18 });
  gsap.to(rows, {
    autoAlpha: 1,
    y: 0,
    duration: 0.5,
    ease: "power2.out",
    stagger: 0.07,
    clearProps,
    scrollTrigger: { trigger: specList.value, start: "clamp(top 85%)", once: true },
  });

  return undefined;
});
</script>

<style scoped>
.profile {
  position: relative;
  overflow: hidden;
  overflow: clip;
  background: rgb(var(--color-mint-rgb) / 0.92);
  padding: calc(var(--section-cut) + 3rem) 0 calc(var(--section-cut) + 3rem);
  clip-path: polygon(0 var(--section-cut), 100% 0, 100% calc(100% - var(--section-cut)), 0 100%);
}

.container {
  width: min(1100px, 100%);
  margin: 0 auto;
  padding: 0 2rem;
}

.profile-body {
  display: grid;
  grid-template-columns: minmax(0, 320px) minmax(0, 1fr);
  gap: 2.5rem;
  align-items: start;
}

.profile-figure {
  display: flex;
  justify-content: center;
  will-change: transform;
}

.profile-sticker {
  /* width/height 属性由来の aspect-ratio に任せる。
     max-* だけで抑えることで、カラムが狭いときも横に潰れない。
     元画像が 428x1159 と解像度が低いので拡大しすぎない */
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: min(560px, 60vh);
  max-height: min(560px, 60svh);
  filter: drop-shadow(8px 8px 0 rgb(var(--color-primary-rgb) / 0.55))
    drop-shadow(0 12px 20px rgb(var(--color-ink-rgb) / 0.18));
}

/* スペック表 */
.spec {
  background: var(--color-surface);
  border: 2px solid var(--color-ink);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
  padding: 0.5rem 1.5rem;
}

.spec-row {
  display: grid;
  grid-template-columns: 140px minmax(0, 1fr);
  gap: 1rem;
  padding: 0.85rem 0;
  border-bottom: 1px dashed rgb(var(--color-ink-rgb) / 0.18);
}

.spec-row:last-child {
  border-bottom: 0;
}

.spec-row dt {
  font-family: var(--font-display);
  font-variation-settings:
    "ROND" 100,
    "wght" 800;
  font-size: 0.95rem;
  letter-spacing: 0.08em;
  color: var(--color-primary-text);
  padding-top: 0.1rem;
}

.spec-row dd {
  font-size: 0.95rem;
  color: var(--color-ink);
}

.spec-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  list-style: none;
}

.spec-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-weight: 600;
  text-decoration: none;
  color: var(--color-primary-text);
  border-bottom: 2px solid transparent;
  transition: border-color 0.18s ease;
}

.spec-link:hover {
  border-bottom-color: var(--color-primary);
}

.profile-intro {
  margin-top: 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  font-size: 1rem;
  color: var(--color-ink-sub);
}

@media (max-width: 768px) {
  .container {
    padding: 0 1.25rem;
  }

  .profile-body {
    grid-template-columns: minmax(0, 1fr);
    gap: 1.75rem;
  }

  .profile-sticker {
    max-height: min(420px, 48vh);
    max-height: min(420px, 48svh);
  }

  .spec {
    padding: 0.25rem 1.1rem;
  }

  .spec-row {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.2rem;
  }
}
</style>
