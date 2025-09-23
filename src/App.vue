<template>
  <div id="app">
    <IntroAnimation />
    <Header />
    <Main />
    <Footer />
  </div>
</template>

<script>
import IntroAnimation from './components/IntroAnimation.vue'
import Header from './components/Header.vue'
import Main from './components/Main.vue'
import Footer from './components/Footer.vue'

export default {
  name: 'App',
  components: {
    IntroAnimation,
    Header,
    Main,
    Footer
  }
}
</script>

<style>
body {
  font-family: Meiryo, sans-serif;
  background-image: url('/img/vrc_background.webp');
  background-repeat: no-repeat;
  background-size: cover;
  background-position: center center;
  background-attachment: fixed;
  background-color: rgba(255, 255, 255, 0.6);
  background-blend-mode: lighten;
  margin: 0;
}
</style>