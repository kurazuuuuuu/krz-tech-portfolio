<template>
  <header :class="{ 'scrolled': isScrolled }">
    <nav class="navbar">
      <div class="nav-brand">
        <h2>kurazu</h2>
      </div>
      <div class="nav-links">
        <a 
          v-for="item in navItems" 
          :key="item.id"
          @click="scrollTo(item.id)" 
          class="nav-link"
        >
          {{ item.label }}
        </a>
        <a href="https://foto.krz-tech.net/" class="nav-link icon-link" target="_blank">
          <PhotoIcon :size="20"></PhotoIcon>
        </a>
        <a href="https://github.com/kurazuuuuuu/" class="nav-link icon-link" target="_blank">
          <BrandGithubIcon :size="20"></BrandGithubIcon>
        </a>
      </div>
    </nav>
  </header>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { BrandGithubIcon, PhotoIcon } from 'vue-tabler-icons'

const isScrolled = ref(false)

const navItems = [
  { id: 'about', label: 'About' },
  { id: 'projects', label: 'Projects' },
  { id: 'contact', label: 'Contact' }
]

const handleScroll = () => {
  isScrolled.value = window.scrollY > 50
}

const scrollTo = (elementId) => {
  const element = document.getElementById(elementId)
  if (element) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    })
  }
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: rgba(168, 230, 163, 0.9);
  border-bottom: 3px solid #7db87d;
  box-shadow: 0 2px 0 #6ba86b;
  transition: all 0.3s ease;
  padding: 0;
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
  padding: 1rem 2rem;
  max-width: 1200px;
  margin: 0 auto;
  transition: padding 0.3s ease;
}

header.scrolled .navbar {
  padding: 0.5rem 2rem;
}

.nav-brand h2 {
  color: #2d5a2d;
  font-weight: 600;
  font-size: 1.5rem;
  text-shadow: 1px 1px 0 #a8e6a3;
  cursor: pointer;
}

.nav-links {
  display: flex;
  gap: 2rem;
  align-items: center;
}

.nav-link {
  color: #2d5a2d;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.3s ease;
  padding: 0.5rem 1rem;
  border: 2px solid transparent;
  cursor: pointer;
}

.nav-link:hover {
  color: #1a3d1a;
  background: rgba(125, 184, 125, 0.3);
  border: 2px solid #7db87d;
  transform: translateY(-2px);
}

.icon-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

@media (max-width: 768px) {
  .navbar {
    padding: 1rem;
  }
  
  header.scrolled .navbar {
    padding: 0.5rem 1rem;
  }

  .nav-links {
    gap: 1rem;
  }
  
  .nav-link {
    padding: 0.25rem 0.5rem;
    font-size: 0.9rem;
  }
}
</style>
