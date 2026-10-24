<template>
  <section id="hero" ref="root" class="hero" :class="{ 'is-started': introDone }">
    <div class="hero-deco" aria-hidden="true">
      <div class="hero-band-wrap">
        <div class="hero-band"><i class="hero-band-fill"></i></div>
      </div>
      <div class="hero-dots"></div>
    </div>

    <div class="hero-inner">
      <div class="hero-copy">
        <h1 class="hero-title" :aria-label="profile.nameLatin">
          <span
            v-for="(char, i) in profile.nameLatin"
            :key="i"
            class="hero-char"
            aria-hidden="true"
            >{{ char }}</span
          >
        </h1>
        <p data-hero class="hero-name-ja" style="--hero-i: 0">{{ profile.nameJa }}</p>
        <p data-hero class="hero-role" style="--hero-i: 1">{{ profile.role }}</p>
        <ul data-hero class="hero-socials" style="--hero-i: 2">
          <li v-for="link in socialLinks" :key="link.name">
            <a
              :href="link.url"
              class="hero-social"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="link.name"
            >
              <component :is="link.icon" :size="24" :stroke="2" />
            </a>
          </li>
        </ul>
      </div>

      <div class="hero-visual">
        <img
          src="/img/krz-top-sticker-2.png"
          width="955"
          height="1256"
          alt="くらずの立ち絵"
          loading="eager"
          fetchpriority="high"
          decoding="async"
          class="hero-sticker"
        />
      </div>
    </div>

    <a href="#profile" data-hero class="scroll-cue" style="--hero-i: 3">
      <span class="scroll-cue-label">SCROLL</span>
      <span class="scroll-cue-line" aria-hidden="true"><i></i></span>
    </a>
  </section>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import { profile } from "../../data/profile.js";
import { socialLinks } from "../../data/socialLinks.js";

defineProps({
  // イントロ (IntroAnimation) が閉じ始めたか。.is-started を付けて CSS の登場演出を走らせる
  introDone: { type: Boolean, default: false },
});

const root = ref(null);

/*
 * マウス追従の視差。ポインタ座標を -0.5〜0.5 に正規化して CSS 変数へ渡すだけで、
 * 追従の滑らかさ・ホバー可否・reduced-motion の判定は CSS 側が持つ
 */
const onPointerMove = (event) => {
  const el = root.value;
  if (!el) return;
  el.style.setProperty("--px", (event.clientX / window.innerWidth - 0.5).toFixed(3));
  el.style.setProperty("--py", (event.clientY / window.innerHeight - 0.5).toFixed(3));
};

onMounted(() => window.addEventListener("pointermove", onPointerMove, { passive: true }));
onBeforeUnmount(() => window.removeEventListener("pointermove", onPointerMove));
</script>

<style scoped>
.hero {
  position: relative;
  min-height: 100vh;
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  /* 斜め帯・巨大タイポ・立ち絵のはみ出しで横スクロールを出さない */
  overflow: hidden;
  overflow: clip;
  padding: 5.5rem 0 3rem;
}

/* 緑の帯がインタラクティブ要素の背後に来るので、focus リングは墨色にする */
.hero :focus-visible {
  outline-color: var(--color-ink);
}

/* 装飾 */
.hero-deco {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.hero-band-wrap {
  position: absolute;
  inset: 0;
  will-change: translate;
}

.hero-band {
  position: absolute;
  top: 52%;
  left: -25%;
  width: 150%;
  height: clamp(110px, 18vh, 230px);
  transform: rotate(var(--deco-angle));
}

.hero-band-fill {
  display: block;
  width: 100%;
  height: 100%;
  background: var(--color-primary);
  transform-origin: 0% 50%;
}

.hero-dots {
  position: absolute;
  right: -6%;
  bottom: -4%;
  width: 62%;
  height: 46%;
  background-image: radial-gradient(rgb(var(--color-primary-rgb) / 0.38) 2px, transparent 2.2px);
  background-size: 15px 15px;
}

/* 本体 */
.hero-inner {
  position: relative;
  z-index: 1;
  width: min(1200px, 100%);
  margin: 0 auto;
  padding: 0 2rem;
  display: grid;
  /* 「KURAZU」(Doto 等幅 6 文字 = 3.66em) が 769〜1920px の全幅で収まる比率 */
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
  align-items: center;
  gap: 2rem;
}

.hero-copy {
  position: relative;
  z-index: 1;
}

/*
 * テキスト背面のごく薄い白ベール (backdrop-filter は使わない)。
 * 斜め帯のワイプインを塗り潰さないよう、テキストの周囲だけに小さくかける。
 * 墨色の文字は緑の帯 (#4fcf72) の上でも 8:1 あるので可読性は保たれる。
 */
.hero-copy::before {
  content: "";
  position: absolute;
  inset: -22% -20%;
  z-index: -1;
  pointer-events: none;
  /*
   * closest-side で楕円を箱に内接させ、辺に届く前に必ず透明にする。
   * 既定の farthest-corner だと辺の位置でアルファが残り、箱の形に四角く切れて見える。
   */
  background: radial-gradient(
    ellipse closest-side at 50% 50%,
    rgb(var(--color-surface-rgb) / 0.85) 0%,
    rgb(var(--color-surface-rgb) / 0.55) 50%,
    rgb(var(--color-surface-rgb) / 0) 100%
  );
}

.hero-title {
  font-family: var(--font-display);
  font-variation-settings:
    "ROND" 100,
    "wght" 900;
  font-size: clamp(3.2rem, 12vw, 9.5rem);
  line-height: 0.88;
  letter-spacing: 0.01em;
  /* 1 文字ずつの inline-block でも途中改行させない */
  white-space: nowrap;
  color: var(--color-ink);
  margin-bottom: 0.6rem;
}

.hero-name-ja {
  font-size: clamp(1.25rem, 3.2vw, 1.9rem);
  font-weight: 700;
  line-height: 1.3;
  color: var(--color-ink);
}

.hero-role {
  font-family: var(--font-latin);
  font-size: clamp(0.9rem, 2vw, 1.1rem);
  font-weight: 600;
  letter-spacing: 0.04em;
  /* 緑の帯の上に載る可能性があるので墨色 */
  color: var(--color-ink);
  margin-top: 0.35rem;
}

.hero-socials {
  display: flex;
  gap: 0.75rem;
  list-style: none;
  margin-top: 1.5rem;
}

.hero-social {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid var(--color-ink);
  background: var(--color-surface);
  color: var(--color-ink);
  box-shadow: 3px 3px 0 var(--color-primary);
  /* 登場演出は親の ul 側で動くので、hover は自分の translate で当てる */
  transition:
    box-shadow 0.18s ease,
    translate 0.18s ease,
    background 0.18s ease;
}

.hero-social:hover {
  background: var(--color-primary);
  translate: 2px 2px;
  box-shadow: 1px 1px 0 var(--color-primary-deep);
}

/* 立ち絵 */
.hero-visual {
  position: relative;
  /* justify-self: end だと shrink-to-fit になり、img の max-width: 100% が
     カラム幅ではなく自分自身を参照してしまう。幅いっぱいの箱で右寄せする */
  display: flex;
  justify-content: flex-end;
  width: 100%;
  min-width: 0;
  will-change: translate;
}

.hero-sticker {
  /* width/height 属性由来の aspect-ratio に任せる。
     max-* だけで抑えることで、カラムが狭いときも横に潰れない */
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: min(76vh, 620px);
  max-height: min(76svh, 620px);
  /* 明るい背景で白フチが埋もれないよう、緑のオフセット影 + 薄い墨色の影 */
  filter: drop-shadow(8px 8px 0 rgb(var(--color-primary-rgb) / 0.55))
    drop-shadow(0 12px 20px rgb(var(--color-ink-rgb) / 0.18));
}

/* SCROLL */
.scroll-cue {
  position: relative;
  z-index: 2;
  margin: 2.5rem auto 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.55rem;
  width: fit-content;
  padding: 0.5rem 1rem;
  color: var(--color-ink);
  text-decoration: none;
}

.scroll-cue-label {
  font-family: var(--font-display);
  font-variation-settings:
    "ROND" 100,
    "wght" 700;
  font-size: 0.85rem;
  letter-spacing: 0.3em;
}

.scroll-cue-line {
  display: block;
  width: 2px;
  height: 46px;
  overflow: hidden;
  background: var(--color-primary-light);
}

.scroll-cue-line i {
  display: block;
  width: 100%;
  height: 100%;
  background: var(--color-ink);
  transform-origin: 50% 0%;
}

.hero-char {
  display: inline-block;
}

.hero-sticker {
  /* 着地の squash & stretch は足元を支点にする */
  transform-origin: 50% 100%;
}

/*
 * 登場演出。.is-started (イントロ終了) で一斉に走らせ、順番は animation-delay で組む。
 *   0s      斜め帯がワイプイン
 *   0.35s   立ち絵が下から飛び込んで着地
 *   1.2s    着地の squash & stretch と同時に KURAZU を 1 文字ずつ
 *   1.775s  日本語名・肩書き・SNS・SCROLL
 *   2.55s〜 常時アニメ (立ち絵の浮遊・SCROLL の縦線)
 * fill は backwards だけにして、終了後に hover 用の translate などを上書きしない。
 * reduced-motion では何も隠さず、最初から最終状態のまま
 */
@media (prefers-reduced-motion: no-preference) {
  .hero:not(.is-started) :is(.hero-char, .hero-sticker, [data-hero]) {
    opacity: 0;
    visibility: hidden;
  }

  .hero:not(.is-started) .hero-band-fill {
    scale: 0 1;
  }

  .is-started .hero-band-fill {
    animation: hero-band-in 0.75s cubic-bezier(0.76, 0, 0.24, 1) backwards;
  }

  .is-started .hero-sticker {
    animation:
      hero-sticker-in 0.85s cubic-bezier(0.34, 1.5, 0.64, 1) 0.35s backwards,
      hero-sticker-squash 0.22s 1.2s,
      hero-sticker-float 3.4s cubic-bezier(0.37, 0, 0.63, 1) 2.55s infinite alternate;
  }

  .is-started .hero-char {
    animation: hero-char-in 0.6s cubic-bezier(0.34, 1.8, 0.64, 1) backwards;
    /* sibling-index() 非対応 (Firefox・Safari 26.1 以前) では全文字が同時に出る */
    animation-delay: 1.2s;
    animation-delay: calc(1.2s + (sibling-index() - 1) * 45ms);
  }

  .is-started [data-hero] {
    animation: hero-item-in 0.5s cubic-bezier(0.33, 1, 0.68, 1) backwards;
    animation-delay: calc(1.775s + var(--hero-i, 0) * 90ms);
  }

  .is-started .scroll-cue-line i {
    animation: hero-scroll-line 1.4s 2.55s infinite backwards;
  }
}

@keyframes hero-band-in {
  from {
    scale: 0 1;
  }
}

@keyframes hero-sticker-in {
  from {
    opacity: 0;
    translate: 0 26%;
  }
}

@keyframes hero-sticker-squash {
  50% {
    scale: 1.05 0.93;
    animation-timing-function: cubic-bezier(0.33, 1, 0.68, 1);
  }
}

@keyframes hero-sticker-float {
  to {
    transform: translateY(-14px);
  }
}

@keyframes hero-char-in {
  from {
    opacity: 0;
    translate: 0 115%;
    rotate: -10deg;
  }
}

@keyframes hero-item-in {
  from {
    opacity: 0;
    translate: 0 24px;
  }
}

/* 1.1s で伸びきって 0.3s 待つ (= 1.4s 周期) */
@keyframes hero-scroll-line {
  0% {
    scale: 1 0;
    animation-timing-function: cubic-bezier(0.65, 0, 0.35, 1);
  }
  78.57%,
  100% {
    scale: 1 1;
  }
}

/* マウス追従の視差。3D 背景のパララックスと逆位相にして奥行きを出す */
@media (prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine) {
  .hero-visual {
    translate: calc(var(--px, 0) * -18px) calc(var(--py, 0) * -12px);
    transition: translate 0.6s cubic-bezier(0.25, 1, 0.5, 1);
  }

  .hero-band-wrap {
    translate: calc(var(--px, 0) * 10px) calc(var(--py, 0) * 7px);
    transition: translate 0.9s cubic-bezier(0.25, 1, 0.5, 1);
  }
}

@media (max-width: 768px) {
  .hero {
    padding: 4.5rem 0 2rem;
  }

  .hero-inner {
    grid-template-columns: minmax(0, 1fr);
    justify-items: center;
    text-align: center;
    padding: 0 1.25rem;
    gap: 1rem;
  }

  .hero-visual {
    order: -1;
    justify-content: center;
  }

  .hero-sticker {
    max-height: 55vh;
    max-height: 55svh;
  }

  .hero-socials {
    justify-content: center;
  }

  .hero-copy::before {
    inset: -18% -14%;
  }

  .hero-band {
    top: 58%;
  }
}
</style>
