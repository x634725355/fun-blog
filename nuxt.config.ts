// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  modules: ['@pinia/nuxt', '@nuxt/ui', '@vueuse/nuxt', "nitro-cloudflare-dev"],
  devtools: { enabled: true },

  devServer: {
    port: 7777,
  },

  css: ['~/assets/css/main.css'],

  nitro: {
    preset: "cloudflare_module",

    cloudflare: {
      deployConfig: true,
      nodeCompat: true
    }
  },
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
  compatibilityDate: '2024-07-03',
})
