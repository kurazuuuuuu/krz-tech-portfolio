<template>
  <section id="topaz" class="topaz">
    <div class="container">
      <SectionHeading number="04" en="TOPA'Z" ja="Topa'z 掲載作品" />

      <ul class="topaz-grid">
        <li v-for="project in featured" :key="project.id" data-reveal="topaz" class="topaz-item">
          <a
            :href="project.url"
            class="topaz-card"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="`${project.title} を Topa'z で開く`"
          >
            <div class="topaz-media">
              <img
                :src="project.thumbnail"
                :alt="`${project.title} のサムネイル`"
                :width="project.thumbnailWidth"
                :height="project.thumbnailHeight"
                loading="lazy"
                decoding="async"
                class="topaz-thumb"
              />
              <!-- 行き先はリンクの aria-label で伝えているので、帯は装飾として読ませない -->
              <span class="topaz-band" aria-hidden="true">
                VIEW ON TOPA'Z
                <IconArrowUpRight :size="16" :stroke="2.4" />
              </span>
            </div>

            <div class="topaz-body">
              <h3 class="topaz-title">{{ project.title }}</h3>

              <p class="topaz-meta">
                <span class="topaz-date">{{ project.yearMonth }}</span>
                <span v-if="project.hackathon" class="topaz-hackathon">
                  <IconTrophy :size="14" :stroke="2" aria-hidden="true" />
                  {{ project.hackathon.name }}
                </span>
              </p>

              <ul class="tech-tags">
                <li v-for="tech in project.technologies" :key="tech.name" class="tech-tag">
                  <component :is="tech.icon" :size="16" :stroke="2" aria-hidden="true" />
                  {{ tech.name }}
                </li>
              </ul>
            </div>
          </a>
        </li>
      </ul>

      <div data-reveal class="topaz-more">
        <a
          :href="topaz.profileUrl"
          class="topaz-more-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          Topa'z で全部見る
          <IconExternalLink :size="20" :stroke="2" aria-hidden="true" />
        </a>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from "vue";
import { IconArrowUpRight, IconExternalLink, IconTrophy } from "@tabler/icons-vue";
import SectionHeading from "../SectionHeading.vue";
import topaz from "../../data/topaz.json";
import { featuredTopazIds } from "../../data/topazFeatured.js";
import { convertWithTechIcons } from "../../utils/techIcons.js";

/*
 * Topa'z の API は CORS ヘッダーを返さないのでブラウザからは叩けない。
 * `pnpm run sync:topaz` が作ったスナップショット (topaz.json) から、
 * featuredTopazIds の並び順で代表作だけを取り出す。
 */
const featured = computed(() => {
  const byId = new Map(topaz.projects.map((project) => [project.id, project]));

  return featuredTopazIds.flatMap((id) => {
    const project = byId.get(id);
    if (!project) {
      // スナップショットを更新したら消えていた ID。表示は黙って落とす
      if (import.meta.env.DEV) {
        console.warn(`[TopazSection] topaz.json に ID ${id} の作品がありません`);
      }
      return [];
    }

    return [
      {
        ...project,
        // createdAt は UTC の ISO 文字列。年月しか出さないので Date を経由せず先頭を切り出す
        yearMonth: project.createdAt.slice(0, 7).replace("-", "."),
        technologies: project.technologies.map(convertWithTechIcons),
      },
    ];
  });
});
</script>

<style scoped>
.topaz {
  position: relative;
  overflow: hidden;
  overflow: clip;
  /* WORKS (ミント) と CONTACT (ミント) に挟まれる白い面。交互のリズムを保つ */
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

.topaz-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.5rem;
  list-style: none;
}

.topaz-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  text-decoration: none;
  color: var(--color-ink);
  background: var(--color-surface);
  border: 2px solid var(--color-ink);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
  /* GSAP は transform を使うので、hover は translate プロパティ側で当てて衝突を避ける */
  transition:
    box-shadow 0.18s ease,
    translate 0.18s ease;
}

.topaz-card:hover {
  translate: 3px 3px;
  box-shadow: var(--card-shadow-hover);
}

.topaz-card:focus-visible {
  outline: 3px solid var(--color-primary-deep);
  outline-offset: 3px;
}

/*
 * サムネイルの枠。ズームと帯はこの枠の overflow で閉じ込める。
 * 下辺の境界線と背景は枠側に持たせてあるので、中の画像が拡大しても欠けない。
 * (角丸は .topaz-card の overflow: hidden 側で保たれる)
 */
.topaz-media {
  position: relative;
  overflow: hidden;
  /* 元のサムネイルは比率がバラバラなので、カード側で 16:9 に揃える */
  aspect-ratio: 16 / 9;
  background: var(--color-surface-mint);
  border-bottom: 2px solid var(--color-ink);
}

.topaz-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  /*
   * リビール (GSAP) は data-reveal を付けた .topaz-item 側の transform を触り、
   * 完了時に clearProps でそれを消す。ホバー演出は子要素に、かつ
   * transform ではなく個別プロパティ (scale / translate / rotate) で当てて衝突を避ける
   */
  transition: scale 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

/* 斜め帯。非ホバー時は枠の左下の外に退避していて、サムネイルを隠さない */
.topaz-band {
  position: absolute;
  /* 回転しても枠の横幅を渡りきるよう、左右にはみ出させておく */
  left: -20%;
  right: -20%;
  bottom: 16%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.3rem 1rem;
  background: var(--color-primary);
  /* --color-ink on --color-primary = 8.06:1 */
  color: var(--color-ink);
  border-top: 2px solid var(--color-ink);
  border-bottom: 2px solid var(--color-ink);
  font-family: var(--font-display);
  font-variation-settings:
    "ROND" 100,
    "wght" 800;
  font-size: 0.82rem;
  letter-spacing: 0.14em;
  line-height: 1.4;
  /* サイト共通の斜めモチーフ (セクションの切れ目・スピード線) と角度を揃える */
  rotate: var(--deco-angle);
  translate: -30% 340%;
  opacity: 0;
  transition:
    translate 0.45s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.25s ease;
}

/* タッチ端末ではタップ後に帯が貼り付いたままになるので、ポインタがある環境だけ */
@media (hover: hover) and (pointer: fine) {
  .topaz-card:hover .topaz-thumb {
    scale: 1.08;
  }

  .topaz-card:hover .topaz-band {
    translate: 0 0;
    opacity: 1;
  }
}

/* キーボード操作でも同じ見た目にする。こちらはポインタの有無によらず効かせる */
.topaz-card:focus-visible .topaz-thumb {
  scale: 1.08;
}

.topaz-card:focus-visible .topaz-band {
  translate: 0 0;
  opacity: 1;
}

.topaz-body {
  /* カードの余白を本文側で吸わせて、タグ (margin-top: auto) を下端に揃える */
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 1.1rem 1.25rem 1.35rem;
}

.topaz-title {
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1.35;
}

.topaz-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  line-height: 1.4;
}

.topaz-date {
  font-family: var(--font-display);
  font-variation-settings:
    "ROND" 100,
    "wght" 700;
  font-size: 0.85rem;
  letter-spacing: 0.08em;
  color: var(--color-primary-text);
}

.topaz-hackathon {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  background: var(--color-primary);
  color: var(--color-ink);
  border: 2px solid var(--color-ink);
}

.tech-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  list-style: none;
  margin-top: auto;
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

.topaz-more {
  display: flex;
  justify-content: center;
  margin-top: 2.25rem;
}

.topaz-more-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
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

.topaz-more-link:hover {
  translate: 3px 3px;
  background: var(--color-primary);
  box-shadow: var(--card-shadow-hover);
}

@media (max-width: 1024px) {
  .topaz-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .container {
    padding: 0 1.25rem;
  }

  .topaz-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 1.25rem;
  }
}

/*
 * reduced-motion ではズームとスライドをやめ、帯はその場でフェードするだけにする。
 * 上のホバー指定と同じ詳細度なので、必ず後ろに置いて上書きさせる
 */
@media (prefers-reduced-motion: reduce) {
  .topaz-thumb {
    transition: none;
  }

  .topaz-card:hover .topaz-thumb,
  .topaz-card:focus-visible .topaz-thumb {
    scale: 1;
  }

  .topaz-band {
    translate: 0 0;
    transition: opacity 0.2s ease;
  }
}
</style>
