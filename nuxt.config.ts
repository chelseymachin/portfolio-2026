// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  nitro: {
    preset: 'static',
    prerender: {
      crawlLinks: true,
      routes: ['/']
    }
  },
  routeRules: {
    '/posts/**': { prerender: true }
  },
  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }
      ]
    }
  },
  css: ['~/assets/css/global.css'],
  modules: ['@nuxt/content', '@nuxtjs/google-fonts', '@nuxt/icon'],
  googleFonts: {
    families: {
      "Gothic A1": {
        wght: [400, 500, 600, 700],
        ital: [400, 500, 600, 700],
      },
      "Playfair Display": {
        wght: [400, 500, 600, 700],
        ital: [400, 500, 600, 700],
      },
    }
  }
})