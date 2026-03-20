import { defineCollection, defineContentConfig, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    posts: defineCollection({
      type: 'page',
      source: 'posts/*.md',
      schema: z.object({
        title: z.string(),
        date: z.string(),
        excerpt: z.string(),
        tags: z.array(z.string()),
        thumbnail: z.string().optional(),
      }),
    }),
  },
})