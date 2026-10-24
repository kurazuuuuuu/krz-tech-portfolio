<template>
  <header class="section-heading" data-reveal>
    <span class="heading-num" aria-hidden="true">{{ number }}</span>
    <div class="heading-titles">
      <h2 class="heading-en">{{ en }}</h2>
      <p class="heading-ja">{{ ja }}</p>
    </div>
    <IconCrown class="heading-crown" :size="30" :stroke="2.2" aria-hidden="true" />
  </header>
</template>

<script setup>
import { IconCrown } from "@tabler/icons-vue";

defineProps({
  // セクション番号 (01〜04)
  number: { type: String, required: true },
  // Doto で見せる英見出し
  en: { type: String, required: true },
  // 下に添える日本語の小見出し
  ja: { type: String, required: true },
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

/*
 * Doto の可変軸を細→太・角→丸へ動かす。
 * font-variation-settings は直接補間できないので、型付きで登録した CSS 変数を
 * アニメーションさせて font-variation-settings 側で受ける。
 * 既定値は最終状態なので、reduced-motion でも太字で出る
 */
@property --heading-wght {
  syntax: "<number>";
  inherits: false;
  initial-value: 900;
}

@property --heading-rond {
  syntax: "<number>";
  inherits: false;
  initial-value: 100;
}

@media (prefers-reduced-motion: no-preference) {
  .section-heading.is-revealed .heading-en {
    animation: heading-axes 1.1s cubic-bezier(0.33, 1, 0.68, 1) backwards;
  }
}

@keyframes heading-axes {
  from {
    --heading-wght: 200;
    --heading-rond: 0;
  }
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
