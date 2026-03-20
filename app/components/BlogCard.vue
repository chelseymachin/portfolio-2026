<template>
  <a
    class="blog-card"
    :href="post.path"
    target="_blank"
    rel="noopener noreferrer"
  >
    <div class="card-thumbnail">
      <img
        v-if="post.thumbnail"
        :src="post.thumbnail"
        :alt="post.title"
        class="thumbnail-img"
      />
      <div v-else class="thumbnail-placeholder">
        <span class="placeholder-label">{{ firstTag }}</span>
      </div>
    </div>

    <div class="card-body">
      <div class="card-meta">
        <span class="card-date">{{ formattedDate }}</span>
        <div class="card-tags">
          <span v-for="tag in post.tags" :key="tag" class="card-tag">
            {{ tag }}
          </span>
        </div>
      </div>

      <h2 class="card-title">{{ post.title }}</h2>
      <p class="card-excerpt">{{ post.excerpt }}</p>

      <span class="card-cta">Read post ↗</span>
    </div>
  </a>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  post: {
    title: string
    date: string
    excerpt: string
    tags: string[]
    thumbnail?: string
    _path?: string
  }
}>()

const formattedDate = computed(() => {
  return new Date(props.post.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
})

const firstTag = computed(() => props.post.tags?.[0] ?? 'Post')
</script>

<style scoped>
.blog-card {
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.22);
  border: 0.5px solid rgba(255, 255, 255, 0.35);
  border-radius: 14px;
  overflow: hidden;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.2s ease;
}

.blog-card:hover {
  background: rgba(255, 255, 255, 0.32);
  transform: translateY(-2px);
}

.card-thumbnail {
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  flex-shrink: 0;
}

.thumbnail-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.3s ease;
}

.blog-card:hover .thumbnail-img {
  transform: scale(1.03);
}

.thumbnail-placeholder {
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-label {
  font-family: 'Playfair Display', serif;
  font-size: 14px;
  font-style: italic;
  color: rgba(255, 255, 255, 0.45);
  letter-spacing: 1px;
}

.card-body {
  display: flex;
  flex-direction: column;
  padding: 18px 20px 20px;
  flex: 1;
}

.card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  gap: 8px;
  flex-wrap: wrap;
}

.card-date {
  font-family: 'Gothic A1', sans-serif;
  font-size: 10px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
  white-space: nowrap;
}

.card-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.card-tag {
  font-family: 'Gothic A1', sans-serif;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.7);
  border: 0.5px solid rgba(255, 255, 255, 0.2);
}

.card-title {
  font-family: 'Playfair Display', serif;
  font-size: 18px;
  font-weight: 400;
  color: #fff;
  line-height: 1.3;
  margin-bottom: 8px;
}

.card-excerpt {
  font-family: 'Gothic A1', sans-serif;
  font-size: 12px;
  font-weight: 300;
  color: rgba(255, 255, 255, 0.62);
  line-height: 1.75;
  flex: 1;
  margin-bottom: 16px;
}

.card-cta {
  font-family: 'Gothic A1', sans-serif;
  font-size: 11px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.45);
  align-self: flex-end;
  transition: color 0.2s ease;
}

.blog-card:hover .card-cta {
  color: rgba(255, 255, 255, 0.85);
}
</style>