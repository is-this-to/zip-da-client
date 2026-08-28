<script setup>
import { computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import BottomNavBar from "./component/BottomNavBar.vue";
import { useMyErrorStore } from "./store/error/useMyErrorStore.js";

const route = useRoute();
const router = useRouter();

const showBottomNav = computed(() => route.meta.showBottomNav === true);
const myErrorStore = useMyErrorStore();

watch(
  // myErrorStore.isError 변경 되는거 지켜보기
  () => myErrorStore.isError,
  // 변경된 isError값을 파라미터로 함수 실행
  (isError) => {
    if (isError && route.path !== "/errors") {
      router.replace("/errors");
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="app-shell">
    <main class="app-main" :class="{ 'app-main--with-bottom-nav': showBottomNav }">
      <router-view></router-view>
    </main>

    <BottomNavBar v-if="showBottomNav" />
  </div>
</template>
