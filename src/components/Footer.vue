<template>
  <footer class="footer">
    <div class="container">
      <div class="footer-content">
        <p>&copy; 2025 kurazu. Built with Amazon Q Developer</p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  background: rgba(168, 230, 163, 0.9);
  border-top: 3px solid #7db87d;
  padding: 2rem 0;
  box-shadow: 0 -2px 0 #6ba86b;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
}

.footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #2d5a2d;
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
  .footer-content {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }
  
  .footer-links {
    gap: 1rem;
  }
}
</style>