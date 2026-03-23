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
    <!-- mobile hamburger -->
    <button
      class="hamburger"
      :class="{ 'hamburger--open': menuOpen }"
      @click="menuOpen = !menuOpen"
      aria-label="Menu"
    >
      <span class="bar" />
      <span class="bar" />
      <span class="bar" />
    </button>
    <!-- mobile dropdown -->
    <div class="mobile-menu" :class="{ 'mobile-menu--open': menuOpen }">
      <a href="https://www.linkedin.com/in/chelseymachin/" target="_blank" @click="menuOpen = false">LinkedIn</a>
      <a href="https://resume.url" target="_blank" @click="menuOpen = false">Resume</a>
      <a href="mailto:your@email.com" @click="menuOpen = false">Contact</a>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useView } from '~/composables/useView'

const { currentView, setView } = useView()
const isQuests = computed(() => currentView.value === 'quests')
const menuOpen = ref(false)

let lastScrollY = 0

onMounted(() => {
  const nav = document.querySelector('nav') as HTMLElement
  window.addEventListener('scroll', () => {
    const current = window.scrollY
    if (current > lastScrollY && current > 10) {
      nav.style.transform = 'translateY(-100%)'
      menuOpen.value = false
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
  transition: transform 0.3s ease, background-color 0.4s ease;
}

nav.nav--quests {
  background-color: var(--quest-pink-lighter);
}

.nav-home-link {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  flex-shrink: 0;
}

.left-nav {
  display: flex;
  align-items: center;
  flex-shrink: 0;
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

.nav-home-link:hover .nav-name {
  color: var(--dusty-petal);
}

nav.nav--quests .nav-home-link:hover .nav-name {
  color: rgba(255, 255, 255, 0.8);
}

.center-nav {
  display: flex;
  gap: 3px;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 24px;
  padding: 3px;
  transition: background-color 0.4s ease;
  flex-shrink: 0;
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
  transition: background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
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

/* hamburger — hidden on desktop */
.hamburger {
  display: none;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 5px;
  width: 36px;
  height: 36px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px;
  flex-shrink: 0;
  border-radius: 6px;
  transition: background-color 0.2s ease;
}

.hamburger:hover {
  background: rgba(255, 255, 255, 0.3);
}

.bar {
  display: block;
  width: 20px;
  height: 1.5px;
  background-color: var(--rosewood);
  border-radius: 2px;
  transition: transform 0.25s ease, opacity 0.25s ease;
}

nav.nav--quests .bar {
  background-color: var(--cream);
}

/* X state when open */
.hamburger--open .bar:nth-child(1) {
  transform: translateY(6.5px) rotate(45deg);
}

.hamburger--open .bar:nth-child(2) {
  opacity: 0;
}

.hamburger--open .bar:nth-child(3) {
  transform: translateY(-6.5px) rotate(-45deg);
}

/* mobile dropdown menu */
.mobile-menu {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  flex-direction: column;
  background-color: var(--blush-lighter);
  backdrop-filter: blur(12px);
  border-top: 0.5px solid rgba(212, 134, 154, 0.2);
  padding: 8px 0;
  z-index: 99;
}

nav.nav--quests .mobile-menu {
  background-color: var(--quest-pink-lighter);
  border-top-color: rgba(255, 255, 255, 0.15);
}

.mobile-menu--open {
  display: flex;
}

.mobile-menu a {
  font-family: 'Gothic A1', sans-serif;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--rosewood);
  text-decoration: none;
  padding: 14px 20px;
  border-bottom: 0.5px solid rgba(212, 134, 154, 0.12);
  transition: background-color 0.15s ease, color 0.15s ease;
}

.mobile-menu a:last-child {
  border-bottom: none;
}

.mobile-menu a:hover {
  background: rgba(255, 255, 255, 0.3);
  color: var(--dusty-petal);
}

nav.nav--quests .mobile-menu a {
  color: var(--cream);
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

nav.nav--quests .mobile-menu a:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

/* ── Mobile breakpoint ── */
@media (max-width: 768px) {
  nav {
    height: auto;
    min-height: 60px;
    padding: 10px 14px;
    flex-wrap: wrap;
    overflow: visible;
  }

  .right-nav {
    display: none;
  }

  .hamburger {
    display: flex;
    margin-left: auto;
  }

  .center-nav {
    order: 3;
    width: 100%;
    justify-content: center;
    background: rgba(255, 255, 255, 0.3);
    flex-shrink: 1;
    margin-top: 0.5rem;
  }

  nav.nav--quests .center-nav {
    background: rgba(255, 255, 255, 0.15);
  }

  .tab-btn {
    flex: 1;
    justify-content: center;
    font-size: 12px;
    padding: 6px 10px;
  }

  .nav-name {
    font-size: 18px;
  }

  .nav-logo-icon svg {
    width: 28px;
    height: 28px;
  }
}
</style>