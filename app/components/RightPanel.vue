<template>
  <main class="right-panel">
    <slot />
  </main>
</template>

<script setup lang="ts">
</script>

<style scoped>
.right-panel {
  flex: 1;
  height: calc(100vh - 72px);
  overflow-y: auto;
  padding: 32px 28px;
}

.right-panel::-webkit-scrollbar {
  width: 4px;
}

.right-panel::-webkit-scrollbar-track {
  background: transparent;
}

.right-panel::-webkit-scrollbar-thumb {
  background: var(--dusty-petal);
  border-radius: 2px;
}

.right-panel::-webkit-scrollbar-thumb:hover {
  background: var(--rosewood);
}

@media (max-width: 768px) {
  .right-panel {
    height: auto;
    overflow-y: visible;
  }
}
</style>