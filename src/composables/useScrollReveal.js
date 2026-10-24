import { onMounted, onUnmounted, unref, watch } from "vue";

// 下はビューポート下端から 10% 手前で発火させる。これ以上深くすると、
// ページ最下部の要素がスクロールしきっても交差せず永久に不可視のままになりうる。
// 上は大きく広げて「ビューポートより上にある = 通過済み」も交差扱いにする。
// こうしないとアンカーやリロード復元で一気に飛び越した要素が隠れたまま残る
const ROOT_MARGIN = "100000px 0px -10% 0px";

/**
 * scope 配下の `[data-reveal]` が見えた時点で `.is-revealed` を付ける。
 * 動き自体は App.vue のグローバル CSS (@keyframes reveal) が担う。
 *
 * - `data-reveal` (値なし) … 単独で出る
 * - `data-reveal="<group>"` … 同じ値を持つ要素どうしで、同時にビューポートへ
 *   入ったぶんだけまとめて stagger する (`--reveal-index` に 0, 1, 2… を入れる)
 *
 * options:
 * - `enabled` … ref か getter。false の間は監視を始めず、要素は隠したまま
 *   (イントロのオーバーレイの裏でリビールが終わってしまうのを防ぐ)。
 *   reduced-motion のときは CSS 側で最初から可視。
 *
 * ```vue
 * <div data-reveal>…</div>
 * <div v-for="p in projects" :key="p.id" data-reveal="projects">…</div>
 * ```
 */
export function useScrollReveal(scope, { enabled = true } = {}) {
  let observer = null;

  const isEnabled = () => (typeof enabled === "function" ? enabled() : unref(enabled)) !== false;

  const onIntersect = (entries) => {
    const groups = new Map();
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      observer.unobserve(el);
      // 値なしの data-reveal は空文字。要素自身をキーにして単独グループ扱いにする
      const key = el.dataset.reveal || el;
      const group = groups.get(key);
      if (group) {
        group.push(el);
      } else {
        groups.set(key, [el]);
      }
    });

    groups.forEach((group) => {
      group.forEach((el, index) => {
        el.style.setProperty("--reveal-index", index);
        el.classList.add("is-revealed");
      });
    });
  };

  const start = () => {
    const target = unref(scope);
    const scopeEl = target?.$el ?? target;
    if (observer || !scopeEl || !isEnabled()) return;

    observer = new IntersectionObserver(onIntersect, { rootMargin: ROOT_MARGIN });
    scopeEl.querySelectorAll("[data-reveal]").forEach((el) => observer.observe(el));
  };

  onMounted(start);

  watch(isEnabled, (on) => {
    if (on) start();
  });

  onUnmounted(() => {
    observer?.disconnect();
    observer = null;
  });
}
