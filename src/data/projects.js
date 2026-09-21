import { convertWithTechIcons } from "../utils/techIcons.js";

export const projects = [
  {
    id: "blitz",
    name: "Blit'z",
    description: ["??? (開発中...)"].join("\n"),
    technologies: ["Discord", "AWS", "Cloudflare"].map(convertWithTechIcons),
    deploy_url: "https://perugraph.app",
    github_url: null,
  },
  {
    id: "perugraph",
    name: "ペルグラフ / Perugraph",
    description: [
      "Discord でつながったVRChat仲間と写真を共有するためのアプリです。",
      "アルバムを単位に写真を集め、メンバーだけで思い出を眺めたり残したりできます。",
    ].join("\n"),
    technologies: ["Cloudflare", "Kubernetes", "Discord"].map(convertWithTechIcons),
    deploy_url: "https://perugraph.app",
    github_url: null,
  },
  {
    id: "github-fairy",
    name: "Fairy",
    description: [
      "Discord 上で動作するアプリケーションです。",
      "生成AIと Web フロントエンドを組み合わせて、日常的に触りやすい体験を目指して開発しています。",
    ].join("\n"),
    technologies: ["Discord", "Gemini 3.5 Flash Lite"].map(convertWithTechIcons),
    deploy_url: "https://fairy.krz-tech.net",
    github_url: "https://github.com/kurazuuuuuu/fairy",
  },
];
