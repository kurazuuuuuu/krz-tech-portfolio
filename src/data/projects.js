import { convertWithTechIcons } from "../utils/techIcons.js";

export const projects = [
  {
    id: "perugraph",
    name: "ペルグラフ / Perugraph (in Dev)",
    description: [
      "VRChat コミュニティのためのフォトアルバムプラットフォーム",
      "",
      "Discordサーバーと紐づけ、アルバムを作成し、各サーバーでそのアルバムを運営してもらうことをコンセプトにしています。",
      "",
      "「Nitro入ってないけど...8Kとか綺麗な画像を非圧縮で送信したい...」そんな願いを解決します。",
    ].join("\n"),
    technologies: ["Kubernetes", "Cloudflare", "Discord.py", "Vue.js"].map(convertWithTechIcons),
    deploy_url: "https://beta.perugraph.app",
    github_url: null,
  },
  {
    id: "github-fairy",
    name: "Fairy",
    description: [
      "Discord 上で動作するアプリケーションです。",
      "生成AIと Web フロントエンドを組み合わせて、日常的に触りやすい体験を目指して開発しています。",
    ].join("\n"),
    technologies: ["Discord.py", "Vue.js", "Gemini 2.5 Flash Lite", "MongoDB"].map(
      convertWithTechIcons,
    ),
    deploy_url: "https://fairy.krz-tech.net",
    github_url: "https://github.com/kurazuuuuuu/fairy",
  },
];
