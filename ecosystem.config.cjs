module.exports = {
  apps: [
    {
      name: 'csc3fun',
      script: './.output/server/index.mjs',
      port: 3000,
      cwd: '/root/mycode/csc3.fun',
      env: {
        COMMON_VARIABLE: 'true',
        VERSION: '1.0.0',
        NUXT_APP_ENV: 'dev',
      },
      env_production: {
        NODE_ENV: 'production',
        NUXT_APP_ENV: 'pro',
        VERSION: '1.0.0',
      },
    },
  ],
}
