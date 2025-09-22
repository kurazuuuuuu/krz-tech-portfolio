<template>
  <main>
    <div class="container">
      <div class="profile">
        <img class="profile-icon" src="/img/icon.webp" alt="">
        <div class="profile-text">
          <h1>{{ profile.name }}</h1>
          <p>{{ profile.description }}</p>
          <ul>
            <li v-for="skill in profile.skills" :key="skill">{{ skill }}</li>
          </ul>
        </div>
      </div>
      <div class="profile-link">
        <ul>
          <li v-for="link in socialLinks" :key="link.name">
            <a :href="link.url">
              <span :class="link.icon"> {{ link.name }}</span>
            </a>
          </li>
        </ul>
      </div>
      <div class="border"></div>
    </div>
  </main>
</template>

<script>
export default {
  name: 'Main',
  data() {
    return {
      profile: {
        name: 'くらず / kurazu',
        description: '~/プログラミング初学者',
        skills: ['Python', 'JavaScript', 'HTML&CSS']
      },
      socialLinks: [
        { name: 'Twitter', url: 'https://twitter.com/kurazu_vrc', icon: 'fa fa-twitter' },
        { name: 'Github', url: 'https://github.com/kurazuuuuuu/', icon: 'fa fa-github' }
      ]
    }
  }
}
</script>

<style scoped>
.border {
  border-bottom: 1px solid #918b8b;
  margin: 45px 16px;
}

.profile-link ul {
  list-style: none;
  display: flex;
  justify-content: center;
  gap: 20px;
  padding: 0;
  margin: 0;
}

.profile {
  max-width: 100%;
  width: 50%;
  padding: 0 16px;
  margin: 0 auto 50px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  box-sizing: border-box;
  background-color: rgba(255, 255, 255, 0.6);
  border-radius: 30px 20px;
}

.profile-text {
  width: 100%;
  max-width: 400px;
  font-size: 15px;
}

.profile-text ul {
  padding-left: 20px;
  margin-bottom: 10px;
}

.profile-text li {
  text-align: center;
  list-style: none;
  margin-bottom: 2px;
}

.profile-icon {
  margin: 25px;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.profile-icon:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.profile-link a {
  color: #333;
  font-size: 16px;
  text-decoration: none;
  transition: all 0.3s ease;
}

.profile-link a:hover {
  color: #596458;
  transform: scale(1.1);
}
</style>