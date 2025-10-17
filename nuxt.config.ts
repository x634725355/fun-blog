// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  modules: ['@pinia/nuxt', '@nuxt/ui', '@vueuse/nuxt', "nitro-cloudflare-dev"],
  devtools: { enabled: true },

  devServer: {
    port: 7777,
  },

  css: ['~/assets/css/main.css'],
  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    layoutTransition: { name: 'slide', mode: 'out-in' },
  },
  vite: {
    plugins: [tailwindcss()],
  },
  runtimeConfig: {
    public: {
      APP_ENV: process.env.NUXT_APP_ENV || 'dev',
    },
  },
  sourcemap: false,
})
