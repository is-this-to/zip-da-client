<script setup>
defineProps({
  items: {
    type: Array,
    default: () => [
      { to: "/main", label: "홈", icon: "/icon/main/nav-home.svg" },
      { to: "/properties/search", label: "검색", icon: "/icon/main/nav-search.svg" },
      { to: "/favorites", label: "찜", icon: "/icon/main/nav-favorite.svg" },
      { to: "/members/me", label: "마이페이지", icon: "/icon/main/nav-mypage.svg" },
    ],
  },
});
</script>

<template>
  <nav class="floating-bottom-nav" aria-label="기본 바로가기">
    <RouterLink
      v-for="item in items"
      :key="`${item.to}-${item.label}`"
      class="floating-bottom-nav__item"
      :to="item.to"
      :aria-label="item.label"
    >
      <span class="floating-bottom-nav__icon-box" aria-hidden="true">
        <img
          class="floating-bottom-nav__icon"
          :src="item.icon"
          alt=""
        />
      </span>
      <span class="visually-hidden">{{ item.label }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.floating-bottom-nav {
  position: fixed;
  right: 0;
  bottom: calc(16px + env(safe-area-inset-bottom));
  left: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: calc(100% - 16px);
  max-width: 328px;
  height: 64px;
  margin: 0 auto;
  padding: 8px 23px;
  background: #ffffff;
  border-radius: 24px;
  box-shadow: 0 4px 6px rgb(0 0 0 / 17%);
}

.floating-bottom-nav__item {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  color: #45483e;
  border-radius: 50%;
}

.floating-bottom-nav__icon-box {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
}

.floating-bottom-nav__icon {
  display: block;
  width: 19px;
  height: 19px;
  object-fit: contain;
}

.floating-bottom-nav__item.router-link-exact-active
.floating-bottom-nav__icon-box {
  background: #d7e9c0;
}

.floating-bottom-nav__item:focus-visible {
  outline: none;
}

.floating-bottom-nav__item:focus-visible
.floating-bottom-nav__icon-box {
  box-shadow: var(--zipda-focus-ring);
}

</style>
