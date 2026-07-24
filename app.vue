<script lang="ts" setup>
</script>

<template>
  <Head>
    <Meta name="referrer" content="no-referrer" />
    <Link rel="icon" href="/tiger.svg" />
    <Link rel="preconnect" href="https://fonts.googleapis.com" />
    <Link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
    <Link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
    />
  </Head>

  <UApp>
    <NuxtLayout>
      <NuxtLoadingIndicator color="var(--color-accent)" />
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<style></style>
