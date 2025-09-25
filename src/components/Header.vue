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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
        </a>
      </div>
    </nav>
  </header>
</template>

<script>
export default {
  name: 'Header',
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
