<template>
  <div class="layout" :class="{ 'layout--quests': isQuests, 'layout--work': !isQuests }">
    <AppNav />
    <div class="body-wrapper" :class="{ 'body-wrapper--quests': isQuests }">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useView } from '~/composables/useView'

const { currentView } = useView()
const isQuests = computed(() => currentView.value === 'quests')
</script>

<style>
.layout {
  min-height: 100vh;
  background-image: url('/gingham.png');
  background-repeat: repeat;
  background-size: 80px 80px;
  transition: background 0.4s ease;
}

.layout--work {
  background-image: none;
  background-color: var(--blush-lighter);
  backdrop-filter: blur(4px);
}

.layout--quests {
  background-image: none;
  background-color: var(--quest-pink-lighter);
  backdrop-filter: blur(4px);
}

.body-wrapper {
  display: flex;
}

.body-wrapper--quests {
  display: block;
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 28px;
}

@media (max-width: 768px) {
  .body-wrapper {
    display: block;
  }

  .body-wrapper--quests {
    padding: 24px 16px;
  }
}
</style>