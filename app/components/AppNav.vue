<template>
  <nav :class="{ 'nav--quests': isQuests }">
    <div class="left-nav">
      <span class="nav-logo-icon">
        <svg width="36" height="36" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
          <circle cx="24" cy="24" r="23" :fill="isQuests ? 'var(--blush)' : 'var(--rose)'"/>
          <text x="24" y="31" text-anchor="middle" font-family="'Playfair Display', Georgia, serif" font-size="16" font-weight="700" :fill="'var(--rosewood)'" letter-spacing="0.5">CM</text>
        </svg>
      </span>
      <span class="nav-name">Chelsey Machin</span>
    </div>

    <div class="center-nav">
      <button
        class="tab-btn"
        :class="{ 'tab-btn--active': currentView === 'work' }"
        @click="setView('work')"
      >
        <Icon name="fluent-emoji-high-contrast:briefcase" class="tab-icon" />
        <span v-show="currentView === 'work'" class="tab-label">Work</span>
      </button>
      <button
        class="tab-btn"
        :class="{ 'tab-btn--active': currentView === 'quests' }"
        @click="setView('quests')"
      >
        <Icon name="fluent-emoji-high-contrast:alien" class="tab-icon" />
        <span v-show="currentView === 'quests'" class="tab-label">Side Quests</span>
      </button>
    </div>

    <div class="right-nav">
      <ul>
        <li><a href="https://www.linkedin.com/in/chelseymachin/" target="_blank">LinkedIn</a></li>
        <li><a href="https://resume.url" target="_blank">Resume</a></li>
        <li><a href="mailto:your@email.com">Contact</a></li>
      </ul>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useView } from '~/composables/useView'

const { currentView, setView } = useView()

const isQuests = computed(() => currentView.value === 'quests')

let lastScrollY = 0

onMounted(() => {
  const nav = document.querySelector('nav') as HTMLElement
  window.addEventListener('scroll', () => {
    const current = window.scrollY
    if (current > lastScrollY && current > 10) {
      nav.style.transform = 'translateY(-100%)'
    } else {
      nav.style.transform = 'translateY(0)'
    }
    lastScrollY = current
  }, { passive: true })
})
</script>

<style scoped>
nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 100;
  height: 72px;
  padding: 0 20px;
  background-color: var(--blush-lighter);
  backdrop-filter: blur(12px);
  transition: transform 0.3s ease, background-color 0.4s ease, border-color 0.4s ease;
}

nav.nav--quests {
  background-color: var(--quest-pink-lighter);
}

.left-nav {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-logo-icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.nav-name {
  font-family: 'Playfair Display', serif;
  font-size: 24px;
  font-style: italic;
  color: var(--rosewood);
  transition: color 0.4s ease;
}

nav.nav--quests .nav-name {
  color: var(--cream);
}

.center-nav {
  display: flex;
  gap: 3px;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 24px;
  padding: 3px;
  transition: background-color 0.4s ease;
}

nav.nav--quests .center-nav {
  background: rgba(255, 255, 255, 0.2);
}

.tab-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 5px 13px;
  border-radius: 20px;
  border: none;
  font-family: 'Gothic A1', sans-serif;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.6px;
  cursor: pointer;
  background: transparent;
  color: var(--rosewood);
  transition: background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, padding 0.2s ease;
}

nav.nav--quests .tab-btn {
  color: rgba(255, 255, 255, 0.65);
}

.tab-btn--active {
  background: var(--cream);
  color: var(--rosewood);
  box-shadow: 0 1px 4px rgba(92, 58, 58, 0.15);
}

nav.nav--quests .tab-btn--active {
  background: rgba(255, 255, 255, 0.9);
  color: var(--rosewood);
}

.tab-icon {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
  display: block;
}

.tab-label {
  display: block;
  white-space: nowrap;
  overflow: hidden;
}

.right-nav ul {
  display: flex;
  list-style: none;
  gap: 18px;
  padding-right: 0;
}

.right-nav a {
  font-family: 'Gothic A1', sans-serif;
  font-size: 11px;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: var(--mauve);
  text-decoration: none;
  transition: color 0.3s ease;
}

.right-nav a:hover {
  color: var(--rosewood);
}

nav.nav--quests .right-nav a {
  color: rgba(255, 255, 255, 0.6);
}

nav.nav--quests .right-nav a:hover {
  color: var(--cream);
}
</style>