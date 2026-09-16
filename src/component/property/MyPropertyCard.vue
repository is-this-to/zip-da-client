<script setup>
import {
  computed,
  ref,
  watch,
} from "vue";

import MyButton from "../button/MyButton.vue";
import PropertyStatusBadge from "./PropertyStatusBadge.vue";

import {
  labelPropertyValue,
  resolvePropertyVerificationMode,
} from "../../constant/property/propertyStatus.js";

import {
  formatPropertyPrice,
} from "../../util/property/formatPropertyPrice.js";

const props = defineProps({
  property: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits([
  "detail",
  "edit",
  "status",
  "delete",
  "verify",
]);

const imageFailed = ref(false);

const price = computed(() =>
  formatPropertyPrice(props.property),
);

const verificationMode = computed(() =>
  resolvePropertyVerificationMode(
    props.property,
  ),
);

const canVerify = computed(() =>
  Boolean(verificationMode.value),
);

/**
 * 내 매물 목록 대표사진
 *
 * 1. 목록 API가 representativeImageUrl을 직접 주면 사용
 * 2. images 중 representative=true 이미지 사용
 * 3. 없으면 sortOrder가 가장 빠른 첫 이미지 사용
 */
const representativeImageUrl = computed(() => {
  const directUrl =
    typeof props.property?.representativeImageUrl === "string"
      ? props.property.representativeImageUrl.trim()
      : "";

  if (directUrl) {
    return directUrl;
  }

  const thumbnailUrl =
    typeof props.property?.thumbnailUrl === "string"
      ? props.property.thumbnailUrl.trim()
      : "";

  if (thumbnailUrl) {
    return thumbnailUrl;
  }

  const images = Array.isArray(
    props.property?.images,
  )
    ? props.property.images
    : [];

  if (!images.length) {
    return "";
  }

  const representative =
    images.find(
      (image) =>
        image?.representative === true &&
        typeof image?.imageUrl === "string" &&
        image.imageUrl.trim(),
    );

  if (representative) {
    return representative.imageUrl.trim();
  }

  const firstImage = [...images]
    .filter(
      (image) =>
        typeof image?.imageUrl === "string" &&
        image.imageUrl.trim(),
    )
    .sort(
      (a, b) =>
        Number(a?.sortOrder ?? 9999) -
        Number(b?.sortOrder ?? 9999),
    )[0];

  return firstImage?.imageUrl?.trim() ?? "";
});

const hasImage = computed(() =>
  Boolean(representativeImageUrl.value) &&
  !imageFailed.value,
);

const updatedAtText = computed(() => {
  if (!props.property?.updatedAt) {
    return "-";
  }

  return new Date(
    props.property.updatedAt,
  ).toLocaleString("ko-KR");
});

const openDetail = () => {
  emit("detail", props.property);
};

watch(
  () => representativeImageUrl.value,
  () => {
    imageFailed.value = false;
  },
);
</script>

<template>
  <article
    class="property-card"
    role="link"
    tabindex="0"
    @click="openDetail"
    @keydown.enter.self.prevent="openDetail"
    @keydown.space.self.prevent="openDetail"
  >
    <!-- 대표사진 -->
    <div class="property-card__media">
      <img
        v-if="hasImage"
        class="property-card__image"
        :src="representativeImageUrl"
        :alt="`${property.title || '매물'} 대표 이미지`"
        loading="lazy"
        decoding="async"
        @error="imageFailed = true"
      >

      <div
        v-else
        class="property-card__image-placeholder"
        role="img"
        aria-label="대표 이미지 없음"
      >
        이미지 없음
      </div>

      <span
        class="property-card__version"
      >
        v{{ property.version }}
      </span>
    </div>

    <div class="property-card__body">
      <div class="property-card__heading">
        <p class="property-card__meta">
          {{
            labelPropertyValue(
              "propertyType",
              property.propertyType,
            )
          }}
          ·
          {{
            labelPropertyValue(
              "publisherType",
              property.publisherType,
            )
          }}
        </p>

        <h2>
          {{ property.title }}
        </h2>

        <strong class="property-card__price">
          {{ price }}
        </strong>
      </div>

      <div
        class="property-card__statuses"
        aria-label="매물 상태"
      >
        <PropertyStatusBadge
          group="publicationStatus"
          :value="property.publicationStatus"
        />

        <PropertyStatusBadge
          group="transactionStatus"
          :value="property.transactionStatus"
        />

        <PropertyStatusBadge
          group="verificationStatus"
          :value="property.verificationStatus"
        />
      </div>

      <p class="property-card__updated">
        최근 수정 {{ updatedAtText }}
      </p>

      <!--
        관리 버튼 클릭 시
        카드의 상세페이지 이동은 실행하지 않는다.
      -->
      <div
        class="property-card__actions"
        @click.stop
        @keydown.stop
      >
        <MyButton
          size="small"
          variant="outline"
          @click="emit('edit', property)"
        >
          수정
        </MyButton>

        <MyButton
          v-if="
            property.transactionStatus !==
            'COMPLETED'
          "
          size="small"
          variant="outline"
          @click="emit('status', property)"
        >
          거래 상태
        </MyButton>

        <MyButton
          v-if="canVerify"
          size="small"
          variant="subtle"
          @click="
            emit(
              'verify',
              property,
              verificationMode,
            )
          "
        >
          {{
            verificationMode ===
            "reverification"
              ? "재검증"
              : "검증 신청"
          }}
        </MyButton>

        <MyButton
          size="small"
          variant="danger"
          @click="emit('delete', property)"
        >
          삭제
        </MyButton>
      </div>
    </div>
  </article>
</template>

<style scoped>
.property-card {
  width: 100%;
  overflow: hidden;

  color: var(--zipda-color-text);
  background:
    var(--zipda-color-surface);

  border:
    1px solid var(--zipda-color-border);
  border-radius:
    var(--zipda-radius-large);

  cursor: pointer;

  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.property-card:focus-visible {
  outline: none;
  box-shadow: var(--zipda-focus-ring);
}

.property-card__media {
  position: relative;

  width: 100%;
  aspect-ratio: 16 / 10;

  overflow: hidden;
  background: #f4f4ef;
}

.property-card__image {
  display: block;

  width: 100%;
  height: 100%;

  object-fit: cover;
}

.property-card__image-placeholder {
  display: grid;
  place-items: center;

  width: 100%;
  height: 100%;

  color:
    var(--zipda-color-primary-active);

  background:
    linear-gradient(
      135deg,
      #f4f4ef,
      #e9f5db
    );

  font-size: 13px;
}

.property-card__version {
  position: absolute;
  top: 10px;
  right: 10px;

  padding: 4px 8px;

  color: #ffffff;
  background: rgb(0 0 0 / 55%);

  border-radius: 9999px;

  font-size: 11px;
}

.property-card__body {
  display: grid;
  gap: 14px;

  padding: 16px;
}

.property-card__heading {
  display: grid;
  gap: 4px;
}

.property-card__heading h2 {
  margin: 0;

  overflow: hidden;

  font-size: 17px;
  line-height: 1.45;

  text-overflow: ellipsis;
  white-space: nowrap;
}

.property-card__meta,
.property-card__updated {
  margin: 0;

  color:
    var(--zipda-color-text-muted);

  font-size: 12px;
}

.property-card__price {
  display: block;

  margin-top: 4px;

  font-size: 17px;
}

.property-card__statuses,
.property-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

@media (hover: hover) {
  .property-card:hover {
    transform: translateY(-1px);
    box-shadow: var(--zipda-shadow-app);
  }
}
</style>