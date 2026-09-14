<script setup>
defineProps({
  filled: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <svg
    class="heart-icon"
    viewBox="0 0 24 22"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M12 20.25C11.7 20.25 11.4 20.15 11.15 19.95C3.8 13.75 1.5 11.25 1.5 7.25C1.5 4 4.05 1.5 7.25 1.5C9.05 1.5 10.75 2.35 12 3.7C13.25 2.35 14.95 1.5 16.75 1.5C19.95 1.5 22.5 4 22.5 7.25C22.5 11.25 20.2 13.75 12.85 19.95C12.6 20.15 12.3 20.25 12 20.25Z"
      :fill="filled ? 'currentColor' : 'none'"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>

<style scoped>
.heart-icon {
  display: block;
  width: 20px;
  height: 18.35px;
}
</style>
