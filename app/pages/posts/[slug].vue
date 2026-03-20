<template>
  <article v-if="post" class="post-article">
    <div v-if="post.thumbnail" class="post-hero">
      <img
        :src="post.thumbnail"
        :alt="post.title"
        class="hero-img"
      />
    </div>

    <div class="post-header">
      <div class="post-meta">
        <span class="post-date">{{ formattedDate }}</span>
        <div class="post-tags">
          <span v-for="tag in post.tags" :key="tag" class="post-tag">
            {{ tag }}
          </span>
        </div>
      </div>
      <h1 class="post-title">{{ post.title }}</h1>
      <p class="post-excerpt">{{ post.excerpt }}</p>
    </div>

    <div class="post-divider" />

    <div class="prose">
      <ContentRenderer :value="post" />
    </div>
  </article>

  <div v-else class="post-not-found">
    <p>Post not found.</p>
    <NuxtLink to="/">← Back</NuxtLink>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

definePageMeta({
  layout: 'post',
})

const slug = useRoute().params.slug as string

const { data: post } = await useAsyncData(`post-${slug}`, () =>
  queryCollection('posts')
    .where('path', '=', `/posts/${slug}`)
    .first()
)

const formattedDate = computed(() => {
  if (!post.value?.date) return ''
  return new Date(post.value.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
})
</script>

<style scoped>
.post-hero {
  width: 100%;
  max-height: 360px;
  overflow: hidden;
  border-radius: 12px;
  margin-bottom: 36px;
}

.hero-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.post-header {
  margin-bottom: 32px;
}

.post-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.post-date {
  font-family: 'Gothic A1', sans-serif;
  font-size: 10px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--mauve);
}

.post-tags {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

.post-tag {
  font-family: 'Gothic A1', sans-serif;
  font-size: 10px;
  padding: 3px 9px;
  border-radius: 12px;
  background: rgba(212, 134, 154, 0.12);
  color: var(--rosewood);
  border: 0.5px solid rgba(212, 134, 154, 0.3);
}

.post-title {
  font-family: 'Playfair Display', serif;
  font-size: 42px;
  font-weight: 400;
  color: var(--rosewood);
  line-height: 1.1;
  margin-bottom: 14px;
}

.post-excerpt {
  font-family: 'Gothic A1', sans-serif;
  font-size: 15px;
  font-weight: 300;
  color: var(--mauve);
  line-height: 1.8;
  font-style: italic;
}

.post-divider {
  height: 1px;
  background: var(--dusty-petal);
  margin-bottom: 40px;
  opacity: 0.4;
}

.prose :deep(h2) {
  font-family: 'Playfair Display', serif;
  font-size: 26px;
  font-weight: 400;
  color: var(--rosewood);
  margin: 2.5rem 0 1rem;
  line-height: 1.2;
}

.prose :deep(h3) {
  font-family: 'Playfair Display', serif;
  font-size: 20px;
  font-weight: 400;
  font-style: italic;
  color: var(--rosewood);
  margin: 2rem 0 0.75rem;
}

.prose :deep(p) {
  font-family: 'Gothic A1', sans-serif;
  font-size: 15px;
  font-weight: 300;
  color: var(--rosewood);
  line-height: 1.9;
  margin-bottom: 1.25rem;
}

.prose :deep(strong) {
  font-weight: 600;
  color: var(--rosewood);
}

.prose :deep(em) {
  font-style: italic;
  color: var(--dusty-petal);
}

.prose :deep(a) {
  color: var(--dusty-petal);
  text-decoration: underline;
  text-underline-offset: 3px;
  transition: color 0.2s ease;
}

.prose :deep(a:hover) {
  color: var(--rosewood);
}

.prose :deep(hr) {
  border: none;
  border-top: 1px solid var(--dusty-petal);
  opacity: 0.3;
  margin: 2.5rem 0;
}

.prose :deep(ul) {
  list-style: none;
  padding: 0;
  margin-bottom: 1.25rem;
}

.prose :deep(ul li) {
  font-family: 'Gothic A1', sans-serif;
  font-size: 15px;
  font-weight: 300;
  color: var(--rosewood);
  line-height: 1.9;
  padding-left: 1.25rem;
  position: relative;
  margin-bottom: 0.4rem;
}

.prose :deep(ul li::before) {
  content: '✦';
  position: absolute;
  left: 0;
  font-size: 8px;
  color: var(--dusty-petal);
  top: 6px;
}

.prose :deep(pre) {
  background: rgba(92, 58, 58, 0.06);
  border: 0.5px solid rgba(212, 134, 154, 0.25);
  border-radius: 8px;
  padding: 20px 24px;
  overflow-x: auto;
  margin: 1.5rem 0;
}

.prose :deep(pre code) {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 13px;
  color: var(--rosewood);
  background: none;
  padding: 0;
  border: none;
  line-height: 1.7;
}

.prose :deep(code) {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 12px;
  background: rgba(212, 134, 154, 0.12);
  color: var(--rosewood);
  padding: 2px 6px;
  border-radius: 4px;
  border: 0.5px solid rgba(212, 134, 154, 0.2);
}

.prose :deep(table) {
  width: 100%;
  border-collapse: collapse;
  font-family: 'Gothic A1', sans-serif;
  font-size: 13px;
  margin: 1.5rem 0;
}

.prose :deep(th) {
  text-align: left;
  font-weight: 500;
  color: var(--rosewood);
  border-bottom: 1px solid var(--dusty-petal);
  padding: 6px 12px 8px 0;
  letter-spacing: 0.5px;
}

.prose :deep(td) {
  color: var(--mauve);
  padding: 7px 12px 7px 0;
  border-bottom: 1px solid rgba(212, 134, 154, 0.15);
}

.post-not-found {
  font-family: 'Gothic A1', sans-serif;
  font-size: 14px;
  color: var(--mauve);
  padding: 60px 40px;
  text-align: center;
}

@media (max-width: 768px) {
  .post-title {
    font-size: 30px;
  }
}
</style>