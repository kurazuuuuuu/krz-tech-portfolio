<template>
  <main ref="root">
    <HeroSection :intro-done="introDone" />
    <ProfileSection />
    <SkillsSection />
    <WorksSection :projects="projects" />
    <ContactSection />
  </main>
</template>

<script setup>
import { nextTick, onMounted, reactive, ref } from "vue";
import { useScrollReveal } from "../composables/useGsap.js";
import { projects as projectsData } from "../data/projects.js";
import HeroSection from "./sections/HeroSection.vue";
import ProfileSection from "./sections/ProfileSection.vue";
import SkillsSection from "./sections/SkillsSection.vue";
import WorksSection from "./sections/WorksSection.vue";
import ContactSection from "./sections/ContactSection.vue";

const props = defineProps({
  // イントロ (IntroAnimation) が閉じ始めたか
  introDone: { type: Boolean, default: false },
});

// GitHub API で description を上書きするので、元データを浅くコピーして reactive にする
const projects = reactive(projectsData.map((project) => ({ ...project })));

async function fetchGitHubDescription(githubUrl) {
  try {
    const match = githubUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) return null;

    const owner = match[1];
    const repo = match[2];

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
    if (!response.ok) throw new Error("GitHub API request failed");

    const data = await response.json();
    return data.description;
  } catch (error) {
    console.warn("Failed to fetch GitHub description:", error);
    return null;
  }
}

async function updateProjectDescriptions() {
  for (const project of projects) {
    if (project.github_url) {
      const description = await fetchGitHubDescription(project.github_url);
      if (description) {
        project.description = description;
      }
    }
  }
}

const root = ref(null);

// 各セクションのスクロールリビール ([data-reveal])。
// イントロのオーバーレイが開いている間は隠したまま待たせて、裏でリビールが終わるのを防ぐ
const { refresh: refreshReveal } = useScrollReveal(root, {
  enabled: () => props.introDone,
});

onMounted(async () => {
  await updateProjectDescriptions();
  // description が伸びるとカードの高さが変わり、下のトリガ位置がずれる
  await nextTick();
  refreshReveal();
});
</script>

<style scoped>
main {
  position: relative;
  /* 斜めカット・装飾のはみ出しで横スクロールを出さない */
  overflow-x: hidden;
  overflow-x: clip;
}
</style>
