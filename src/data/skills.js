import { convertWithTechIcons } from "../utils/techIcons.js";

/*
 * level は旧 INTRODUCTION.txt の「技術領域」= MAIN /
 * 「メインじゃないけどよく使う技術」= SUB に対応する。
 */
export const skillGroups = [
  {
    id: "backend",
    title: "BACKEND",
    level: "MAIN",
    description: "バックエンド",
    technologies: ["Python", "Kotlin"].map(convertWithTechIcons),
  },
  {
    id: "infra",
    title: "INFRA",
    level: "MAIN",
    description: "インフラ(オンプレ、クラウド)",
    technologies: [
      "オンプレ",
      "AWS",
      "GCP",
      "Cloudflare",
      "Docker",
      "Kubernetes",
      "Proxmox VE",
      "Terraform",
      "Linux",
      "Network",
    ].map(convertWithTechIcons),
  },
  {
    id: "ai-ml",
    title: "AI / ML",
    level: "SUB",
    description: "メインじゃないけどよく使う技術",
    technologies: ["エージェント", "LLM", "Diffusion"].map(convertWithTechIcons),
  },
  {
    id: "vr-xr",
    title: "VR / XR",
    level: "SUB",
    description: "メインじゃないけどよく使う技術",
    technologies: ["VRChat", "WebXR"].map(convertWithTechIcons),
  },
];
