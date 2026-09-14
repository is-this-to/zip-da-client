<script setup>
import {
  computed,
  onBeforeUnmount,
  ref,
  watch,
} from "vue";
import { useRoute } from "vue-router";

import Header from "../../component/Header.vue";
import FavoriteButton from "../../component/favorite/FavoriteButton.vue";
import { usePropertyDetailStore } from "../../store/property/usePropertyDetailStore.js";
import {
  formatBooleanAvailability,
  formatDetailPrice,
  propertyTypeLabels,
  publisherTypeLabels,
  toPropertyDetailFacts,
} from "../../util/property/propertyDetailPresentation.js";

const route = useRoute();
const propertyDetailStore = usePropertyDetailStore();
const selectedImageIndex = ref(0);
let requestSequence = 0;

const property = computed(() => propertyDetailStore.propertyDetail);
const images = computed(() => {
  return [...(property.value?.images ?? [])].sort(
    (first, second) => (first.sortOrder ?? 0) - (second.sortOrder ?? 0),
  );
});
const selectedImage = computed(() => images.value[selectedImageIndex.value] ?? null);
const propertyTypeLabel = computed(() => {
  const type = property.value?.propertyType;
  return propertyTypeLabels[type] ?? type ?? "매물";
});
const publisherTypeLabel = computed(() => {
  const publisherType = property.value?.publisherType;
  return publisherTypeLabels[publisherType] ?? publisherType ?? "";
});
const priceText = computed(() => formatDetailPrice(property.value));
const facts = computed(() => toPropertyDetailFacts(property.value));
const optionGroups = computed(() => {
  const grouped = new Map();

  for (const option of property.value?.options ?? []) {
    const category = option.optionCategory || "기타 옵션";
    if (!grouped.has(category)) {
      grouped.set(category, []);
    }
    grouped.get(category).push(option);
  }

  return [...grouped.entries()].map(([category, options]) => ({
    category,
    options: [...options].sort(
      (first, second) => (first.displayOrder ?? 0) - (second.displayOrder ?? 0),
    ),
  }));
});
const availabilityFacts = computed(() => {
  if (!property.value) {
    return [];
  }

  return [
    ["주차", formatBooleanAvailability(property.value.isParkingAvailable)],
    ["엘리베이터", formatBooleanAvailability(property.value.hasElevator)],
    ["반려동물", formatBooleanAvailability(property.value.isPetAllowed)],
  ];
});
const coordinateText = computed(() => {
  const { latitude, longitude } = property.value ?? {};
  if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) {
    return "위치 정보가 없습니다.";
  }

  return `위도 ${Number(latitude).toFixed(5)} · 경도 ${Number(longitude).toFixed(5)}`;
});
const errorMessage = computed(() => {
  return propertyDetailStore.propertyDetailError?.response?.data?.message
    ?? "매물 정보를 불러오지 못했습니다.";
});

const loadProperty = async () => {
  const sequence = ++requestSequence;
  selectedImageIndex.value = 0;

  try {
    await propertyDetailStore.fetchPropertyDetail(route.params.propertyId);
  } catch {
    // 오류 내용은 화면 상태로 표시한다.
  } finally {
    if (sequence !== requestSequence) {
      return;
    }
  }
};

const selectImage = (index) => {
  selectedImageIndex.value = index;
};

const handleFavoriteChange = ({ favorite, result }) => {
  if (!property.value) {
    return;
  }

  const returnedCount = result?.favoriteCount;
  const favoriteCount = Number.isFinite(Number(returnedCount))
    ? Number(returnedCount)
    : Math.max(
      0,
      Number(property.value.favoriteCount ?? 0) + (favorite ? 1 : -1),
    );

  propertyDetailStore.propertyDetail = {
    ...property.value,
    isFavorite: favorite,
    favoriteCount,
  };
};

watch(
  () => route.params.propertyId,
  loadProperty,
  { immediate: true },
);

onBeforeUnmount(() => {
  requestSequence += 1;
  propertyDetailStore.resetPropertyDetail();
});
</script>

<template>
  <section class="page property-detail-page">
    <Header
      class="property-detail-page__header"
      title="매물 상세"
      show-back
      back-to="/properties/search"
    />

    <main class="property-detail-page__content">
      <p
        v-if="propertyDetailStore.isPropertyDetailLoading && !property"
        class="property-detail-page__state"
      >
        매물 정보를 불러오는 중입니다.
      </p>

      <section
        v-else-if="propertyDetailStore.propertyDetailError"
        class="property-detail-page__state property-detail-page__state--error"
      >
        <p>{{ errorMessage }}</p>
        <button type="button" @click="loadProperty">
          다시 시도
        </button>
      </section>

      <template v-else-if="property">
        <section class="property-detail-page__gallery" aria-label="매물 이미지">
          <img
            v-if="selectedImage?.imageUrl"
            class="property-detail-page__main-image"
            :src="selectedImage.imageUrl"
            :alt="`${property.title || propertyTypeLabel} 이미지 ${selectedImageIndex + 1}`"
          >
          <div v-else class="property-detail-page__image-placeholder">
            이미지가 없습니다.
          </div>

          <div v-if="images.length > 1" class="property-detail-page__thumbnails">
            <button
              v-for="(image, index) in images"
              :key="image.fileId ?? image.imageUrl ?? index"
              type="button"
              class="property-detail-page__thumbnail"
              :class="{ 'property-detail-page__thumbnail--active': index === selectedImageIndex }"
              :aria-label="`이미지 ${index + 1} 보기`"
              :aria-pressed="index === selectedImageIndex"
              @click="selectImage(index)"
            >
              <img :src="image.imageUrl" alt="">
            </button>
          </div>
        </section>

        <section class="property-detail-page__summary">
          <div class="property-detail-page__title-row">
            <div>
              <p class="property-detail-page__category">
                {{ propertyTypeLabel }}<span v-if="publisherTypeLabel"> · {{ publisherTypeLabel }}</span>
              </p>
              <h1>{{ property.title || propertyTypeLabel }}</h1>
            </div>
            <FavoriteButton
              :property-id="property.propertyId"
              :initial-favorite="property.isFavorite"
              appearance="overlay"
              @change="handleFavoriteChange"
            />
          </div>
          <strong class="property-detail-page__price">{{ priceText }}</strong>
          <p class="property-detail-page__favorite-count">
            찜 {{ Number(property.favoriteCount ?? 0).toLocaleString("ko-KR") }}
          </p>
        </section>

        <section class="property-detail-page__section">
          <h2>주소와 위치</h2>
          <p class="property-detail-page__address">{{ property.publicAddress || "공개 주소 정보가 없습니다." }}</p>
          <p class="property-detail-page__coordinates">{{ coordinateText }}</p>
        </section>

        <section v-if="property.description" class="property-detail-page__section">
          <h2>매물 설명</h2>
          <p class="property-detail-page__description">{{ property.description }}</p>
        </section>

        <section v-if="facts.length" class="property-detail-page__section">
          <h2>기본 정보</h2>
          <dl class="property-detail-page__facts">
            <template v-for="[label, value] in facts" :key="label">
              <dt>{{ label }}</dt>
              <dd>{{ value }}</dd>
            </template>
          </dl>
        </section>

        <section class="property-detail-page__section">
          <h2>이용 정보</h2>
          <dl class="property-detail-page__facts">
            <template v-for="[label, value] in availabilityFacts" :key="label">
              <dt>{{ label }}</dt>
              <dd>{{ value }}</dd>
            </template>
          </dl>
        </section>

        <section v-if="optionGroups.length" class="property-detail-page__section">
          <h2>옵션</h2>
          <div v-for="group in optionGroups" :key="group.category" class="property-detail-page__option-group">
            <h3>{{ group.category }}</h3>
            <ul>
              <li v-for="option in group.options" :key="option.optionCode">
                <span>{{ option.optionName || option.optionCode }}</span>
                <strong v-if="option.optionValue">{{ option.optionValue }}</strong>
              </li>
            </ul>
          </div>
        </section>
      </template>
    </main>
  </section>
</template>

<style scoped>
.property-detail-page { min-height: 100dvh; background: #fff; }
.property-detail-page__header { border-bottom: 1px solid #dde5d4; }
.property-detail-page__content { width: min(100%, 720px); margin: 0 auto; padding-bottom: 40px; }
.property-detail-page__state { padding: 96px 24px; color: #75786d; text-align: center; }
.property-detail-page__state--error { color: #b42318; }
.property-detail-page__state button { margin-top: 16px; padding: 10px 16px; color: #516237; background: #e9f5db; border: 1px solid #dde5d4; border-radius: 10px; font-weight: 700; cursor: pointer; }
.property-detail-page__gallery { background: #f4f4ef; }
.property-detail-page__main-image, .property-detail-page__image-placeholder { display: block; width: 100%; aspect-ratio: 4 / 3; object-fit: cover; }
.property-detail-page__image-placeholder { display: grid; place-items: center; color: #75786d; background: linear-gradient(135deg, #f4f4ef, #e9f5db); }
.property-detail-page__thumbnails { display: flex; gap: 8px; padding: 10px 16px; overflow-x: auto; background: #fff; }
.property-detail-page__thumbnail { flex: 0 0 auto; width: 56px; height: 42px; padding: 0; overflow: hidden; background: #fff; border: 2px solid transparent; border-radius: 8px; cursor: pointer; }
.property-detail-page__thumbnail--active { border-color: #516237; }
.property-detail-page__thumbnail img { width: 100%; height: 100%; object-fit: cover; }
.property-detail-page__summary, .property-detail-page__section { padding: 24px; border-bottom: 8px solid #f4f4ef; }
.property-detail-page__title-row { display: flex; gap: 16px; align-items: flex-start; justify-content: space-between; }
.property-detail-page__category, .property-detail-page__favorite-count, .property-detail-page__coordinates { margin: 0; color: #75786d; font-size: 14px; }
.property-detail-page h1, .property-detail-page h2, .property-detail-page h3, .property-detail-page p { margin-top: 0; }
.property-detail-page h1 { margin-bottom: 12px; color: #1b1c19; font-size: 24px; line-height: 1.35; }
.property-detail-page h2 { margin-bottom: 14px; color: #1b1c19; font-size: 18px; }
.property-detail-page__price { display: block; margin-bottom: 6px; color: #1b1c19; font-size: 22px; }
.property-detail-page__address { margin-bottom: 6px; color: #1b1c19; line-height: 1.6; }
.property-detail-page__description { margin-bottom: 0; color: #45483e; line-height: 1.7; white-space: pre-line; }
.property-detail-page__facts { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 16px; margin: 0; }
.property-detail-page__facts dt { color: #75786d; font-size: 14px; }
.property-detail-page__facts dd { margin: 0; color: #1b1c19; font-weight: 600; text-align: right; }
.property-detail-page__option-group + .property-detail-page__option-group { margin-top: 18px; }
.property-detail-page__option-group h3 { margin-bottom: 8px; color: #516237; font-size: 14px; }
.property-detail-page__option-group ul { display: grid; gap: 8px; padding: 0; margin: 0; list-style: none; }
.property-detail-page__option-group li { display: flex; justify-content: space-between; gap: 12px; color: #45483e; }
.property-detail-page__option-group strong { color: #1b1c19; }
</style>
