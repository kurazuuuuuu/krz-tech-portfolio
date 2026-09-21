import { markRaw } from "vue";
import {
  IconBrandAws,
  IconBrandCloudflare,
  IconBrandDiscord,
  IconBrandDocker,
  IconBrandGithub,
  IconBrandGoogle,
  IconBrandJavascript,
  IconBrandKotlin,
  IconBrandPython,
  IconBrandReact,
  IconBrandTerraform,
  IconBrandUbuntu,
  IconBrandVue,
  IconCode,
  IconDatabase,
  IconServer,
  IconTopologyStar3,
} from "@tabler/icons-vue";

// "js" / "db" は他の語に埋もれやすいので、語尾を境界で見る (vue.js, nextjs, mongodb)
const JS_PATTERN = /js\b/;
const DB_PATTERN = /db\b/;

export const convertWithTechIcons = (techName) => {
  const lowerName = techName.toLowerCase();

  let icon = null;

  if (lowerName.includes("vue")) {
    icon = IconBrandVue;
  } else if (lowerName.includes("react")) {
    icon = IconBrandReact;
  } else if (lowerName.includes("discord")) {
    icon = IconBrandDiscord;
  } else if (lowerName.includes("python")) {
    icon = IconBrandPython;
  } else if (lowerName.includes("javascript") || JS_PATTERN.test(lowerName)) {
    icon = IconBrandJavascript;
  } else if (lowerName.includes("kotlin")) {
    icon = IconBrandKotlin;
  } else if (lowerName.includes("terraform")) {
    icon = IconBrandTerraform;
  } else if (lowerName.includes("kubernetes") || lowerName.includes("k8s")) {
    icon = IconTopologyStar3;
  } else if (lowerName.includes("docker")) {
    icon = IconBrandDocker;
  } else if (lowerName.includes("aws")) {
    icon = IconBrandAws;
  } else if (lowerName.includes("cloudflare")) {
    icon = IconBrandCloudflare;
  } else if (
    lowerName.includes("gcp") ||
    lowerName.includes("google") ||
    lowerName.includes("gemini")
  ) {
    icon = IconBrandGoogle;
  } else if (lowerName.includes("linux") || lowerName.includes("ubuntu")) {
    icon = IconBrandUbuntu;
  } else if (
    lowerName.includes("network") ||
    lowerName.includes("server") ||
    lowerName.includes("proxmox")
  ) {
    icon = IconServer;
  } else if (lowerName.includes("github")) {
    icon = IconBrandGithub;
  } else if (
    lowerName.includes("mongo") ||
    lowerName.includes("sql") ||
    DB_PATTERN.test(lowerName)
  ) {
    icon = IconDatabase;
  } else {
    icon = IconCode; // Default icon
  }

  return {
    name: techName,
    icon: icon ? markRaw(icon) : null,
  };
};
