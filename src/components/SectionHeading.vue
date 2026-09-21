<template>
  <header ref="root" class="section-heading" data-reveal>
    <span class="heading-num" aria-hidden="true">{{ number }}</span>
    <div class="heading-titles">
      <h2 ref="enEl" class="heading-en">{{ en }}</h2>
      <p class="heading-ja">{{ ja }}</p>
    </div>
    <IconCrown class="heading-crown" :size="30" :stroke="2.2" aria-hidden="true" />
  </header>
</template>

<script setup>
import { ref } from "vue";
import { IconCrown } from "@tabler/icons-vue";
import { gsap, useGsap } from "../composables/useGsap.js";

defineProps({
  // セクション番号 (01〜04)
  number: { type: String, required: true },
  // Doto で見せる英見出し
  en: { type: String, required: true },
  // 下に添える日本語の小見出し
  ja: { type: String, required: true },
});

const root = ref(null);
const enEl = ref(null);

const { add } = useGsap(root);

/*
 * Doto の可変軸を細→太・角→丸へ動かす。
 * font-variation-settings を直接 tween すると補間が効かないので、
 * CSS 変数を tween して font-variation-settings 側で受ける。
 * CSS 側の既定値は最終状態なので、reduced-motion や JS 無効でも太字で出る。
 */
add(({ reduceMotion }) => {
  const el = enEl.value;
  if (reduceMotion || !el) return undefined;

  gsap.set(el, { "--heading-wght": 200, "--heading-rond": 0 });
  gsap.to(el, {
    "--heading-wght": 900,
    "--heading-rond": 100,
    duration: 1.1,
    ease: "power2.out",
    scrollTrigger: { trigger: root.value, start: "clamp(top 85%)", once: true },
  });

  return undefined;
});
</script>

<style scoped>
.section-heading {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2.5rem;
}

.heading-num {
  font-family: var(--font-display);
  font-variation-settings:
    "ROND" 100,
    "wght" 700;
  font-size: clamp(2.2rem, 6vw, 3.4rem);
  line-height: 1;
  color: var(--color-primary);
  letter-spacing: 0.02em;
}

.heading-titles {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.heading-en {
  --heading-wght: 900;
  --heading-rond: 100;

  font-family: var(--font-display);
  font-variation-settings:
    "ROND" var(--heading-rond),
    "wght" var(--heading-wght);
  font-size: clamp(1.9rem, 5.2vw, 3rem);
  line-height: 1.05;
  color: var(--color-ink);
  letter-spacing: 0.04em;
}

.heading-ja {
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.4;
  color: var(--color-primary-text);
}

.heading-crown {
  flex-shrink: 0;
  color: var(--color-primary);
  margin-bottom: auto;
}

@media (max-width: 768px) {
  .section-heading {
    gap: 0.75rem;
    margin-bottom: 1.75rem;
  }
}
</style>
