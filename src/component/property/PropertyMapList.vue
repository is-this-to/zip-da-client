<script setup>
import { nextTick, watch } from "vue";

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
});

const emit = defineEmits(["select-property"]);
const cardElements = new Map();

const propertyTypeLabel = (propertyType) => {
  const labels = {
    APARTMENT: "아파트",
    OFFICETEL: "오피스텔",
    VILLA: "빌라",
    ROOM: "원룸·투룸+",
  };

  return labels[propertyType] ?? propertyType;
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

watch(
  () => props.selectedPropertyId,
  async (propertyId) => {
    if (propertyId === null) {
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
</script>

<template>
  <section
    v-if="items.length > 0"
    class="property-map-list"
    aria-label="현재 지도 영역의 매물"
  >
    <div class="property-map-list__header">
      <strong>현재 지도 매물</strong>
      <span>{{ items.length }}개 표시</span>
    </div>

    <div class="property-map-list__items">
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
      </button>
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

.property-map-list__header span {
  color: var(--zipda-color-text-muted);
}

.property-map-list__items {
  display: grid;
  gap: 10px;
}

.property-map-card {
  width: 100%;
  display: grid;
  gap: 5px;
  padding: 14px;
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

.property-map-card__type {
  color: var(--zipda-color-primary-active);
  font-size: 11px;
  font-weight: 700;
}

.property-map-card__price {
  font-size: 17px;
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
