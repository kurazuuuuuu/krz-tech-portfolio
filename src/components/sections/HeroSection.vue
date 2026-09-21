<template>
  <section id="hero" ref="root" class="hero">
    <div class="hero-deco" aria-hidden="true">
      <div ref="bandWrap" class="hero-band-wrap">
        <div class="hero-band"><i ref="bandFill" class="hero-band-fill"></i></div>
      </div>
      <div class="hero-dots"></div>
    </div>

    <div class="hero-inner">
      <div class="hero-copy">
        <h1 ref="titleEl" class="hero-title">{{ profile.nameLatin }}</h1>
        <p data-hero class="hero-name-ja">{{ profile.nameJa }}</p>
        <p data-hero class="hero-role">{{ profile.role }}</p>
        <ul data-hero class="hero-socials">
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

      <div ref="visual" class="hero-visual">
        <img
          ref="sticker"
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

    <button type="button" data-hero class="scroll-cue" @click="scrollToSection('profile')">
      <span class="scroll-cue-label">SCROLL</span>
      <span class="scroll-cue-line" aria-hidden="true"><i ref="scrollLine"></i></span>
    </button>
  </section>
</template>

<script setup>
import { onMounted, ref, watch } from "vue";
import { gsap, SplitText, useGsap } from "../../composables/useGsap.js";
import { scrollToSection } from "../../utils/scrollToSection.js";
import { profile } from "../../data/profile.js";
import { socialLinks } from "../../data/socialLinks.js";

const props = defineProps({
  // イントロ (IntroAnimation) が閉じ始めたか。登場タイムラインはこれを合図に走る
  introDone: { type: Boolean, default: false },
});

const root = ref(null);
const bandWrap = ref(null);
const bandFill = ref(null);
const titleEl = ref(null);
const visual = ref(null);
const sticker = ref(null);
const scrollLine = ref(null);

const { add } = useGsap(root);

// SplitText は Web フォント読み込み後に分割しないと文字幅がずれる。
// ただしフォント配信がハングしても先へ進めるよう 1.5 秒で打ち切る
const FONT_TIMEOUT_MS = 1500;

const waitForDisplayFont = () => {
  const loading = document.fonts?.load?.("900 1em Doto") ?? Promise.resolve();
  return Promise.race([
    Promise.resolve(loading).catch(() => {}),
    new Promise((resolve) => setTimeout(resolve, FONT_TIMEOUT_MS)),
  ]);
};

const fontsReady = ref(false);
let startHero = null;
// タイムラインが途中で落ちても要素が隠れたままにならないようにするフェイルセーフ
let showFinalState = null;
let started = false;

const tryStart = () => {
  if (started || !startHero || !props.introDone || !fontsReady.value) return;
  started = true;
  try {
    startHero();
  } catch (error) {
    console.warn("Hero timeline failed, falling back to final state:", error);
    showFinalState?.();
  }
};

onMounted(async () => {
  await waitForDisplayFont();
  fontsReady.value = true;
  tryStart();
});

watch(() => props.introDone, tryStart);

add(({ reduceMotion, contextSafe }) => {
  // reduced-motion では何も隠さない。要素は最初から最終状態のまま
  if (reduceMotion) return undefined;

  const items = gsap.utils.toArray("[data-hero]", root.value);
  const hidden = [titleEl.value, bandFill.value, sticker.value, ...items];

  gsap.set(items, { autoAlpha: 0, y: 24 });
  gsap.set(titleEl.value, { autoAlpha: 0 });
  gsap.set(bandFill.value, { scaleX: 0 });
  gsap.set(sticker.value, { autoAlpha: 0, yPercent: 26 });

  let split = null;

  showFinalState = contextSafe(() => {
    split?.revert();
    split = null;
    gsap.set(hidden, { autoAlpha: 1, clearProps: "transform,opacity,visibility" });
  });

  // 常時アニメ: 立ち絵のゆるい浮遊と SCROLL の縦線
  const startAmbient = contextSafe(() => {
    gsap.to(sticker.value, {
      y: -14,
      duration: 3.4,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
    });
    gsap.fromTo(
      scrollLine.value,
      { scaleY: 0, transformOrigin: "50% 0%" },
      { scaleY: 1, duration: 1.1, ease: "power2.inOut", repeat: -1, repeatDelay: 0.3 },
    );
  });

  startHero = contextSafe(() => {
    // smartWrap: chars だけの分割で単語が途中改行するのを防ぐ
    split = SplitText.create(titleEl.value, { type: "chars", aria: "auto", smartWrap: true });

    gsap
      .timeline()
      // 斜め帯がワイプイン
      .to(bandFill.value, { scaleX: 1, duration: 0.75, ease: "power3.inOut" })
      // 立ち絵が下から飛び込んで着地
      .to(
        sticker.value,
        { autoAlpha: 1, yPercent: 0, duration: 0.85, ease: "back.out(1.5)" },
        "-=0.4",
      )
      // 着地の squash & stretch
      .to(sticker.value, {
        scaleX: 1.05,
        scaleY: 0.93,
        duration: 0.11,
        ease: "power2.out",
        transformOrigin: "50% 100%",
        yoyo: true,
        repeat: 1,
      })
      .set(titleEl.value, { autoAlpha: 1 }, "<")
      // KURAZU を 1 文字ずつ
      .from(
        split.chars,
        {
          yPercent: 115,
          rotate: -10,
          autoAlpha: 0,
          duration: 0.6,
          ease: "back.out(2)",
          stagger: 0.045,
        },
        "<",
      )
      // 日本語名・肩書き・SNS・SCROLL
      .to(items, { autoAlpha: 1, y: 0, duration: 0.5, ease: "power2.out", stagger: 0.09 }, "-=0.25")
      .add(startAmbient);
  });

  tryStart();

  return () => {
    split?.revert();
    split = null;
    startHero = null;
    showFinalState = null;
    started = false;
  };
});

/*
 * マウス追従の視差だけは別の matchMedia に分ける。
 * 登場タイムラインと同じ条件セットに載せると、ホバー可否が変わったとき
 * (iPad にトラックパッド接続、DevTools のデバイス切替) に builder ごと revert され、
 * 表示済みのヒーローが消えて登場演出からやり直しになってしまう。
 */
const { add: addParallax } = useGsap(root, {
  conditions: { canHover: "(hover: hover) and (pointer: fine)" },
});

addParallax(({ reduceMotion, conditions }) => {
  if (reduceMotion || !conditions.canHover) return undefined;

  const visualX = gsap.quickTo(visual.value, "x", { duration: 0.6, ease: "power3" });
  const visualY = gsap.quickTo(visual.value, "y", { duration: 0.6, ease: "power3" });
  const bandX = gsap.quickTo(bandWrap.value, "x", { duration: 0.9, ease: "power3" });
  const bandY = gsap.quickTo(bandWrap.value, "y", { duration: 0.9, ease: "power3" });

  const onPointerMove = (event) => {
    const nx = event.clientX / window.innerWidth - 0.5;
    const ny = event.clientY / window.innerHeight - 0.5;
    // 3D 背景のパララックスと逆位相にして奥行きを出す
    visualX(nx * -18);
    visualY(ny * -12);
    bandX(nx * 10);
    bandY(ny * 7);
  };

  window.addEventListener("pointermove", onPointerMove, { passive: true });

  return () => window.removeEventListener("pointermove", onPointerMove);
});
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
  will-change: transform;
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
  inset: -6% -8% -6% -10%;
  z-index: -1;
  pointer-events: none;
  background: radial-gradient(
    ellipse at 40% 50%,
    rgb(var(--color-surface-rgb) / 0.85) 0%,
    rgb(var(--color-surface-rgb) / 0.55) 55%,
    rgb(var(--color-surface-rgb) / 0) 78%
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
  /* SplitText の chars が裸の inline-block になっても途中改行させない */
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
  /* GSAP は transform を使うので、hover は translate プロパティ側で当てて衝突を避ける */
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
  will-change: transform;
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
  padding: 0.5rem 1rem;
  background: none;
  border: 0;
  cursor: pointer;
  color: var(--color-ink);
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
    inset: -8% -10%;
  }

  .hero-band {
    top: 58%;
  }
}
</style>
