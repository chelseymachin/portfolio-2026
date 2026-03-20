<template>
  <aside class="left-panel">
    <slot />
  </aside>
</template>

<script setup lang="ts">
</script>

<style scoped>
.left-panel {
  width: 38%;
  flex-shrink: 0;
  position: sticky;
  top: 72px;
  height: calc(100vh - 72px);
  overflow: hidden;
  padding: 32px 28px;
  border-right: 1px solid var(--dusty-petal);
}

@media (max-width: 768px) {
  .left-panel {
    width: 100%;
    position: static;
    height: auto;
    overflow: visible;
    border-right: none;
    border-bottom: 1px solid var(--dusty-petal);
  }
}
</style>