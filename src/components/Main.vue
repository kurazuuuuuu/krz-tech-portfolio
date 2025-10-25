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
          <a href="mailto:contact@krz-tech.net" class="contact-email">
            <MailIcon :size="24" />
            contact@krz-tech.net
          </a>
          <div class="social-links">
            <a v-for="link in socialLinks" :key="link.name" 
                :href="link.url" 
                class="social-link" 
                target="_blank">
              <component :is="link.icon" :size="20" />
              {{ link.name }}
            </a>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<script>
import { BrandTwitterIcon, BrandGithubIcon, BookIcon, MailIcon } from 'vue-tabler-icons'

export default {
  name: 'Main',
  components: {
    BrandTwitterIcon,
    BrandGithubIcon,
    BookIcon,
    MailIcon
  },
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
          icon: 'BrandTwitterIcon'
        },
        { 
          name: 'GitHub', 
          url: 'https://github.com/kurazuuuuuu/', 
          icon: 'BrandGithubIcon'
        },
        {
          name: 'Zenn',
          url: 'https://zenn.dev/krz_tech',
          icon: 'BookIcon'
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

.contact-email {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.3rem;
  font-weight: 600;
  color: #2d5a2d;
  text-decoration: none;
  padding: 1rem 2rem;
  margin-bottom: 2rem;
  background: #d4f1d4;
  border: 3px solid #7db87d;
  box-shadow: 3px 3px 0 #a8e6a3;
  transition: all 0.3s ease;
}

.contact-email:hover {
  background: #a8e6a3;
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0 #7db87d;
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
