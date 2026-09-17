<script setup>
import { onMounted, ref } from "vue";
import Header from "../../component/Header.vue";
import { useAuthStore } from "../../store/auth/useAuthStore.js";
import { usePopularPropertyStore } from "../../store/main/usePopularPropertyStore.js";
import { formatPropertyPrice } from "../../util/property/formatPropertyPrice.js";

const authStore = useAuthStore();
const popularPropertyStore = usePopularPropertyStore();

const categoryItems = [
  {
    label: "아파트",
    icon: "/icon/main/apartment.svg",
    to: "/properties/search",
  },
  {
    label: "오피스텔",
    icon: "/icon/main/officetel.svg",
    to: "/properties/search",
  },
  { label: "원룸", icon: "/icon/main/one-room.svg", to: "/properties/search" },
  { label: "투룸+", icon: "/icon/main/two-room.svg", to: "/properties/search" },
  { label: "관심", icon: "/icon/main/favorite-menu.svg", to: "/favorites" },
];

const regions = [
  { value: "ALL", label: "전국" },
  { value: "SEOUL", label: "서울" },
  { value: "BUSAN", label: "부산" },
  { value: "DAEGU", label: "대구" },
  { value: "INCHEON", label: "인천" },
  { value: "GWANGJU", label: "광주" },
  { value: "DAEJEON", label: "대전" },
  { value: "ULSAN", label: "울산" },
  { value: "SEJONG", label: "세종" },
];

const propertyTypeLabels = {
  APARTMENT: "아파트",
  OFFICETEL: "오피스텔",
  VILLA: "빌라",
  ROOM: "원룸·투룸",
};
const selectedRegion = ref("ALL");

const selectRegion = (region) => {
  if (selectedRegion.value === region) return;
  selectedRegion.value = region;
  popularPropertyStore.fetchPopularProperties(region);
};

const formatArea = (area) => {
  const value = Number(area);
  if (!Number.isFinite(value)) return "면적 정보 없음";
  return `${value.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}㎡`;
};

onMounted(() =>
  popularPropertyStore.fetchPopularProperties(selectedRegion.value),
);
</script>

<template>
  <section class="main-page" aria-label="ZIPDA 메인">
    <Header title="ZIPDA" :title-weight="900" brand>
      <template #action>
        <RouterLink
          v-if="authStore.isLoggedIn"
          class="main-page__create-button"
          to="/properties/new"
          aria-label="매물 등록"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m4 16.5-.5 4 4-.5L19 8.5 15.5 5 4 16.5Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
            <path d="m13.5 7 3.5 3.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
          </svg>
        </RouterLink>
      </template>
    </Header>

    <section class="category-section" aria-label="빠른 메뉴">
      <div class="category-grid">
        <template v-for="item in categoryItems" :key="item.label">
          <RouterLink
            v-if="item.to"
            class="category-button"
            :to="item.to"
            :aria-label="item.label"
          >
            <span class="category-button__icon-box">
              <img
                class="category-button__icon"
                :src="item.icon"
                alt=""
                aria-hidden="true"
              />
            </span>
            <span class="category-button__label">{{ item.label }}</span>
          </RouterLink>

          <button
            v-else
            type="button"
            class="category-button"
            :aria-label="`${item.label} - 준비 중`"
          >
            <span class="category-button__icon-box">
              <img
                class="category-button__icon"
                :src="item.icon"
                alt=""
                aria-hidden="true"
              />
            </span>
            <span class="category-button__label">{{ item.label }}</span>
          </button>
        </template>
      </div>
    </section>

    <div class="main-divider" aria-hidden="true"></div>

    <section class="rising-section" aria-labelledby="rising-title">
      <div class="rising-section__heading">
        <img
          class="rising-section__flame"
          src="/icon/main/flame.svg"
          alt=""
          aria-hidden="true"
        />
        <h2 id="rising-title">찜 많은 인기 매물</h2>
      </div>

      <div class="region-tabs" role="tablist" aria-label="지역">
        <button
          v-for="region in regions"
          :key="region.value"
          type="button"
          class="region-tab"
          :class="{ 'region-tab--active': selectedRegion === region.value }"
          role="tab"
          :aria-selected="selectedRegion === region.value"
          @click="selectRegion(region.value)"
        >
          {{ region.label }}
        </button>
      </div>

      <div
        v-if="popularPropertyStore.loading"
        class="ranking-state"
        role="status"
      >
        인기 매물을 불러오고 있어요.
      </div>
      <div
        v-else-if="popularPropertyStore.errorMessage"
        class="ranking-state ranking-state--error"
        role="alert"
      >
        <span>{{ popularPropertyStore.errorMessage }}</span>
        <button
          type="button"
          @click="popularPropertyStore.fetchPopularProperties(selectedRegion)"
        >
          다시 시도
        </button>
      </div>
      <div
        v-else-if="popularPropertyStore.items.length === 0"
        class="ranking-state"
      >
        이 지역에는 아직 찜을 받은 매물이 없어요.
      </div>

      <ol v-else class="complex-list">
        <li
          v-for="(item, index) in popularPropertyStore.items"
          :key="item.propertyId"
          class="complex-item"
        >
          <span class="complex-item__rank">{{ index + 1 }}</span>

          <RouterLink
            class="complex-item__content"
            :to="`/properties/${item.propertyId}`"
          >
            <h3 class="complex-item__name">{{ item.title }}</h3>
            <p class="complex-item__description">
              {{ item.locationSummary }} ·
              {{ propertyTypeLabels[item.propertyType] ?? "매물" }} · 찜
              {{ item.favoriteCount.toLocaleString("ko-KR") }}개
            </p>
            <p class="complex-item__price">
              {{ formatArea(item.exclusiveArea) }} |
              {{ formatPropertyPrice(item) }}
            </p>
          </RouterLink>

          <RouterLink
            class="complex-item__thumbnail"
            :to="`/properties/${item.propertyId}`"
            :aria-label="`${item.title} 상세 보기`"
          >
            <img
              v-if="item.representativeImageUrl"
              :src="item.representativeImageUrl"
              :alt="`${item.title} 대표 사진`"
            />
            <span v-else aria-hidden="true">⌂</span>
          </RouterLink>
        </li>
      </ol>

      <RouterLink to="/properties/search" class="more-button">
        <span>더보기</span>
        <img src="/icon/main/chevron-down.svg" alt="" aria-hidden="true" />
      </RouterLink>
    </section>
  </section>
</template>

<style scoped>
.main-page {
  width: 100%;
  min-height: 100dvh;
  background: var(--zipda-color-white);
  color: var(--zipda-color-text);
}

.main-page__create-button {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  color: var(--zipda-color-primary);
  border-radius: 50%;
}

.main-page__create-button svg { width: 22px; height: 22px; }
.main-page__create-button:hover { background: #eff5e7; }
.main-page__create-button:focus-visible { outline: none; box-shadow: var(--zipda-focus-ring); }

/* 실제 메인 콘텐츠는 공통 560px 기준 */
.category-section {
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
  padding: 16px 20px;
  background: var(--zipda-color-white);
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  row-gap: 16px;
  column-gap: 8px;
  width: 100%;
}

.category-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  min-width: 0;
  min-height: 72px;
  padding: 0;
  color: #1b1c19;
  background: transparent;
  border: 0;
  text-decoration: none;
  cursor: pointer;
}

.category-button:focus-visible {
  outline: none;
}

.category-button:focus-visible .category-button__icon-box {
  box-shadow: var(--zipda-focus-ring);
}

.category-button__icon-box {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  background: #efeee9;
  border-radius: 16px;
}

.category-button__icon {
  display: block;
  width: 21px;
  height: 21px;
  object-fit: contain;
}

.category-button__label {
  font-size: 12px;
  font-weight: 400;
  line-height: 16px;
  letter-spacing: 0.24px;
  white-space: nowrap;
}

/* 섹션 구분선은 화면 전체 너비 */
.main-divider {
  width: 100%;
  height: 8px;
  background: #f4f4ef;
}

/* 인기 급상승 영역도 실제 내용만 560px */
.rising-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
  padding: 24px 0 40px;
  background: var(--zipda-color-white);
}

.rising-section__heading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 20px;
}

.rising-section__heading h2 {
  color: #1b1c19;
  font-size: 18px;
  font-weight: 600;
  line-height: 24px;
}

.rising-section__flame {
  width: 16px;
  height: 18px;
}

.region-tabs {
  display: flex;
  gap: 8px;
  width: 100%;
  padding: 0 20px;
  overflow-x: auto;
  scrollbar-width: none;
}

.region-tabs::-webkit-scrollbar {
  display: none;
}

.region-tab {
  flex: 0 0 auto;
  min-width: 56px;
  height: 30px;
  padding: 0 17px;
  color: #45483e;
  font-size: 12px;
  line-height: 16px;
  letter-spacing: 0.24px;
  background: #ffffff;
  border: 1px solid #dde5d4;
  border-radius: 9999px;
}

.region-tab--active {
  color: #516237;
  background: rgb(215 233 192 / 30%);
  border-color: #516237;
}

.complex-list {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 8px 20px 0;
  list-style: none;
}

.complex-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  padding: 0 0 16px;
  margin-bottom: 16px;
  border-bottom: 1px solid #dde5d4;
}

.complex-item:last-child {
  margin-bottom: 0;
  border-bottom: 0;
}

.complex-item__rank {
  flex: 0 0 24px;
  padding-top: 2px;
  color: #516237;
  font-size: 24px;
  font-weight: 700;
  line-height: 30px;
}

.complex-item__content {
  flex: 1 1 auto;
  min-width: 0;
  text-decoration: none;
}

.complex-item__name {
  color: #1b1c19;
  font-size: 18px;
  font-weight: 600;
  line-height: 24px;
}

.complex-item__description {
  margin-top: 4px;
  color: #97a97c;
  font-size: 13px;
  line-height: 18px;
}

.complex-item__price {
  margin-top: 4px;
  padding-top: 4px;
  color: #243126;
  font-size: 15px;
  line-height: 22px;
}

.complex-item__thumbnail {
  flex: 0 0 64px;
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  overflow: hidden;
  color: var(--zipda-color-primary);
  background: linear-gradient(135deg, #efeee9 0%, #dde5d4 100%);
  border-radius: 8px;
  font-size: 24px;
  text-decoration: none;
}

.complex-item__thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ranking-state {
  display: grid;
  place-items: center;
  gap: 10px;
  min-height: 180px;
  margin: 0 20px;
  padding: 24px;
  color: var(--zipda-color-text-muted);
  background: #f7f7f3;
  border-radius: 12px;
  font-size: 13px;
  text-align: center;
}

.ranking-state--error button {
  padding: 7px 12px;
  color: var(--zipda-color-primary-active);
  background: var(--zipda-color-white);
  border: 1px solid var(--zipda-color-border);
  border-radius: 999px;
  cursor: pointer;
}

.more-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: calc(100% - 40px);
  height: 42px;
  margin: 0 20px;
  padding: 0;
  color: #516237;
  font-size: 13px;
  line-height: 18px;
  background: transparent;
  border: 0;
  border-radius: 8px;
  cursor: pointer;
  text-decoration: none;
}

.more-button img {
  width: 8px;
  height: 5px;
}
</style>
