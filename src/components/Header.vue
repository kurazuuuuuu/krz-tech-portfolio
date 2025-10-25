<template>
  <header>
    <nav class="navbar">
      <div class="nav-brand">
        <h2>kurazu</h2>
      </div>
      <div class="nav-links">
        <a @click="scrollTo('about')" class="nav-link">About</a>
        <a @click="scrollTo('projects')" class="nav-link">Projects</a>
        <a @click="scrollTo('contact')" class="nav-link">Contact</a>
        <a href="https://github.com/kurazuuuuuu/" class="nav-link github-link" target="_blank">
          <BrandGithubIcon :size="20"></BrandGithubIcon>
        </a>
      </div>
    </nav>
  </header>
</template>

<script>
import { BrandGithubIcon } from 'vue-tabler-icons'

export default {
  name: 'Header',
  components: {
    BrandGithubIcon
  },
  methods: {
    scrollTo(elementId) {
      const element = document.getElementById(elementId)
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        })
      }
    }
  }
}
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
}

.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.nav-brand h2 {
  color: #2d5a2d;
  font-weight: 600;
  font-size: 1.5rem;
  text-shadow: 1px 1px 0 #a8e6a3;
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

.github-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

@media (max-width: 768px) {
  .navbar {
    padding: 1rem;
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
