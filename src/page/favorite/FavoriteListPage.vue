<script setup>
import {
  computed,
  onMounted,
  ref,
} from 'vue'

import Header from '../../component/Header.vue'
import PropertyFavoriteCard from '../../component/favorite/PropertyFavoriteCard.vue'
import { useFavoriteStore } from '../../store/favorite/useFavoriteStore.js'

const favoriteStore = useFavoriteStore()

const selectedFilter = ref('ALL')

const filters = [
  {
    value: 'ALL',
    label: '전체',
  },
  {
    value: 'APARTMENT',
    label: '아파트',
  },
  {
    value: 'VILLA_ROOM',
    label: '빌라/투룸',
  },
  {
    value: 'OFFICETEL',
    label: '오피스텔',
  },
]

const favoriteTitle = computed(() => {
  if (favoriteStore.hasNext) {
    return '찜한 매물'
  }

  return `찜한 매물 ${favoriteStore.favoriteItems.length}`
})

const visibleFavoriteItems = computed(() => {
  if (selectedFilter.value === 'ALL') {
    return favoriteStore.favoriteItems
  }

  if (selectedFilter.value === 'VILLA_ROOM') {
    return favoriteStore.favoriteItems.filter(
      (item) =>
        item.propertyType === 'VILLA' ||
        item.propertyType === 'ROOM',
    )
  }

  return favoriteStore.favoriteItems.filter(
    (item) =>
      item.propertyType === selectedFilter.value,
  )
})

const handleFavoriteChange = (
  propertyId,
  payload,
) => {
  if (payload.favorite) {
    return
  }

  favoriteStore.favoriteItems =
    favoriteStore.favoriteItems.filter(
      (item) =>
        String(item.propertyId) !== String(propertyId),
    )
}

const fetchNextPage = async () => {
  try {
    await favoriteStore.fetchNextFavoritePage()
  } catch (error) {
    console.error(error)
  }
}

onMounted(async () => {
  try {
    await favoriteStore.fetchFavoriteList()
  } catch (error) {
    console.error(error)
  }
})
</script>

<template>
  <section class="page favorite-page">
    <Header
      class="favorite-page__header"
      :title="favoriteTitle"
      show-back
    />

    <div class="favorite-page__content">
      <div
        class="favorite-filter"
        aria-label="찜 매물 유형 필터"
      >
        <button
          v-for="filter in filters"
          :key="filter.value"
          type="button"
          class="favorite-filter__chip"
          :class="{
            'favorite-filter__chip--active':
              selectedFilter === filter.value,
          }"
          @click="selectedFilter = filter.value"
        >
          {{ filter.label }}
        </button>
      </div>

      <p
        v-if="
          favoriteStore.isFavoriteListLoading &&
          favoriteStore.favoriteItems.length === 0
        "
        class="favorite-state"
      >
        찜한 매물을 불러오는 중입니다.
      </p>

      <p
        v-else-if="
          favoriteStore.favoriteListError &&
          favoriteStore.favoriteItems.length === 0
        "
        class="favorite-state favorite-state--error"
      >
        찜한 매물을 불러오지 못했습니다.
      </p>

      <p
        v-else-if="
          favoriteStore.favoriteItems.length === 0
        "
        class="favorite-state"
      >
        찜한 매물이 없습니다.
      </p>

      <p
        v-else-if="
          visibleFavoriteItems.length === 0
        "
        class="favorite-state"
      >
        해당 유형의 찜한 매물이 없습니다.
      </p>

      <div
        v-else
        class="favorite-list"
      >
        <PropertyFavoriteCard
          v-for="item in visibleFavoriteItems"
          :key="String(item.propertyId)"
          :item="item"
          @favorite-change="
            handleFavoriteChange(
              item.propertyId,
              $event,
            )
          "
        />
      </div>

      <button
        v-if="favoriteStore.hasNext"
        type="button"
        class="favorite-more-button"
        :disabled="favoriteStore.isFavoriteListLoading"
        @click="fetchNextPage"
      >
        {{
          favoriteStore.isFavoriteListLoading
            ? '불러오는 중...'
            : '더 보기'
        }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.favorite-page {
  width: 100%;
  max-width: 344px;
  min-height: 100dvh;
  margin: 0 auto;
  background: #ffffff;
}

.favorite-page :deep(.favorite-page__header) {
  height: 56px;
  background: #ffffff;
  border-bottom-color: #dde5d4;
}

.favorite-page :deep(
  .favorite-page__header .app-header__title
) {
  color: #516237;
  font-size: 18px;
  line-height: 24px;
  text-align: left;
}

.favorite-page__content {
  display: grid;
  gap: 24px;
  width: 100%;
  padding: 24px 16px 32px;
}

.favorite-filter {
  display: flex;
  gap: 8px;
  width: 100%;
  padding-bottom: 8px;
  overflow-x: auto;
  scrollbar-width: none;
}

.favorite-filter::-webkit-scrollbar {
  display: none;
}

.favorite-filter__chip {
  flex: 0 0 auto;
  min-height: 31px;
  padding: 7px 16px;
  color: #1b1c19;
  background: #e9f5db;
  border: 1px solid #dde5d4;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
  letter-spacing: 0.02em;
  cursor: pointer;
}

.favorite-filter__chip--active {
  color: #ffffff;
  background: #516237;
  border-color: #516237;
  box-shadow: 0 1px 1px rgb(0 0 0 / 5%);
}

.favorite-list {
  display: grid;
  gap: 16px;
  width: 100%;
}

.favorite-state {
  padding: 72px 16px;
  color: #75786d;
  font-size: 14px;
  line-height: 22px;
  text-align: center;
}

.favorite-state--error {
  color: var(--zipda-color-danger);
}

.favorite-more-button {
  width: 100%;
  min-height: 44px;
  color: #516237;
  background: #e9f5db;
  border: 1px solid #dde5d4;
  border-radius: 9999px;
  font-weight: 700;
  cursor: pointer;
}

.favorite-more-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
</style>
