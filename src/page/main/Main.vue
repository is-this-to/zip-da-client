<script setup>
import Header from "../../component/Header.vue";
import { useAuthStore } from "../../store/auth/useAuthStore.js";

const authStore = useAuthStore();

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

const regions = ["전국", "서울", "부산", "대구", "인천", "대전"];

const risingComplexes = [
  {
    rank: 1,
    name: "그랑시티자이 (주상복합)",
    description: "경기 안산시 상록구 · 3,728세대 · 6년차",
    price: "35평 | 실 6억 6,500만원",
  },
  {
    rank: 2,
    name: "힐스테이트라피아노삼송1단지 (도시형)",
    description: "경기 고양시 덕양구 · 277세대 · 3년차",
    price: "33평 | 실 8억 1,000만원",
  },
  {
    rank: 3,
    name: "어울림하트",
    description: "대전 유성구 · 1,056세대 · 15년차",
    price: "34평 | 실 5억 1,500만원",
  },
  {
    rank: 4,
    name: "진주초전푸르지오2단지",
    description: "경남 진주시 · 830세대 · 16년차",
    price: "46평 | 실 5억 8,000만원",
  },
  {
    rank: 5,
    name: "반정아이파크캐슬5단지",
    description: "경기 화성시 병점구 · 1,378세대 · 4년차",
    price: "33평 | 실 9억 2,000만원",
  },
];
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

    <!--
      하단 리스트는 아직 확정되지 않은 영역.
      API를 연결하지 않고 Figma 형태 확인용 정적 샘플만 둔다.
    -->
    <section class="rising-section" aria-labelledby="rising-title">
      <div class="rising-section__heading">
        <img
          class="rising-section__flame"
          src="/icon/main/flame.svg"
          alt=""
          aria-hidden="true"
        />
        <h2 id="rising-title">인기 급상승 단지</h2>
      </div>

      <div class="region-tabs" role="tablist" aria-label="지역">
        <button
          v-for="(region, index) in regions"
          :key="region"
          type="button"
          class="region-tab"
          :class="{ 'region-tab--active': index === 0 }"
          role="tab"
          :aria-selected="index === 0"
        >
          {{ region }}
        </button>
      </div>

      <ol class="complex-list">
        <li
          v-for="item in risingComplexes"
          :key="item.rank"
          class="complex-item"
        >
          <span class="complex-item__rank">{{ item.rank }}</span>

          <div class="complex-item__content">
            <h3 class="complex-item__name">{{ item.name }}</h3>
            <p class="complex-item__description">{{ item.description }}</p>
            <p class="complex-item__price">{{ item.price }}</p>
          </div>

          <div class="complex-item__thumbnail" aria-hidden="true"></div>
        </li>
      </ol>

      <button type="button" class="more-button">
        <span>더보기</span>
        <img src="/icon/main/chevron-down.svg" alt="" aria-hidden="true" />
      </button>
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
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #efeee9 0%, #dde5d4 100%);
  border-radius: 8px;
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
}

.more-button img {
  width: 8px;
  height: 5px;
}
</style>
