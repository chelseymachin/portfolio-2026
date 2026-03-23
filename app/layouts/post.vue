<template>
  <div class="post-layout">
    <header class="post-nav">
      <NuxtLink to="/" class="back-btn" @click="goToQuests">
        ← Back to Side Quests
      </NuxtLink>
    </header>
    <main class="post-main">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useView } from '~/composables/useView'

const { setView } = useView()

function goToQuests() {
  setView('quests')
}
</script>

<style scoped>
.post-layout {
  min-height: 100vh;
  background-color: var(--blush);
  width: 75%;
  margin: 0 auto;
}

.post-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  padding: 0 40px;
  height: 56px;
  display: flex;
  align-items: center;
  background-color: rgba(250, 223, 232, 0.88);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--dusty-petal);
}

.back-btn {
  font-family: 'Gothic A1', sans-serif;
  font-size: 12px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--mauve);
  text-decoration: none;
  transition: color 0.2s ease;
}

.back-btn:hover {
  color: var(--rosewood);
}

.post-main {
  max-width: 680px;
  margin: 0 auto;
  padding: 56px 40px 96px;
}

@media (max-width: 768px) {
  .post-nav {
    padding: 0 20px;
  }

  .post-main {
    padding: 40px 20px 64px;
  }
}

@media (min-width: 1850px) {
  .post-layout {
    width: 60%;
  }
}
</style>