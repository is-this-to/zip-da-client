<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import FavoriteButton from './FavoriteButton.vue'
import { formatPropertyPrice } from '../../util/property/formatPropertyPrice.js'
import { toPropertyDetailLocation } from '../../route/propertyDetailLocation.js'

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits([
  'favorite-change',
])

const router = useRouter()
const imageFailed = ref(false)

/**
 * 찜 목록의 매물 카드를 누르면
 * 해당 매물의 공개 상세 페이지로 이동한다.
 */
const openPropertyDetail = () => {
  if (props.item?.propertyId == null) {
    return
  }

  router.push(
    toPropertyDetailLocation(props.item),
  )
}

const propertyTypeLabel = computed(() => {
  const labels = {
    APARTMENT: '아파트',
    OFFICETEL: '오피스텔',
    VILLA: '빌라',
    ROOM: '원룸·투룸',
  }

  return labels[props.item.propertyType] ?? props.item.propertyType
})

const publisherLabel = computed(() => {
  const labels = {
    DIRECT_OWNER: '직거래',
    AGENT_BROKERAGE: '중개',
  }

  return labels[props.item.publisherType] ?? ''
})

const priceText = computed(() => {
  return formatPropertyPrice({
    transactionType: props.item.transactionType,
    salePrice: props.item.displayPrice?.salePrice,
    deposit: props.item.displayPrice?.deposit,
    monthlyRent: props.item.displayPrice?.monthlyRent,
  })
})

const metaText = computed(() => {
  const parts = []

  if (
    props.item.exclusiveArea !== null &&
    props.item.exclusiveArea !== undefined
  ) {
    parts.push(`전용 ${props.item.exclusiveArea}㎡`)
  }

  if (
    props.item.floor !== null &&
    props.item.floor !== undefined
  ) {
    parts.push(`${props.item.floor}층`)
  }

  if (publisherLabel.value) {
    parts.push(publisherLabel.value)
  }

  return parts.join(' · ')
})

const hasImage = computed(() => {
  return Boolean(props.item.representativeImageUrl) && !imageFailed.value
})

const handleImageError = () => {
  imageFailed.value = true
}
</script>

<template>
  <article
    class="favorite-card"
    role="link"
    tabindex="0"
    @click="openPropertyDetail"
    @keydown.enter.self.prevent="openPropertyDetail"
    @keydown.space.self.prevent="openPropertyDetail"
  >
    <div class="favorite-card__media">
      <img
        v-if="hasImage"
        class="favorite-card__image"
        :src="item.representativeImageUrl"
        :alt="`${item.locationSummary ?? '매물'} 대표 이미지`"
        @error="handleImageError"
      >

      <div
        v-else
        class="favorite-card__image-placeholder"
        aria-label="대표 이미지 없음"
      >
        <span>이미지 없음</span>
      </div>

      <!--
        하트를 눌렀을 때는
        카드의 상세페이지 이동 이벤트가 실행되지 않도록 stop
      -->
      <div
        class="favorite-card__heart"
        @click.stop
      >
        <FavoriteButton
          :property-id="item.propertyId"
          :initial-favorite="item.isFavorite"
          appearance="overlay"
          @change="emit('favorite-change', $event)"
        />
      </div>
    </div>

    <div class="favorite-card__body">
      <strong class="favorite-card__price">
        {{ priceText }}
      </strong>

      <p class="favorite-card__location">
        {{ item.locationSummary || propertyTypeLabel }}
      </p>

      <p class="favorite-card__meta">
        {{ metaText || propertyTypeLabel }}
      </p>
    </div>
  </article>
</template>

<style scoped>
.favorite-card {
  width: 100%;
  overflow: hidden;
  background: #ffffff;
  border-radius: 20px;
  cursor: pointer;
}

.favorite-card:focus-visible {
  outline: none;
  box-shadow: var(--zipda-focus-ring);
}

.favorite-card__media {
  position: relative;
  width: 100%;
  height: 234px;
  overflow: hidden;
  background: #f4f4ef;
  border-radius: 20px;
}

.favorite-card__image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.favorite-card__image-placeholder {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  color: #97a97c;
  background:
    linear-gradient(
      135deg,
      #f4f4ef,
      #e9f5db
    );
  font-size: 13px;
}

.favorite-card__heart {
  position: absolute;
  top: 12px;
  right: 12px;
}

.favorite-card__body {
  display: grid;
  gap: 4px;
  padding: 8px 4px;
}

.favorite-card__price {
  color: #1b1c19;
  font-size: 24px;
  font-weight: 700;
  line-height: 30px;
  letter-spacing: -0.02em;
}

.favorite-card__location {
  overflow: hidden;
  color: #1b1c19;
  font-size: 15px;
  line-height: 22px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.favorite-card__meta {
  overflow: hidden;
  color: #45483e;
  font-size: 13px;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
