<template>
  <div class="dancing-text" aria-label="text">
    <span 
      v-for="(char, index) in characters" 
      :key="index" 
      class="char"
      :style="{ animationDelay: `${index * 0.05}s` }"
    >
      {{ char === ' ' ? '&nbsp;' : char }}
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  text: {
    type: String,
    required: true
  }
})

const characters = computed(() => {
  return props.text.split('')
})
</script>

<style scoped>
.dancing-text {
  display: inline-block;
  cursor: default;
}

.char {
  display: inline-block;
  transition: transform 0.6s ease;
}

.dancing-text:hover .char {
  animation: dance 1.2s ease infinite;
}

@keyframes dance {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}
</style>
