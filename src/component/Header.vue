<script setup>
import { useRouter } from 'vue-router'

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  showBack: {
    type: Boolean,
    default: false,
  },
  backTo: {
    type: [String, Object],
    default: '',
  },
})

const router = useRouter()

const goBack = () => {
  if (props.backTo) {
    router.push(props.backTo)
    return
  }

  router.back()
}
</script>

<template>
  <header class="app-header">
    <button
      v-if="showBack"
      type="button"
      class="app-header__button"
      :aria-label="`${title} 이전 화면으로 이동`"
      @click="goBack"
    >
      <span aria-hidden="true">←</span>
    </button>
    <span v-else class="app-header__side" aria-hidden="true"></span>

    <strong class="app-header__title">{{ title }}</strong>

    <span class="app-header__side">
      <slot name="action"></slot>
    </span>
  </header>
</template>
