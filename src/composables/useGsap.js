import { onMounted, onUnmounted, unref, watch } from "vue";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

export { gsap, ScrollTrigger, SplitText };

/*
 * reduced-motion の分岐は gsap.matchMedia() に一本化する。
 * GSAP は「どの条件にも一致しない matchMedia」では builder を呼ばないので、
 * reduce と no-preference を並べて必ずどちらかが一致するようにしている。
 * (呼び出し側が渡す追加条件が全て不一致でも、この 2 つで builder の実行は担保される)
 */
const MOTION_CONDITIONS = {
  reduceMotion: "(prefers-reduced-motion: reduce)",
  noPreference: "(prefers-reduced-motion: no-preference)",
};

function resolveScope(scope) {
  const target = unref(scope);
  return target?.$el ?? target ?? null;
}

/**
 * コンポーネントのライフサイクルに紐づいた gsap.context() を張る薄いラッパー。
 *
 * - `add(builder)` で登録した builder は、マウント後に context 内の
 *   gsap.matchMedia() 経由で呼ばれる。引数は `{ reduceMotion, conditions, contextSafe }`。
 *   - `reduceMotion` が true のときは「アニメーションせず最終状態を即表示」する分岐を書く。
 *   - `conditions` は matchMedia の判定結果。`options.conditions` で足した条件もここに入る。
 *   - `contextSafe(fn)` は、後から発火するハンドラ (hover / click など) の中で作った
 *     tween も context に追跡させたいときに使うラッパー。
 * - builder が関数を返すと、revert 時の後始末として呼ばれる。
 * - builder 内のセレクタ文字列は scope 配下に限定される。
 * - アンマウント時に ctx.revert() する。context 内で生成した matchMedia も一緒に片付く。
 *
 * ```js
 * const root = ref(null);
 * const { add } = useGsap(root, { conditions: { isMobile: "(max-width: 768px)" } });
 *
 * add(({ reduceMotion, conditions, contextSafe }) => {
 *   if (reduceMotion) return;
 *   const items = gsap.utils.toArray("[data-hero]", root.value);
 *   gsap.from(items, { autoAlpha: 0, y: conditions.isMobile ? 16 : 36, stagger: 0.08 });
 *
 *   const onEnter = contextSafe(() => gsap.to(items, { scale: 1.02 }));
 *   items[0].addEventListener("pointerenter", onEnter);
 *   return () => items[0].removeEventListener("pointerenter", onEnter);
 * });
 * ```
 */
export function useGsap(scope, { conditions } = {}) {
  let ctx = null;
  let mm = null;
  const pending = [];

  const register = (builder, scopeEl) => {
    mm.add(
      { ...MOTION_CONDITIONS, ...conditions },
      // builder の戻り値 (後始末の関数) は matchMedia 側の cleanup として使われるので、
      // ここで捨てずにそのまま返す
      (context, contextSafe) =>
        builder({
          reduceMotion: context.conditions.reduceMotion === true,
          conditions: context.conditions,
          contextSafe,
        }),
      scopeEl,
    );
  };

  const add = (builder) => {
    if (!mm) {
      pending.push(builder);
      return;
    }
    const scopeEl = resolveScope(scope);
    if (!scopeEl) return;
    register(builder, scopeEl);
  };

  onMounted(() => {
    const scopeEl = resolveScope(scope);
    if (!scopeEl) {
      // スコープが取れないまま登録すると、セレクタ文字列がページ全体に効いてしまう
      console.warn(
        "[useGsap] スコープ要素を解決できませんでした。テンプレートの ref を確認してください。",
      );
      pending.length = 0;
      return;
    }

    ctx = gsap.context(() => {
      mm = gsap.matchMedia();
    }, scopeEl);
    pending.splice(0).forEach((builder) => register(builder, scopeEl));
  });

  onUnmounted(() => {
    ctx?.revert();
    ctx = null;
    mm = null;
  });

  return { add };
}

const REVEAL_DEFAULTS = {
  y: 40,
  duration: 0.7,
  ease: "power3.out",
  stagger: 0.09,
  // clamp() を付けると、ページ最下部の要素でも start がスクロール可能な範囲に丸められる。
  // これがないと到達不可能な位置にトリガが置かれて永久に不可視のままになりうる
  start: "clamp(top 85%)",
};

/**
 * scope 配下の `[data-reveal]` を、スクロールで見えた時点でフェードインさせる。
 *
 * - `data-reveal` (値なし) … 単独で出る
 * - `data-reveal="<group>"` … 同じ値を持つ要素どうしで、同時にビューポートへ
 *   入ったぶんだけまとめて stagger する
 *
 * options:
 * - `enabled` … ref か getter。false の間は要素を隠したまま ScrollTrigger を張らない
 *   (イントロのオーバーレイの裏でリビールが終わってしまうのを防ぐ)。
 *   reduced-motion のときは enabled によらず最初から可視。
 * - `conditions` … useGsap に渡す追加の matchMedia 条件
 * - その他 `y` / `duration` / `ease` / `stagger` / `start` は REVEAL_DEFAULTS を上書きする
 *
 * 戻り値の `refresh()` は、未登録の `[data-reveal]` を拾い直してから
 * `ScrollTrigger.refresh()` を呼ぶ。非同期でコンテンツの高さが変わった後に使う。
 *
 * ```vue
 * <div data-reveal>…</div>
 * <div v-for="p in projects" :key="p.id" data-reveal="projects">…</div>
 * ```
 */
export function useScrollReveal(scope, options = {}) {
  const { y, duration, ease, stagger, start, enabled, conditions } = {
    ...REVEAL_DEFAULTS,
    enabled: true,
    ...options,
  };

  const { add } = useGsap(scope, { conditions });

  const isEnabled = () => (typeof enabled === "function" ? enabled() : unref(enabled)) !== false;

  // builder が contextSafe で用意する操作。revert 後は null に戻る
  let scan = null;
  let activate = null;

  add(({ reduceMotion, contextSafe }) => {
    // reduced-motion では何も隠さない。要素は最初から最終状態のまま
    if (reduceMotion) return undefined;

    // 登録済みの要素。refresh() での再走査で二重登録しないための台帳
    const tracked = new WeakSet();
    // enabled が false の間、ScrollTrigger 待ちで溜めておく要素
    let deferred = [];

    const reveal = (els) =>
      gsap.to(els, {
        autoAlpha: 1,
        y: 0,
        duration,
        ease,
        stagger,
        // インラインの transform / opacity を残すと、要素側の hover transform が効かなくなる
        clearProps: "transform,opacity,visibility",
      });

    const attach = (els) => {
      const groups = new Map();
      els.forEach((el) => {
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
        ScrollTrigger.batch(group, {
          start,
          once: true,
          onEnter: (batch) => reveal(batch),
        });
      });
    };

    scan = contextSafe(() => {
      const fresh = gsap.utils
        .toArray("[data-reveal]", resolveScope(scope))
        .filter((el) => !tracked.has(el));
      if (!fresh.length) return;

      fresh.forEach((el) => tracked.add(el));
      gsap.set(fresh, { autoAlpha: 0, y });

      if (isEnabled()) {
        attach(fresh);
      } else {
        deferred = deferred.concat(fresh);
      }
    });

    activate = contextSafe(() => {
      if (!deferred.length) return;
      attach(deferred);
      deferred = [];
    });

    scan();

    return () => {
      scan = null;
      activate = null;
      deferred = [];
    };
  });

  watch(isEnabled, (on) => {
    if (on) activate?.();
  });

  const refresh = () => {
    scan?.();
    ScrollTrigger.refresh();
  };

  return { refresh };
}
