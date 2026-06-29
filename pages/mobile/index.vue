<script lang="ts" setup>

</script>

<template>
  <LayoutMobile>
    <div class="mobile-home">
      <Menu />
      <ClientOnly>
        <div class="mobile-home__playground">
          <D3Color />
        </div>
      </ClientOnly>
    </div>
  </LayoutMobile>
</template>

<style scoped>
.mobile-home {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  min-height: 100%;
}

.mobile-home__playground {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  flex: 1 1 auto;
  min-height: clamp(10rem, 42dvh, 18rem);
  max-height: clamp(12rem, 50dvh, 22rem);
}
</style>
