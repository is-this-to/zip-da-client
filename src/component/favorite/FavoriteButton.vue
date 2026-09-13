<script setup>
import { ref, watch } from 'vue'

import IconButton from '../button/IconButton.vue'
import HeartIcon from '../icon/HeartIcon.vue'
import { useFavoriteStore } from '../../store/favorite/useFavoriteStore.js'

const props = defineProps({
  /**
   * 찜할 매물 ID
   */
  propertyId: {
    type: [Number, String],
    required: true,
  },

  /**
   * 최초 찜 여부
   */
  initialFavorite: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'update:favorite',
  'change',
])

const favoriteStore = useFavoriteStore()

/**
 * 현재 화면에 표시할 찜 상태
 */
const isFavorite = ref(props.initialFavorite)

/**
 * 부모에서 찜 상태가 변경되면
 * 버튼 상태도 동기화한다.
 */
watch(
  () => props.initialFavorite,
  (value) => {
    isFavorite.value = value
  },
)

/**
 * 찜 등록/해제
 */
const handleFavoriteClick = async () => {
  try {
    const result = await favoriteStore.toggleFavorite(
      props.propertyId,
    )

    /**
     * 백엔드가 최종 찜 상태를 반환하면
     * 서버 결과를 기준으로 화면 상태를 변경한다.
     */
    if (typeof result?.favorite === 'boolean') {
      isFavorite.value = result.favorite
    } else {
      isFavorite.value = !isFavorite.value
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
</template>

<style scoped>
.favorite-heart {
  color: #d93b32;
}
</style>
