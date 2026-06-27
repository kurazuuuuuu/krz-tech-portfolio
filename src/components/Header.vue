<template>
  <header :class="{ scrolled: isScrolled }">
    <nav class="navbar">
      <div class="nav-brand">
        <h2>krz-tech.net</h2>
      </div>
      <div class="nav-links">
        <a v-for="item in navItems" :key="item.id" @click="scrollTo(item.id)" class="nav-link">
          {{ item.label }}
        </a>
        <a href="https://foto.krz-tech.net/" class="nav-link icon-link" target="_blank">
          <PhotoIcon :size="18"></PhotoIcon>
        </a>
        <a href="https://github.com/kurazuuuuuu/" class="nav-link icon-link" target="_blank">
          <BrandGithubIcon :size="18"></BrandGithubIcon>
        </a>
      </div>
    </nav>
  </header>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { BrandGithubIcon, PhotoIcon } from "vue-tabler-icons";

const isScrolled = ref(false);

const navItems = [
  { id: "about", label: "About" },
  { id: "projects", label: "Projects" },
  { id: "contact", label: "Contact" },
];

const handleScroll = () => {
  isScrolled.value = window.scrollY > 50;
};

const scrollTo = (elementId) => {
  const element = document.getElementById(elementId);
  if (element) {
    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
};

onMounted(() => {
  window.addEventListener("scroll", handleScroll);
});

onUnmounted(() => {
  window.removeEventListener("scroll", handleScroll);
});
</script>

<style scoped>
header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: rgba(168, 230, 163, 0.9);
  border-bottom: 2px solid #7db87d;
  box-shadow: 0 1px 0 #6ba86b;
  transition:
    background 0.3s ease,
    border-color 0.3s ease,
    box-shadow 0.25s ease;
  padding: 0;
}

header:hover {
  box-shadow:
    0 2px 0 #6ba86b,
    0 4px 12px rgba(45, 90, 45, 0.15);
}

header.scrolled {
  background: rgba(168, 230, 163, 0.7);
  backdrop-filter: blur(10px);
  padding: 0;
  border-bottom: 1px solid rgba(125, 184, 125, 0.5);
}

.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 1.5rem;
  min-height: 44px;
  max-width: 1200px;
  margin: 0 auto;
  transition: min-height 0.25s ease;
}

header:hover .navbar {
  min-height: 80px;
}

header.scrolled .navbar {
  padding: 0 1.5rem;
}

.nav-brand h2 {
  color: #2d5a2d;
  font-weight: 600;
  font-size: 1.25rem;
  line-height: 1;
  text-shadow: 1px 1px 0 #a8e6a3;
  cursor: pointer;
  transition: transform 0.2s ease;
  transform-origin: left center;
}

.nav-brand h2:hover {
  transform: scale(1.25);
}

.nav-links {
  display: flex;
  gap: 1.25rem;
  align-items: center;
}

.nav-link {
  color: #2d5a2d;
  text-decoration: none;
  font-weight: 500;
  font-size: 0.9375rem;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease;
  padding: 0 0.75rem;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  border: 2px solid transparent;
  cursor: pointer;
  transform-origin: center;
}

.nav-link:hover {
  color: #1a3d1a;
  background: rgba(125, 184, 125, 0.3);
  border: 2px solid #7db87d;
  transform: scale(1.25);
}

.icon-link {
  justify-content: center;
  min-width: 44px;
  padding: 0;
}

@media (max-width: 768px) {
  .navbar {
    padding: 0 1rem;
  }

  header.scrolled .navbar {
    padding: 0 1rem;
  }

  .nav-brand h2 {
    font-size: 1.125rem;
  }

  .nav-links {
    gap: 0.75rem;
  }

  .nav-link {
    padding: 0 0.5rem;
    font-size: 0.875rem;
  }
}
</style>
