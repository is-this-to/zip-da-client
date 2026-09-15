<script setup>
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { usePropertyDetailStore } from "../../store/property/usePropertyDetailStore.js";
import { useAuthStore } from "../../store/auth/useAuthStore.js";
import { formatPropertyPrice, formatKoreanAmount } from "../../util/property/formatPropertyPrice.js";

const route = useRoute();
const router = useRouter();
const store = usePropertyDetailStore();
const authStore = useAuthStore();
const imageIndex = ref(0);
const failedImages = ref(new Set());
const favoriteError = ref("");
const shareMessage = ref("");
const detail = computed(() => store.detail);
const images = computed(() => Array.isArray(detail.value?.images) ? detail.value.images : []);
const activeImage = computed(() => images.value[imageIndex.value]);
const imageUrl = computed(() => typeof activeImage.value?.imageUrl === "string" ? activeImage.value.imageUrl.trim() : "");
const hasImage = computed(() => imageUrl.value && !failedImages.value.has(imageIndex.value));
const price = computed(() => formatPropertyPrice(detail.value));
const publisherLabel = computed(() => ({
  DIRECT_OWNER: "집주인 직접 등록 매물",
  DIRECT_TENANT: "세입자 직접 등록 매물",
  AGENT_BROKERAGE: "중개 등록 매물",
})[detail.value?.publisherType] ?? "");
const propertyTypeLabel = computed(() => ({
  APARTMENT: "아파트", OFFICETEL: "오피스텔", VILLA: "빌라", ROOM: "원룸·투룸+",
})[detail.value?.propertyType] ?? detail.value?.propertyType ?? "");
const facts = computed(() => {
  const item = detail.value;
  if (!item) return [];
  const rows = [
    ["전용 면적", item.exclusiveArea, (value) => `${value}㎡`],
    ["공급 면적", item.supplyArea, (value) => `${value}㎡`],
    ["층", item.floor, (value) => `${value}층${item.totalFloor != null ? ` / ${item.totalFloor}층` : ""}`],
    ["방", item.roomCount, (value) => `${value}개`],
    ["욕실", item.bathroomCount, (value) => `${value}개`],
    ["방향", item.direction, String],
    ["층 조건", item.floorCondition, String],
    ["관리비", item.maintenanceFee, formatKoreanAmount],
    ["건물 용도", item.buildingUse, String],
    ["사용승인일", item.approvalDate, String],
    ["주차", item.isParkingAvailable, (value) => value ? "가능" : "불가"],
    ["엘리베이터", item.hasElevator, (value) => value ? "있음" : "없음"],
    ["반려동물", item.isPetAllowed, (value) => value ? "가능" : "불가"],
  ];
  return rows.filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([label, value, format]) => ({ label, value: format(value) }));
});

watch(() => route.params.propertyId, (propertyId) => {
  imageIndex.value = 0;
  failedImages.value = new Set();
  favoriteError.value = "";
  if (propertyId) store.load(propertyId);
}, { immediate: true });

const changeImage = (offset) => {
  imageIndex.value = (imageIndex.value + offset + images.value.length) % images.value.length;
};
const markImageFailed = () => {
  failedImages.value = new Set([...failedImages.value, imageIndex.value]);
};
const goBack = () => {
  if (window.history.length > 1) router.back();
  else router.push("/properties");
};
const share = async () => {
  const url = window.location.href;
  try {
    if (navigator.share) await navigator.share({ title: detail.value?.title || "매물", url });
    else {
      await navigator.clipboard.writeText(url);
      shareMessage.value = "링크를 복사했습니다.";
    }
  } catch (error) {
    if (error?.name !== "AbortError") shareMessage.value = "공유할 수 없습니다.";
  }
};
const toggleFavorite = async () => {
  if (!authStore.isLoggedIn) {
    router.push("/sign-in");
    return;
  }
  try {
    favoriteError.value = "";
    await store.toggleFavorite();
  } catch {
    favoriteError.value = "찜 상태를 변경하지 못했습니다. 다시 시도해 주세요.";
  }
};
</script>

<template>
  <section class="property-detail">
    <header class="property-detail__header">
      <button type="button" class="property-detail__icon" aria-label="뒤로가기" @click="goBack">←</button>
      <strong>매물 상세</strong>
      <div class="property-detail__header-actions">
        <button type="button" class="property-detail__icon" aria-label="공유" @click="share">↗</button>
        <button v-if="detail" type="button" class="property-detail__icon property-detail__heart" :aria-label="detail.isFavorite ? '찜 해제' : '찜하기'" :aria-pressed="detail.isFavorite" @click="toggleFavorite">{{ detail.isFavorite ? '♥' : '♡' }}</button>
      </div>
    </header>
    <p v-if="shareMessage" class="property-detail__notice" role="status">{{ shareMessage }}</p>
    <div v-if="store.isLoading" class="property-detail__state" role="status">매물 정보를 불러오는 중입니다.</div>
    <div v-else-if="store.error" class="property-detail__state" role="alert">
      <p>공개 매물 정보를 불러오지 못했습니다.</p>
      <button type="button" @click="store.load(route.params.propertyId)">다시 시도</button>
    </div>
    <template v-else-if="detail">
      <section class="property-detail__gallery" aria-label="매물 이미지">
        <img v-if="hasImage" class="property-detail__image" :src="imageUrl" :alt="`${detail.title || '매물'} 이미지 ${imageIndex + 1}`" @error="markImageFailed">
        <div v-else class="property-detail__fallback" role="img" aria-label="매물 이미지 없음">이미지 없음</div>
        <template v-if="images.length > 1">
          <button type="button" class="property-detail__gallery-button property-detail__gallery-button--left" aria-label="이전 이미지" @click="changeImage(-1)">‹</button>
          <button type="button" class="property-detail__gallery-button property-detail__gallery-button--right" aria-label="다음 이미지" @click="changeImage(1)">›</button>
          <span class="property-detail__counter">{{ imageIndex + 1 }} / {{ images.length }}</span>
        </template>
      </section>
      <section class="property-detail__section property-detail__summary">
        <span class="property-detail__eyebrow">{{ propertyTypeLabel }}</span>
        <h1>{{ detail.title || '매물' }}</h1>
        <strong class="property-detail__price">{{ price }}</strong>
        <p class="property-detail__address">{{ detail.publicAddress }}</p>
        <p class="property-detail__favorite-count">찜 {{ detail.favoriteCount }}명</p>
      </section>
      <section v-if="facts.length" class="property-detail__section">
        <h2>매물 정보</h2>
        <dl class="property-detail__facts">
          <div v-for="fact in facts" :key="fact.label"><dt>{{ fact.label }}</dt><dd>{{ fact.value }}</dd></div>
        </dl>
      </section>
      <section v-if="detail.options?.length" class="property-detail__section">
        <h2>옵션</h2>
        <div class="property-detail__options"><span v-for="option in detail.options" :key="option.optionCode" class="property-detail__option">{{ option.optionName }}{{ option.optionValue === 'true' ? ' · 있음' : option.optionValue === 'false' ? ' · 없음' : option.optionValue ? ` · ${option.optionValue}` : '' }}</span></div>
      </section>
      <section v-if="publisherLabel" class="property-detail__section">
        <h2>등록 정보</h2>
        <div class="property-detail__publisher">{{ publisherLabel }}</div>
      </section>
      <section v-if="detail.description" class="property-detail__section property-detail__description">
        <h2>상세 설명</h2>
        <p>{{ detail.description }}</p>
      </section>
      <p v-if="favoriteError" class="property-detail__notice" role="alert">{{ favoriteError }}</p>
      <footer class="property-detail__actions">
        <button type="button" class="property-detail__favorite-action" :aria-pressed="detail.isFavorite" @click="toggleFavorite">{{ detail.isFavorite ? '♥ 찜 해제' : '♡ 찜하기' }}</button>
        <button type="button" class="property-detail__contact" disabled>문의 정보 없음</button>
      </footer>
    </template>
  </section>
</template>

<style scoped>
.property-detail { min-height: 100dvh; padding-bottom: calc(92px + env(safe-area-inset-bottom)); background: var(--zipda-color-white); }
.property-detail__header { height: var(--zipda-header-height); display: flex; align-items: center; justify-content: space-between; padding: 0 16px; border-bottom: 1px solid var(--zipda-color-border); }
.property-detail__header-actions { display: flex; align-items: center; gap: 4px; }
.property-detail__icon { width: 40px; height: 40px; border: 0; background: none; color: var(--zipda-color-text); font-size: 24px; cursor: pointer; }
.property-detail__heart { color: #d93b32; }
.property-detail__gallery { position: relative; height: min(70vw, 360px); min-height: 240px; background: #f4f4ef; }
.property-detail__image, .property-detail__fallback { display: block; width: 100%; height: 100%; object-fit: cover; }
.property-detail__fallback { display: grid; place-items: center; color: var(--zipda-color-primary-active); background: linear-gradient(135deg, #f4f4ef, #e9f5db); }
.property-detail__gallery-button { position: absolute; top: 50%; transform: translateY(-50%); width: 36px; height: 36px; border: 0; border-radius: 50%; background: rgb(255 255 255 / 85%); font-size: 28px; cursor: pointer; }
.property-detail__gallery-button--left { left: 12px; } .property-detail__gallery-button--right { right: 12px; }
.property-detail__counter { position: absolute; right: 14px; bottom: 14px; padding: 5px 10px; border-radius: 14px; color: white; background: rgb(0 0 0 / 60%); font-size: 12px; }
.property-detail__section { padding: 24px var(--zipda-page-padding); border-bottom: 1px solid var(--zipda-color-border); }
.property-detail__section h1 { margin: 8px 0 12px; font-size: 23px; } .property-detail__section h2 { margin: 0 0 20px; font-size: 18px; }
.property-detail__eyebrow { color: var(--zipda-color-primary-active); font-size: 13px; font-weight: 700; }
.property-detail__price { display: block; font-size: 24px; } .property-detail__address { margin: 10px 0; color: var(--zipda-color-text-muted); }
.property-detail__favorite-count { margin: 0; color: var(--zipda-color-text-muted); font-size: 12px; }
.property-detail__facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px 12px; margin: 0; }
.property-detail__facts div { min-width: 0; } .property-detail__facts dt { color: var(--zipda-color-text-muted); font-size: 12px; } .property-detail__facts dd { margin: 5px 0 0; font-weight: 600; overflow-wrap: anywhere; }
.property-detail__options { display: flex; flex-wrap: wrap; gap: 8px; } .property-detail__option { padding: 8px 12px; border-radius: 18px; background: var(--zipda-color-subtle-background); font-size: 13px; }
.property-detail__publisher { padding: 18px; border-radius: var(--zipda-radius-large); color: var(--zipda-color-primary-active); background: #e9f5db; font-weight: 700; }
.property-detail__description p { margin: 0; white-space: pre-line; line-height: 1.7; overflow-wrap: anywhere; }
.property-detail__state { padding: 36px 20px; text-align: center; } .property-detail__notice { margin: 0; padding: 10px 20px; color: var(--zipda-color-primary-active); font-size: 13px; }
.property-detail__actions { position: fixed; z-index: 10; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: var(--zipda-app-width); display: grid; grid-template-columns: 100px 1fr; gap: 10px; padding: 12px var(--zipda-page-padding) calc(12px + env(safe-area-inset-bottom)); border-top: 1px solid var(--zipda-color-border); background: var(--zipda-color-white); }
.property-detail__actions button { min-height: 48px; border-radius: var(--zipda-radius-medium); font-weight: 700; }
.property-detail__favorite-action { color: #d93b32; background: white; border: 1px solid var(--zipda-color-border); }
.property-detail__contact { color: var(--zipda-color-text-muted); background: var(--zipda-color-disabled); border: 0; }
</style>
