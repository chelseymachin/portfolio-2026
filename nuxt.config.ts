// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  nitro: {
    preset: 'static'
  },
  modules: ['@nuxt/content', '@nuxtjs/google-fonts'],
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