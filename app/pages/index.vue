<template>
  <div v-if="currentView === 'work'" class="work-layout">
    <div class="work-bg">
      <LeftPanel>
        <div class="left-content">
          <h1 class="name">Chelsey<br /><em>Machin</em></h1>
          <p class="eyelash">Software Engineer</p>
          <p class="bio">
            Building thoughtful, high-quality software with a genuine love for
            craft. Currently working on a handful of side projects
            that refuse to stay small.
          </p>

          <div class="exp-section">
            <p class="section-label">Current Role</p>
            <div class="exp-item">
              <span class="exp-title">Software Developer II</span>
              <div class="exp-meta">
                <span>Burkhart Dental</span>
                <span>2024 – Present</span>
              </div>
            </div>
          </div>

          <div class="stack-section">
            <p class="section-label">Stack</p>
            <div class="tags">
              <span class="tag">Vue</span>
              <span class="tag">React</span>
              <span class="tag">Angular</span>
              <span class="tag">C# / .NET</span>
              <span class="tag">Python</span>
              <span class="tag">Go</span>
              <span class="tag">TypeScript</span>
              <span class="tag">JavaScript</span>
              <span class="tag">AWS</span>
            </div>
          </div>

          <a class="resume-btn" href="/resume.pdf" target="_blank">
            ↓ Download Resume
          </a>
        </div>
      </LeftPanel>

      <RightPanel>
        <div class="right-content">
          <div class="section-header">
            <h2 class="section-title">Selected Projects</h2>
            <p class="section-sub">A few things I've built that I'm proud of</p>
          </div>
          <p class="placeholder">Project cards coming soon</p>
        </div>
      </RightPanel>
    </div>
  </div>

  <div v-else class="quests-layout">
    <div class="quests-header">
      <h1 class="quests-title">Side <em>Quests</em></h1>
      <p class="quests-sub">
        Writing about the projects I'm building, the problems I'm solving, and the dreams keeping me up at night.
      </p>
    </div>

    <div v-if="posts && posts.length > 0" class="blog-grid">
      <BlogCard
        v-for="post in posts"
        :key="post.stem"
        :post="post"
      />
    </div>
    <p v-else class="placeholder">No posts yet.</p>
  </div>
</template>

<script setup lang="ts">
import { useView } from '~/composables/useView'

const { currentView } = useView()

const { data: posts } = await useAsyncData('posts', () =>
  queryCollection('posts')
    .order('date', 'DESC')
    .all()
)

if (posts.value) {
  prerenderRoutes(posts.value.map(post => post.path))
}

</script>

<style scoped>
.work-layout {
  display: flex;
  min-height: calc(100vh - 72px);
}

.work-bg {
  display: flex;
  width: 100%;
}

.left-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.eyelash {
  font-family: 'Gothic A1', sans-serif;
  font-size: 10px;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  color: var(--mauve);
  margin-bottom: 12px;
}

.name {
  font-family: 'Playfair Display', serif;
  font-size: 48px;
  font-weight: 400;
  line-height: 1.05;
  color: var(--rosewood);
  margin-bottom: 6px;
}

.name em {
  font-style: italic;
  color: var(--dusty-petal);
}

.bio {
  font-family: 'Gothic A1', sans-serif;
  font-size: 13px;
  font-weight: 300;
  color: var(--rosewood);
  line-height: 1.8;
  margin-bottom: 28px;
}

.section-label {
  font-family: 'Gothic A1', sans-serif;
  font-size: 9px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--dusty-petal);
  padding-bottom: 6px;
  border-bottom: 1px solid var(--dusty-petal);
  margin-bottom: 12px;
}

.exp-section {
  margin-bottom: 24px;
}

.exp-item {
  margin-bottom: 12px;
}

.exp-title {
  font-family: 'Gothic A1', sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: var(--rosewood);
  display: block;
  margin-bottom: 2px;
}

.exp-meta {
  display: flex;
  justify-content: space-between;
  font-family: 'Gothic A1', sans-serif;
  font-size: 11px;
  color: var(--mauve);
}

.stack-section {
  margin-bottom: 28px;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  font-family: 'Gothic A1', sans-serif;
  font-size: 10px;
  padding: 4px 10px;
  border-radius: 12px;
  background: rgba(212, 134, 154, 0.12);
  color: var(--rosewood);
  border: 0.5px solid rgba(212, 134, 154, 0.3);
}

.resume-btn {
  display: inline-flex;
  align-items: center;
  margin-top: auto;
  align-self: flex-start;
  padding: 10px 22px;
  border-radius: 24px;
  border: 1.5px solid var(--dusty-petal);
  font-family: 'Playfair Display', serif;
  font-size: 13px;
  font-style: italic;
  color: var(--rosewood);
  background: rgba(255, 255, 255, 0.6);
  text-decoration: none;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.resume-btn:hover {
  background: var(--dusty-petal);
  color: var(--cream);
}

.right-content {
  max-width: 680px;
}

.section-header {
  margin-bottom: 24px;
}

.section-title {
  font-family: 'Playfair Display', serif;
  font-size: 26px;
  font-weight: 400;
  color: var(--rosewood);
  margin-bottom: 4px;
}

.section-sub {
  font-family: 'Gothic A1', sans-serif;
  font-size: 12px;
  color: var(--mauve);
}

.quests-layout {
  max-width: 900px;
  margin: 0 auto;
  padding: 48px 28px;
}

.quests-header {
  margin-bottom: 40px;
}

.quests-title {
  font-family: 'Playfair Display', serif;
  font-size: 52px;
  font-weight: 400;
  color: var(--cream);
  line-height: 1.05;
  margin-bottom: 10px;
}

.quests-title em {
  font-style: italic;
  color: rgba(255, 255, 255, 0.75);
}

.quests-sub {
  font-family: 'Gothic A1', sans-serif;
  font-size: 14px;
  font-weight: 300;
  color: rgba(255, 255, 255, 0.65);
  line-height: 1.8;
  max-width: 520px;
}

.blog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.placeholder {
  font-family: 'Gothic A1', sans-serif;
  font-size: 12px;
  color: var(--mauve);
  font-style: italic;
}

@media (max-width: 768px) {
  .work-layout {
    display: block;
  }

  .work-bg {
    display: block;
  }

  .quests-layout {
    padding: 32px 16px;
  }

  .name {
    font-size: 36px;
  }

  .quests-title {
    font-size: 38px;
  }

  .blog-grid {
    grid-template-columns: 1fr;
  }
}
</style>