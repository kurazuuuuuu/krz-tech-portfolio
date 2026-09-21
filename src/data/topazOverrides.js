/*
 * Topa'z 側に登録のない情報を、作品 ID ごとに手で補うファイル。
 * topaz.json は `pnpm run sync:topaz` のたびに上書きされるので、手書きの情報はこちらに置く。
 *
 * - hackathon: ハッカソン名。書くと Topa'z 側の値より優先される
 * - award:     受賞名 (例: "最優秀賞")。Topa'z の API には無い項目
 *
 * どちらも省略できる。ID は src/data/topaz.json のもの。
 */
export const topazOverrides = {
  // VIBEY CLOVER (公式のカップではなく、勝手にやっている個人制作)
  "98d15a265636825d67e2": { hackathon: "〜裏ハックツハッカソン〜" },
  // コトハコビ
  c2bfcbeb9b1c5fd0e0ec: { hackathon: "ハックツハッカソン 〜アロカップ〜", award: "最優秀賞" },
  // コンテナをオーケストレーションする
  afb5ff1dbfb7d031e984: { hackathon: "ハックツハッカソン 〜メガロカップ〜", award: "優秀賞" },
  // タスクを投げる
  "61e4cdc624f69aa00908": { hackathon: "ハックツハッカソン 〜Nulabカップ〜", award: "最優秀賞" },
  // 身勝手カレンダー
  a638a35dba0e7df4048b: { hackathon: "ハックツハッカソン 〜プテラカップ〜", award: "特別賞" },
  // ２４時間でさようなら (Topa'z 側は「イクチオカップ」だけなので、他と表記を揃える)
  "8b2807a4a9c0881464b9": { hackathon: "ハックツハッカソン 〜イクチオカップ〜", award: "優秀賞" },
  // AWSアーキテクチャビルダー
  ff454ddba004e991b867: { hackathon: "Progateハッカソン powered by AWS", award: "優秀賞＆AWS賞" },

  // 未登録: Dopa'z (0c272a3f0e2e984a1ab5) / 資格召喚 (8a51f1a4d3ea21fc40c0) / harukazeDash! (5b3e0b34a2806a864d31)
};
