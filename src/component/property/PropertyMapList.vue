<script setup>
import {
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";

import { formatPropertyPrice } from
  "../../util/property/formatPropertyPrice.js";

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  selectedPropertyId: {
    type: [String, Number],
    default: null,
  },
  autoScrollSelectedProperty: {
    type: Boolean,
    default: false,
  },
  sort: {
    type: String,
    default: "LATEST",
  },
  hasNext: {
    type: Boolean,
    default: false,
  },
  isInitialLoading: {
    type: Boolean,
    default: false,
  },
  isLoadingMore: {
    type: Boolean,
    default: false,
  },
  errorMessage: {
    type: String,
    default: "",
  },
});

const emit = defineEmits([
  "select-property",
  "change-sort",
  "load-more",
  "retry",
]);

const listContainer = ref(null);
const loadMoreSentinel = ref(null);
const cardElements = new Map();
const failedImageKeys = ref(new Set());

let intersectionObserver = null;
let viewportMediaQuery = null;
let isComponentMounted = false;

const propertyTypeLabel = (propertyType) => {
  const labels = {
    APARTMENT: "아파트",
    OFFICETEL: "오피스텔",
    VILLA: "빌라",
    ROOM: "원룸·투룸+",
  };

  return labels[propertyType] ?? propertyType;
};

const normalizeRepresentativeImageUrl = (item) => {
  return typeof item?.representativeImageUrl === "string"
    ? item.representativeImageUrl.trim()
    : "";
};

const createRepresentativeImageKey = (item) => {
  return [
    String(item?.propertyId ?? ""),
    normalizeRepresentativeImageUrl(item),
  ].join(":");
};

const hasRepresentativeImage = (item) => {
  const imageUrl = normalizeRepresentativeImageUrl(item);

  return (
    imageUrl.length > 0 &&
    !failedImageKeys.value.has(createRepresentativeImageKey(item))
  );
};

const handleRepresentativeImageError = (item) => {
  const imageUrl = normalizeRepresentativeImageUrl(item);

  if (!imageUrl) {
    return;
  }

  const nextFailedImageKeys = new Set(failedImageKeys.value);
  nextFailedImageKeys.add(createRepresentativeImageKey(item));
  failedImageKeys.value = nextFailedImageKeys;
};

const getRepresentativeImageAlt = (item) => {
  const title =
    typeof item?.title === "string" && item.title.trim()
      ? item.title.trim()
      : item?.publicAddress || "매물";

  return `${title} 대표 이미지`;
};

const pruneFailedImageKeys = () => {
  const activeImageKeys = new Set(
    props.items
      .filter((item) => normalizeRepresentativeImageUrl(item))
      .map(createRepresentativeImageKey),
  );

  failedImageKeys.value = new Set(
    [...failedImageKeys.value].filter((key) =>
      activeImageKeys.has(key),
    ),
  );
};

const setCardElement = (element, propertyId) => {
  const key = String(propertyId);

  if (element) {
    cardElements.set(key, element);
    return;
  }

  cardElements.delete(key);
};

const isSelected = (propertyId) => {
  return (
    props.selectedPropertyId !== null &&
    String(propertyId) === String(props.selectedPropertyId)
  );
};

const disconnectObserver = () => {
  intersectionObserver?.disconnect();
  intersectionObserver = null;
};

const connectObserver = async () => {
  await nextTick();
  disconnectObserver();

  if (
    !isComponentMounted ||
    !props.hasNext ||
    props.isInitialLoading ||
    props.isLoadingMore ||
    props.errorMessage ||
    !loadMoreSentinel.value
  ) {
    return;
  }

  const isDesktop = viewportMediaQuery?.matches === true;

  intersectionObserver = new IntersectionObserver(
    ([entry]) => {
      if (
        entry?.isIntersecting &&
        props.hasNext &&
        !props.isInitialLoading &&
        !props.isLoadingMore &&
        !props.errorMessage
      ) {
        emit("load-more");
      }
    },
    {
      root: isDesktop ? listContainer.value : null,
      rootMargin: "160px 0px",
      threshold: 0.01,
    },
  );

  intersectionObserver.observe(loadMoreSentinel.value);
};

const handleViewportModeChange = () => {
  connectObserver();
};

watch(
  () => [
    props.hasNext,
    props.isInitialLoading,
    props.isLoadingMore,
    props.errorMessage,
    props.items.length,
  ],
  connectObserver,
  { flush: "post" },
);

watch(
  () => props.selectedPropertyId,
  async (propertyId) => {
    if (
      propertyId === null ||
      !props.autoScrollSelectedProperty
    ) {
      return;
    }

    await nextTick();

    cardElements.get(String(propertyId))?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  },
);

watch(
  () => props.items,
  pruneFailedImageKeys,
  { flush: "post" },
);

onMounted(() => {
  isComponentMounted = true;
  viewportMediaQuery = window.matchMedia("(min-width: 768px)");
  viewportMediaQuery.addEventListener(
    "change",
    handleViewportModeChange,
  );

  connectObserver();
});

onBeforeUnmount(() => {
  isComponentMounted = false;
  disconnectObserver();
  viewportMediaQuery?.removeEventListener(
    "change",
    handleViewportModeChange,
  );
  viewportMediaQuery = null;
  cardElements.clear();
  failedImageKeys.value = new Set();
});
</script>

<template>
  <section
    class="property-map-list"
    aria-label="현재 지도 영역의 매물"
  >
    <div class="property-map-list__header">
      <div class="property-map-list__summary">
        <strong>현재 지도 매물</strong>
        <span>{{ items.length }}개 불러옴</span>
      </div>

      <select
        class="property-map-list__sort"
        :value="sort"
        aria-label="지도 매물 정렬"
        @change="emit('change-sort', $event.target.value)"
      >
        <option value="LATEST">최신순</option>
        <option value="PRICE_ASC">가격 낮은 순</option>
        <option value="PRICE_DESC">가격 높은 순</option>
        <option value="AREA_DESC">면적 넓은 순</option>
      </select>
    </div>

    <div
      ref="listContainer"
      class="property-map-list__items"
      aria-live="polite"
    >
      <div
        v-if="isInitialLoading"
        class="property-map-list__state"
        role="status"
      >
        매물 목록을 불러오는 중입니다.
      </div>

      <div
        v-else-if="errorMessage && items.length === 0"
        class="property-map-list__state"
        role="alert"
      >
        <p>{{ errorMessage }}</p>

        <button
          type="button"
          class="property-map-list__retry"
          @click="emit('retry')"
        >
          다시 시도
        </button>
      </div>

      <div
        v-else-if="items.length === 0"
        class="property-map-list__state"
      >
        현재 조건에 맞는 매물이 없습니다.
      </div>

      <template v-else>
        <button
          v-for="item in items"
          :key="String(item.propertyId)"
          :ref="(element) => setCardElement(element, item.propertyId)"
          type="button"
          class="property-map-card"
          :class="{
            'property-map-card--selected': isSelected(item.propertyId),
          }"
          @click="emit('select-property', item)"
        >
          <div class="property-map-card__media">
            <img
              v-if="hasRepresentativeImage(item)"
              class="property-map-card__image"
              :src="normalizeRepresentativeImageUrl(item)"
              :alt="getRepresentativeImageAlt(item)"
              loading="lazy"
              decoding="async"
              @error="handleRepresentativeImageError(item)"
            >

            <div
              v-else
              class="property-map-card__image-placeholder"
              role="img"
              aria-label="대표 이미지 없음"
            >
              <span>이미지 없음</span>
            </div>
          </div>

          <div class="property-map-card__content">
            <span class="property-map-card__type">
              {{ propertyTypeLabel(item.propertyType) }}
            </span>

            <strong class="property-map-card__price">
              {{ formatPropertyPrice(item) }}
            </strong>

            <span class="property-map-card__title">
              {{ item.title }}
            </span>

            <span class="property-map-card__address">
              {{ item.publicAddress }}
            </span>
          </div>
        </button>

        <div
          v-if="isLoadingMore"
          class="property-map-list__state property-map-list__state--compact"
          role="status"
        >
          다음 매물을 불러오는 중입니다.
        </div>

        <div
          v-else-if="errorMessage"
          class="property-map-list__state property-map-list__state--compact"
          role="alert"
        >
          <p>{{ errorMessage }}</p>

          <button
            type="button"
            class="property-map-list__retry"
            @click="emit('retry')"
          >
            다시 시도
          </button>
        </div>

        <div
          v-if="hasNext && !errorMessage"
          ref="loadMoreSentinel"
          class="property-map-list__sentinel"
          aria-hidden="true"
        />

        <p
          v-else-if="!hasNext && !errorMessage"
          class="property-map-list__end"
        >
          모든 매물을 확인했습니다.
        </p>
      </template>
    </div>
  </section>
</template>

<style scoped>
.property-map-list {
  display: grid;
  gap: 12px;
  padding: 16px;
  background: var(--zipda-color-white);
}

.property-map-list__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  color: var(--zipda-color-text);
  background: rgb(255 255 255 / 92%);
  border-radius: var(--zipda-radius-medium);
  box-shadow: var(--zipda-shadow-app);
  font-size: 12px;
}

.property-map-list__summary {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.property-map-list__summary span {
  color: var(--zipda-color-text-muted);
}

.property-map-list__sort {
  flex: 0 0 auto;
  max-width: 130px;
  height: 34px;
  padding: 0 8px;
  color: var(--zipda-color-text);
  background: var(--zipda-color-white);
  border: 1px solid var(--zipda-color-border);
  border-radius: var(--zipda-radius-medium);
  font-size: 12px;
}

.property-map-list__items {
  display: grid;
  grid-auto-rows: max-content;
  align-content: start;
  gap: 10px;
  padding-bottom: calc(
    var(--zipda-bottom-nav-height) +
    env(safe-area-inset-bottom) +
    16px
  );
}

.property-map-card {
  width: 100%;
  min-height: 118px;
  display: grid;
  grid-template-columns:
    clamp(96px, 30%, 128px)
    minmax(0, 1fr);
  align-items: stretch;
  gap: 0;
  padding: 0;
  overflow: hidden;
  color: var(--zipda-color-text);
  background: var(--zipda-color-white);
  border: 2px solid transparent;
  border-radius: var(--zipda-radius-large);
  box-shadow: var(--zipda-shadow-app);
  text-align: left;
  cursor: pointer;
}

.property-map-card--selected {
  border-color: var(--zipda-color-primary);
}

.property-map-card__media {
  min-width: 0;
  min-height: 114px;
  overflow: hidden;
  background: #f4f4ef;
}

.property-map-card__image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.property-map-card__image-placeholder {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  padding: 8px;
  color: var(--zipda-color-primary-active);
  background:
    linear-gradient(
      135deg,
      #f4f4ef,
      #e9f5db
    );
  font-size: 11px;
  text-align: center;
}

.property-map-card__content {
  min-width: 0;
  display: grid;
  align-content: center;
  gap: 5px;
  padding: 14px;
}

.property-map-card__type {
  color: var(--zipda-color-primary-active);
  font-size: 11px;
  font-weight: 700;
}

.property-map-card__price {
  overflow: hidden;
  font-size: 17px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.property-map-card__title,
.property-map-card__address {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.property-map-card__title {
  font-size: 13px;
}

.property-map-card__address {
  color: var(--zipda-color-text-muted);
  font-size: 11px;
}

.property-map-list__state {
  display: grid;
  justify-items: center;
  align-content: center;
  gap: 10px;
  min-height: 140px;
  padding: 20px;
  color: var(--zipda-color-text-muted);
  text-align: center;
}

.property-map-list__state--compact {
  min-height: auto;
  padding: 14px;
}

.property-map-list__state p,
.property-map-list__end {
  margin: 0;
}

.property-map-list__retry {
  min-height: 36px;
  padding: 0 16px;
  color: var(--zipda-color-white);
  background: var(--zipda-color-primary);
  border: 0;
  border-radius: 9999px;
  cursor: pointer;
}

.property-map-list__sentinel {
  width: 100%;
  height: 2px;
}

.property-map-list__end {
  padding: 16px;
  color: var(--zipda-color-text-muted);
  font-size: 12px;
  text-align: center;
}

@media (min-width: 768px) {
  .property-map-list {
    position: static;
    grid-template-rows: auto minmax(0, 1fr);
    width: 100%;
    height: 100%;
    min-height: 0;
    padding: 0 24px 24px;
    overflow: hidden;
    background: var(--zipda-color-white);
  }

  .property-map-list__header {
    flex: 0 0 auto;
  }

  .property-map-list__items {
    min-height: 0;
    overflow-y: auto;
    padding: 2px 4px 8px 2px;
    overscroll-behavior: contain;
    scrollbar-gutter: stable;
  }
}
</style>
