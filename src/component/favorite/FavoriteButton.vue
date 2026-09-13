<script setup>
import { ref, watch } from 'vue'

import IconButton from '../button/IconButton.vue'
import HeartIcon from '../icon/HeartIcon.vue'
import { useFavoriteStore } from '../../store/favorite/useFavoriteStore.js'

const props = defineProps({
  propertyId: {
    type: [Number, String],
    required: true,
  },

  initialFavorite: {
    type: Boolean,
    default: false,
  },

  appearance: {
    type: String,
    default: 'default',
    validator: (value) => [
      'default',
      'overlay',
    ].includes(value),
  },
})

const emit = defineEmits([
  'update:favorite',
  'change',
])

const favoriteStore = useFavoriteStore()
const isFavorite = ref(props.initialFavorite)

watch(
  () => props.initialFavorite,
  (value) => {
    isFavorite.value = value
  },
)

const handleFavoriteClick = async () => {
  try {
    const targetFavorite = !isFavorite.value

    const result = await favoriteStore.toggleFavorite(
      String(props.propertyId),
      targetFavorite,
    )

    if (typeof result?.favorite === 'boolean') {
      isFavorite.value = result.favorite
    } else {
      isFavorite.value = targetFavorite
    }

    emit(
      'update:favorite',
      isFavorite.value,
    )

    emit('change', {
      favorite: isFavorite.value,
      result,
    })
  } catch (error) {
    console.error(error)
  }
}
</script>

<template>
  <span
    class="favorite-button"
    :class="`favorite-button--${appearance}`"
  >
    <IconButton
      :label="isFavorite ? '찜 해제' : '찜하기'"
      :pressed="isFavorite"
      :loading="favoriteStore.isFavoriteLoading"
      @click="handleFavoriteClick"
    >
      <HeartIcon
        :filled="isFavorite"
        class="favorite-heart"
      />
    </IconButton>
  </span>
</template>

<style scoped>
.favorite-button {
  display: inline-flex;
}

.favorite-heart {
  width: 20px;
  height: 20px;
  color: #d93b32;
}

.favorite-button--overlay :deep(.icon-button) {
  width: 36px;
  height: 36px;
  background: rgb(250 249 244 / 80%);
  border: 0;
  border-radius: 14px;
  backdrop-filter: blur(2px);
}

.favorite-button--overlay :deep(.icon-button--pressed) {
  color: #d93b32;
  background: rgb(250 249 244 / 88%);
}
</style>
