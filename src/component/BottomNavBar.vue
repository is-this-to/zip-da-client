<script setup>
defineProps({
  items: {
    type: Array,
    default: () => [
      { to: '/main', label: '홈', icon: '⌂' },
      { to: '/properties/search', label: '검색', icon: '⌕' },
      { to: '/properties', label: '매물', icon: '▣' },
      { to: '/bookmarks', label: '찜', icon: '♡' },
      { to: '/members/me', label: '마이', icon: '♙' },
    ],
  },
})
</script>

<template>
  <nav class="bottom-nav" aria-label="기본 바로가기">
    <RouterLink
      v-for="item in items"
      :key="item.to"
      class="bottom-nav__item"
      :to="item.to"
    >
      <span class="bottom-nav__icon" aria-hidden="true">{{ item.icon }}</span>
      <span>{{ item.label }}</span>
    </RouterLink>
  </nav>
</template>
