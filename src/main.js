import { createApp } from 'vue'
import Particles from "@tsparticles/vue3";
import { loadSlim } from "@tsparticles/slim";
import App from './App.vue'

createApp(App).use(Particles, {
  init: async engine => {
    await loadSlim(engine);
  },
}).mount('#app')