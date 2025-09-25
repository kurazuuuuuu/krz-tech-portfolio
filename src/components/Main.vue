<template>
  <main>
    <!-- Hero Section -->
    <section id="about" class="hero">
      <div class="hero-content animate-on-scroll">
        <div class="hero-avatar">
          <img src="/img/icon.webp" alt="Profile" class="avatar" loading="lazy">
        </div>
        <h1 class="hero-title">{{ profile.name }}</h1>
        <p class="hero-subtitle">{{ profile.description }}</p>
        <div class="hero-skills">
          <span v-for="(skill, index) in profile.skills" :key="skill" 
                class="skill-tag" 
                :style="{ animationDelay: (1.5 + index * 0.1) + 's' }">
            {{ skill }}
          </span>
        </div>
        <div class="hero-actions">
          <a @click="scrollTo('projects')" class="btn btn-primary">View Projects</a>
        </div>
      </div>
    </section>

    <!-- Projects Section -->
    <section id="projects" class="projects">
      <div class="container">
        <h2 class="section-title animate-on-scroll">Projects</h2>
        <div v-if="projects.length === 0" class="no-projects animate-on-scroll">
          <h3>Coming Soon(´・ω・｀)</h3>
          <p>返事がない...</p>
        </div>
        <div v-else class="projects-grid">
          <div v-for="project in projects" :key="project.id" class="project-card animate-on-scroll">
            <div class="project-image">
              <div class="project-placeholder">{{ project.name.charAt(0) }}</div>
            </div>
            <div class="project-content">
              <h3>{{ project.name }}</h3>
              <p>{{ project.description }}</p>
              <div class="project-tech">
                <span v-for="tech in project.technologies" :key="tech" class="tech-tag">
                  {{ tech }}
                </span>
              </div>
              <div class="project-links">
                <a :href="project.github" class="project-link" target="_blank">GitHub</a>
                <a v-if="project.demo" :href="project.demo" class="project-link" target="_blank">Live Demo</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Contact Section -->
    <section id="contact" class="contact">
      <div class="container">
        <h2 class="section-title animate-on-scroll">Let's Connect</h2>
        <div class="contact-content animate-on-scroll">
          <p class="contact-text">どなたでも大歓迎です！技術的な話だけじゃなく色々見てみてください！</p>
          <div class="social-links">
            <a v-for="link in socialLinks" :key="link.name" 
               :href="link.url" 
               class="social-link" 
               target="_blank">
              <span v-html="link.icon"></span>
              {{ link.name }}
            </a>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<script>
export default {
  name: 'Main',
  data() {
    return {
      profile: {
        name: 'くらず / kurazu',
        description: 'Backend & Infrastructure Enginner',
        skills: ['VR / XR', 'Python', 'JavaScript', 'Linux', "Network"]
      },
      projects: [],
      socialLinks: [
        { 
          name: 'Twitter', 
          url: 'https://twitter.com/kurazu_vrc', 
          icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>' 
        },
        { 
          name: 'GitHub', 
          url: 'https://github.com/kurazuuuuuu/', 
          icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>' 
        }
      ]
    }
  },
  mounted() {
    this.setupScrollAnimations()
  },
  methods: {
    setupScrollAnimations() {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in')
          }
        })
      }, { threshold: 0.1 })

      document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el)
      })
    },
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
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
}

/* Animations */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-on-scroll {
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.6s ease;
}

.animate-on-scroll.animate-in {
  opacity: 1;
  transform: translateY(0);
}

/* Hero Section */
.hero {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem;
}

.hero-content {
  max-width: 800px;
}

.hero-avatar {
  margin-bottom: 2rem;
}

.avatar {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  border: 4px solid rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.avatar:hover {
  transform: scale(1.05);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.3);
}

.hero-title {
  font-size: 3.5rem;
  font-weight: 700;
  color: #2d5a2d;
  margin-bottom: 1rem;
  text-shadow: 2px 2px 0 #a8e6a3, 4px 4px 0 #7db87d;
}

.hero-subtitle {
  font-size: 1.5rem;
  color: #4a7a4a;
  margin-bottom: 2rem;
  font-weight: 300;
  text-shadow: 1px 1px 0 #a8e6a3;
}

.hero-skills {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 3rem;
}

.skill-tag {
  background: #a8e6a3;
  color: #2d5a2d;
  padding: 0.5rem 1rem;
  border: 2px solid #7db87d;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.3s ease;
  box-shadow: 2px 2px 0 #6ba86b;
  animation: fadeInUp 0.6s ease forwards;
  opacity: 0;
}

.skill-tag:hover {
  background: #7db87d;
  color: #1a3d1a;
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 #6ba86b;
}

.hero-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  padding: 1rem 2rem;
  border-radius: 50px;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  display: inline-block;
  cursor: pointer;
}

.btn-primary {
  background: #7db87d;
  color: white;
  border-color: #6ba86b;
  box-shadow: 3px 3px 0 #5a9a5a;
}

.btn-primary:hover {
  background: #6ba86b;
  color: white;
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0 #5a9a5a;
}

.btn-secondary {
  background: transparent;
  color: #2d5a2d;
  border-color: #7db87d;
  box-shadow: 3px 3px 0 #a8e6a3;
}

.btn-secondary:hover {
  background: rgba(125, 184, 125, 0.2);
  border-color: #6ba86b;
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0 #a8e6a3;
}

/* Projects Section */
.projects {
  padding: 5rem 0;
  background: rgba(168, 230, 163, 0.3);
  border-top: 3px solid #7db87d;
  border-bottom: 3px solid #7db87d;
}

.section-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #2d5a2d;
  text-align: center;
  margin-bottom: 3rem;
  text-shadow: 2px 2px 0 #a8e6a3, 4px 4px 0 #7db87d;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 2rem;
}

.project-card {
  background: #d4f1d4;
  padding: 2rem;
  border: 3px solid #7db87d;
  transition: all 0.3s ease;
  box-shadow: 4px 4px 0 #a8e6a3;
}

.project-card:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0 #a8e6a3;
  background: #c0edc0;
}

.project-image {
  margin-bottom: 1.5rem;
}

.project-placeholder {
  width: 80px;
  height: 80px;
  background: #7db87d;
  border: 3px solid #6ba86b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: bold;
  color: white;
  margin: 0 auto;
  box-shadow: 2px 2px 0 #5a9a5a;
}

.project-content h3 {
  color: #2d5a2d;
  font-size: 1.5rem;
  margin-bottom: 1rem;
  font-weight: 600;
  text-shadow: 1px 1px 0 #a8e6a3;
}

.project-content p {
  color: #4a7a4a;
  margin-bottom: 1.5rem;
  line-height: 1.6;
}

.project-tech {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.tech-tag {
  background: #a8e6a3;
  color: #2d5a2d;
  padding: 0.25rem 0.75rem;
  border: 1px solid #7db87d;
  font-size: 0.8rem;
  font-weight: 500;
}

.project-links {
  display: flex;
  gap: 1rem;
}

.project-link {
  color: #2d5a2d;
  text-decoration: none;
  font-weight: 500;
  padding: 0.5rem 1rem;
  border: 2px solid #7db87d;
  transition: all 0.3s ease;
  background: #a8e6a3;
  box-shadow: 2px 2px 0 #6ba86b;
}

.project-link:hover {
  background: #7db87d;
  color: white;
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 #6ba86b;
}

.no-projects {
  text-align: center;
  padding: 4rem 2rem;
  background: #d4f1d4;
  border: 3px solid #7db87d;
  box-shadow: 4px 4px 0 #a8e6a3;
  max-width: 500px;
  margin: 0 auto;
}

.no-projects h3 {
  color: #2d5a2d;
  font-size: 1.8rem;
  margin-bottom: 1rem;
  font-weight: 600;
  text-shadow: 1px 1px 0 #a8e6a3;
}

.no-projects p {
  color: #4a7a4a;
  font-size: 1.1rem;
  line-height: 1.6;
}

/* Contact Section */
.contact {
  padding: 5rem 0;
  text-align: center;
}

.contact-text {
  font-size: 1.2rem;
  color: #4a7a4a;
  margin-bottom: 2rem;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  text-shadow: 1px 1px 0 #a8e6a3;
}

.social-links {
  display: flex;
  justify-content: center;
  gap: 2rem;
  flex-wrap: wrap;
}

.social-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #2d5a2d;
  text-decoration: none;
  font-weight: 500;
  padding: 1rem 2rem;
  background: #a8e6a3;
  border: 3px solid #7db87d;
  transition: all 0.3s ease;
  box-shadow: 3px 3px 0 #6ba86b;
}

.social-link:hover {
  background: #7db87d;
  color: white;
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0 #6ba86b;
}

/* Responsive Design */
@media (max-width: 768px) {
  .hero-title {
    font-size: 2.5rem;
  }
  
  .hero-subtitle {
    font-size: 1.2rem;
  }
  
  .hero-actions {
    flex-direction: column;
    align-items: center;
  }
  
  .btn {
    width: 200px;
  }
  
  .projects-grid {
    grid-template-columns: 1fr;
  }
  
  .social-links {
    flex-direction: column;
    align-items: center;
  }
  
  .social-link {
    width: 200px;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .container {
    padding: 0 1rem;
  }
  
  .hero {
    padding: 1rem;
  }
  
  .avatar {
    width: 120px;
    height: 120px;
  }
  
  .hero-title {
    font-size: 2rem;
  }
  
  .section-title {
    font-size: 2rem;
  }
}
</style>
