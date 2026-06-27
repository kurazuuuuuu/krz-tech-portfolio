<template>
  <footer class="footer">
    <div class="container">
      <div class="footer-content">
        <p>&copy; {{ year }} くらず / Kurazu. Built with Vue.js</p>
      </div>
    </div>
  </footer>
</template>

<script setup>
const year = new Date().getFullYear();
</script>

<style scoped>
.footer {
  background: rgba(168, 230, 163, 0.9);
  border-top: 2px solid #7db87d;
  padding: 1rem 0;
  box-shadow: 0 -1px 0 #6ba86b;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

.footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #2d5a2d;
  font-size: 0.875rem;
  line-height: 1.4;
  min-height: 44px;
}

.footer-links {
  display: flex;
  gap: 2rem;
}

.footer-links a {
  color: #4a7a4a;
  text-decoration: none;
  transition: all 0.3s ease;
  padding: 0.25rem 0.5rem;
  border: 2px solid transparent;
}

.footer-links a:hover {
  color: #2d5a2d;
  border-color: #7db87d;
  background: rgba(125, 184, 125, 0.2);
}

@media (max-width: 768px) {
  .footer {
    padding: 0.75rem 0;
  }

  .container {
    padding: 0 1rem;
  }

  .footer-content {
    flex-direction: column;
    gap: 0.5rem;
    text-align: center;
  }

  .footer-links {
    gap: 1rem;
  }
}
</style>
