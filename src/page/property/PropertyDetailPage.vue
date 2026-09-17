<script setup>
import {
  computed,
  ref,
  watch,
} from "vue";
import {
  useRoute,
  useRouter,
} from "vue-router";

import HeartIcon from "../../component/icon/HeartIcon.vue";
import { useAuthStore } from "../../store/auth/useAuthStore.js";
import { usePropertyDetailStore } from "../../store/property/usePropertyDetailStore.js";
import {
  formatKoreanAmount,
  formatPropertyPrice,
} from "../../util/property/formatPropertyPrice.js";

const route = useRoute();
const router = useRouter();

const store = usePropertyDetailStore();
const authStore = useAuthStore();

const imageIndex = ref(0);
const failedImages = ref(new Set());

const favoriteError = ref("");
const shareMessage = ref("");

const detail = computed(() => store.detail);

const isMyPropertyView = computed(() =>
  route.path.startsWith("/my-properties/"),
);

const images = computed(() =>
  Array.isArray(detail.value?.images)
    ? detail.value.images
    : [],
);

const activeImage = computed(
  () => images.value[imageIndex.value],
);

const imageUrl = computed(() => {
  const value = activeImage.value?.imageUrl;

  return typeof value === "string"
    ? value.trim()
    : "";
});

const hasImage = computed(() =>
  Boolean(imageUrl.value) &&
  !failedImages.value.has(imageIndex.value),
);

const price = computed(() =>
  formatPropertyPrice(detail.value),
);

const addressText = computed(() => {
  const item = detail.value;

  if (!item) {
    return "";
  }

  return (
    item.publicAddress ||
    item.address?.roadAddress ||
    item.address?.jibunAddress ||
    ""
  );
});

const publisherLabel = computed(() => {
  const labels = {
    DIRECT_OWNER: "집주인 직접 등록 매물",
    DIRECT_TENANT: "세입자 직접 등록 매물",
    AGENT_BROKERAGE: "중개 등록 매물",
  };

  return (
    labels[detail.value?.publisherType] ??
    ""
  );
});

const propertyTypeLabel = computed(() => {
  const labels = {
    APARTMENT: "아파트",
    OFFICETEL: "오피스텔",
    VILLA: "빌라",
    ROOM: "원룸·투룸+",
  };

  return (
    labels[detail.value?.propertyType] ??
    detail.value?.propertyType ??
    ""
  );
});

const facts = computed(() => {
  const item = detail.value;

  if (!item) {
    return [];
  }

  const roomBathroom = [
    item.roomCount != null
      ? `방 ${item.roomCount}개`
      : null,
    item.bathroomCount != null
      ? `욕실 ${item.bathroomCount}개`
      : null,
  ]
    .filter(Boolean)
    .join(" / ");

  const rows = [
    [
      "전용 면적",
      item.exclusiveArea,
      (value) => `${value}㎡`,
    ],
    [
      "층",
      item.floor,
      (value) =>
        `${value}층${
          item.totalFloor != null
            ? ` / ${item.totalFloor}층`
            : ""
        }`,
    ],
    [
      "방·욕실",
      roomBathroom,
      String,
    ],
    [
      "방향",
      item.direction,
      String,
    ],
    [
      "층 조건",
      item.floorCondition,
      String,
    ],
    [
      "관리비",
      item.maintenanceFee,
      formatKoreanAmount,
    ],
    [
      "공급 면적",
      item.supplyArea,
      (value) => `${value}㎡`,
    ],
    [
      "건물 용도",
      item.buildingUse,
      String,
    ],
    [
      "사용승인일",
      item.approvalDate,
      String,
    ],
    [
      "주차",
      item.isParkingAvailable,
      (value) =>
        value ? "가능" : "불가",
    ],
    [
      "엘리베이터",
      item.hasElevator,
      (value) =>
        value ? "있음" : "없음",
    ],
    [
      "반려동물",
      item.isPetAllowed,
      (value) =>
        value ? "가능" : "불가",
    ],
  ];

  return rows
    .filter(
      ([, value]) =>
        value !== null &&
        value !== undefined &&
        value !== "",
    )
    .map(
      ([label, value, format]) => ({
        label,
        value: format(value),
      }),
    );
});

const loadDetail = () => {
  const propertyId = route.params.propertyId;

  if (!propertyId) {
    return;
  }

  store.load(
    propertyId,
    {
      own: isMyPropertyView.value,
    },
  );
};

watch(
  [
    () => route.params.propertyId,
    () => route.path,
  ],
  () => {
    imageIndex.value = 0;
    failedImages.value = new Set();
    favoriteError.value = "";
    shareMessage.value = "";

    loadDetail();
  },
  {
    immediate: true,
  },
);

const changeImage = (offset) => {
  if (!images.value.length) {
    return;
  }

  imageIndex.value =
    (
      imageIndex.value +
      offset +
      images.value.length
    ) %
    images.value.length;
};

const markImageFailed = () => {
  failedImages.value = new Set([
    ...failedImages.value,
    imageIndex.value,
  ]);
};

const goBack = () => {
  if (isMyPropertyView.value) {
    router.push("/my-properties");
    return;
  }

  if (window.history.length > 1) {
    router.back();
    return;
  }

  router.push("/properties");
};

const goEdit = () => {
  if (!detail.value?.propertyId) {
    return;
  }

  router.push(
    `/properties/${encodeURIComponent(
      String(detail.value.propertyId),
    )}/edit`,
  );
};

const share = async () => {
  if (isMyPropertyView.value) {
    return;
  }

  const url = window.location.href;

  try {
    if (navigator.share) {
      await navigator.share({
        title:
          detail.value?.title ||
          "매물",
        url,
      });
    } else {
      await navigator.clipboard.writeText(
        url,
      );

      shareMessage.value =
        "링크를 복사했습니다.";
    }
  } catch (error) {
    if (error?.name !== "AbortError") {
      shareMessage.value =
        "공유할 수 없습니다.";
    }
  }
};

const toggleFavorite = async () => {
  if (isMyPropertyView.value) {
    return;
  }

  if (!authStore.isLoggedIn) {
    router.push("/sign-in");
    return;
  }

  try {
    favoriteError.value = "";

    await store.toggleFavorite();
  } catch {
    favoriteError.value =
      "찜 상태를 변경하지 못했습니다. 다시 시도해 주세요.";
  }
};
</script>

<template>
  <section class="property-detail">
    <header class="property-detail__header">
      <button
        type="button"
        class="property-detail__icon"
        aria-label="뒤로가기"
        @click="goBack"
      >
        ←
      </button>

      <strong>매물 상세</strong>

      <div class="property-detail__header-actions">
        <button
          v-if="!isMyPropertyView"
          type="button"
          class="property-detail__icon"
          aria-label="공유"
          @click="share"
        >
          ↗
        </button>

        <button
          v-if="detail && !isMyPropertyView"
          type="button"
          class="property-detail__icon property-detail__heart"
          :class="{
            'property-detail__heart--active':
              detail.isFavorite,
          }"
          :aria-label="
            detail.isFavorite
              ? '찜 해제'
              : '찜하기'
          "
          :aria-pressed="detail.isFavorite"
          @click="toggleFavorite"
        >
          <HeartIcon
            :filled="Boolean(detail.isFavorite)"
            class="property-detail__heart-svg"
          />
        </button>
      </div>
    </header>

    <p
      v-if="shareMessage"
      class="property-detail__notice"
      role="status"
    >
      {{ shareMessage }}
    </p>

    <div
      v-if="store.isLoading"
      class="property-detail__state"
      role="status"
    >
      매물 정보를 불러오는 중입니다.
    </div>

    <div
      v-else-if="store.error"
      class="property-detail__state"
      role="alert"
    >
      <p>
        {{
          isMyPropertyView
            ? "내 매물 정보를 불러오지 못했습니다."
            : "공개 매물 정보를 불러오지 못했습니다."
        }}
      </p>

      <button
        type="button"
        @click="loadDetail"
      >
        다시 시도
      </button>
    </div>

    <template v-else-if="detail">
      <section
        class="property-detail__gallery"
        aria-label="매물 이미지"
      >
        <button
          type="button"
          class="property-detail__gallery-button"
          :class="{
            'property-detail__gallery-button--hidden':
              images.length <= 1,
          }"
          :disabled="images.length <= 1"
          aria-label="이전 이미지"
          @click="changeImage(-1)"
        >
          ‹
        </button>

        <div class="property-detail__gallery-viewport">
          <img
            v-if="hasImage"
            class="property-detail__image"
            :src="imageUrl"
            :alt="`${detail.title || '매물'} 이미지 ${imageIndex + 1}`"
            @error="markImageFailed"
          >

          <div
            v-else
            class="property-detail__fallback"
            role="img"
            aria-label="매물 이미지 없음"
          >
            이미지 없음
          </div>

          <span
            v-if="images.length"
            class="property-detail__counter"
          >
            {{ imageIndex + 1 }} /
            {{ images.length }}
          </span>
        </div>

        <button
          type="button"
          class="property-detail__gallery-button"
          :class="{
            'property-detail__gallery-button--hidden':
              images.length <= 1,
          }"
          :disabled="images.length <= 1"
          aria-label="다음 이미지"
          @click="changeImage(1)"
        >
          ›
        </button>
      </section>

      <section
        class="property-detail__section property-detail__summary"
      >
        <span class="property-detail__eyebrow">
          {{ propertyTypeLabel }}
        </span>

        <strong class="property-detail__price">
          {{ price }}
        </strong>

        <p
          v-if="addressText"
          class="property-detail__address"
        >
          {{ addressText }}
        </p>

        <h1>
          {{ detail.title || "매물" }}
        </h1>

        <p
          v-if="!isMyPropertyView"
          class="property-detail__favorite-count"
        >
          찜 {{ detail.favoriteCount ?? 0 }}명
        </p>
      </section>

      <section
        v-if="facts.length"
        class="property-detail__section"
      >
        <h2>매물 정보</h2>

        <dl class="property-detail__facts">
          <div
            v-for="fact in facts"
            :key="fact.label"
          >
            <dt>{{ fact.label }}</dt>
            <dd>{{ fact.value }}</dd>
          </div>
        </dl>
      </section>

      <section
        v-if="detail.options?.length"
        class="property-detail__section"
      >
        <h2>옵션</h2>

        <div class="property-detail__options">
          <span
            v-for="option in detail.options"
            :key="option.optionCode"
            class="property-detail__option"
          >
            {{ option.optionName }}
            {{
              option.optionValue === "true"
                ? " · 있음"
                : option.optionValue === "false"
                  ? " · 없음"
                  : option.optionValue
                    ? ` · ${option.optionValue}`
                    : ""
            }}
          </span>
        </div>
      </section>

      <section
        v-if="publisherLabel"
        class="property-detail__section"
      >
        <h2>등록 정보</h2>

        <div class="property-detail__publisher">
          {{ publisherLabel }}
        </div>
      </section>

      <section
        v-if="detail.description"
        class="property-detail__section property-detail__description"
      >
        <h2>상세 설명</h2>

        <p>
          {{ detail.description }}
        </p>
      </section>

      <p
        v-if="favoriteError"
        class="property-detail__notice"
        role="alert"
      >
        {{ favoriteError }}
      </p>

      <!-- 내가 올린 매물 -->
      <footer
        v-if="isMyPropertyView"
        class="property-detail__actions property-detail__actions--management"
      >
        <button
          type="button"
          class="property-detail__secondary-action"
          @click="router.push('/my-properties')"
        >
          내 매물 목록
        </button>

        <button
          type="button"
          class="property-detail__edit-action"
          @click="goEdit"
        >
          수정
        </button>
      </footer>

      <!-- 공개 매물 -->
      <footer
        v-else
        class="property-detail__actions"
      >
        <button
          type="button"
          class="property-detail__favorite-action"
          :class="{
            'property-detail__favorite-action--active':
              detail.isFavorite,
          }"
          :aria-pressed="detail.isFavorite"
          @click="toggleFavorite"
        >
          <HeartIcon
            :filled="Boolean(detail.isFavorite)"
            class="property-detail__favorite-action-icon"
          />

          <span>
            {{
              detail.isFavorite
                ? "찜 해제"
                : "찜하기"
            }}
          </span>
        </button>

        <button
          type="button"
          class="property-detail__contact"
          disabled
        >
          문의 정보 없음
        </button>
      </footer>
    </template>
  </section>
</template>

<style scoped>
.property-detail {
  width: 100%;
  max-width: 720px;
  min-height: 100dvh;
  margin: 0 auto;
  padding-bottom:
    calc(
      92px +
      env(safe-area-inset-bottom)
    );
  background: var(--zipda-color-white);
}

.property-detail__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--zipda-header-height);
  padding: 0 16px;
  background: var(--zipda-color-white);
  border-bottom:
    1px solid var(--zipda-color-border);
}

.property-detail__header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.property-detail__icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  padding: 0;
  color: var(--zipda-color-text);
  background: none;
  border: 0;
  font-size: 24px;
  cursor: pointer;
}

.property-detail__heart {
  color: var(--zipda-color-text-muted);
}

.property-detail__heart--active {
  color: #d93b32;
}

.property-detail__heart-svg {
  width: 22px;
  height: 21px;
}

.property-detail__gallery {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) 42px;
  align-items: center;
  gap: 8px;

  width: 100%;
  padding: 12px 8px;

  background: var(--zipda-color-white);
}

.property-detail__gallery-viewport {
  position: relative;

  width: 100%;
  aspect-ratio: 4 / 3;

  overflow: hidden;

  background: #f4f4ef;
  border-radius: var(--zipda-radius-large);
}

.property-detail__image,
.property-detail__fallback {
  display: block;

  width: 100%;
  height: 100%;

  object-fit: cover;
}

.property-detail__fallback {
  display: grid;
  place-items: center;

  color: var(--zipda-color-primary-active);

  background:
    linear-gradient(
      135deg,
      #f4f4ef,
      #e9f5db
    );
}

.property-detail__gallery-button {
  display: grid;
  place-items: center;

  width: 38px;
  height: 38px;
  padding: 0;

  color: var(--zipda-color-text);
  background: var(--zipda-color-white);

  border: 1px solid var(--zipda-color-border);
  border-radius: 50%;

  font-size: 26px;
  line-height: 1;

  cursor: pointer;
}

.property-detail__gallery-button--hidden {
  visibility: hidden;
  pointer-events: none;
}

.property-detail__counter {
  position: absolute;
  right: 10px;
  bottom: 10px;

  padding: 5px 9px;

  color: white;
  background: rgb(0 0 0 / 60%);

  border-radius: 9999px;

  font-size: 12px;
}

.property-detail__section {
  padding:
    24px
    var(--zipda-page-padding);
  border-bottom:
    1px solid var(--zipda-color-border);
}

.property-detail__section h1 {
  margin: 14px 0 0;
  font-size: 18px;
  font-weight: 600;
}

.property-detail__section h2 {
  margin: 0 0 20px;
  font-size: 18px;
}

.property-detail__eyebrow {
  color: var(--zipda-color-primary-active);
  font-size: 13px;
  font-weight: 700;
}

.property-detail__price {
  display: block;
  margin-top: 8px;
  font-size: clamp(24px, 7vw, 30px);
  font-weight: 800;
}

.property-detail__address {
  margin: 10px 0;
  color: var(--zipda-color-text-muted);
}

.property-detail__favorite-count {
  margin: 8px 0 0;
  color: var(--zipda-color-text-muted);
  font-size: 12px;
}

.property-detail__facts {
  display: grid;
  grid-template-columns:
    repeat(2, minmax(0, 1fr));
  gap: 20px 12px;
  margin: 0;
}

.property-detail__facts div {
  min-width: 0;
}

.property-detail__facts dt {
  color: var(--zipda-color-text-muted);
  font-size: 12px;
}

.property-detail__facts dd {
  margin: 5px 0 0;
  overflow-wrap: anywhere;
  font-weight: 600;
}

.property-detail__options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.property-detail__option {
  padding: 8px 12px;
  background:
    var(--zipda-color-subtle-background);
  border-radius: 18px;
  font-size: 13px;
}

.property-detail__publisher {
  padding: 18px;
  color:
    var(--zipda-color-primary-active);
  background:
    var(--zipda-color-primary-light);
  border-radius:
    var(--zipda-radius-large);
  font-weight: 700;
}

.property-detail__description p {
  margin: 0;
  padding: 18px;
  overflow-wrap: anywhere;
  background:
    var(--zipda-color-subtle-background);
  border-radius:
    var(--zipda-radius-large);
  line-height: 1.7;
  white-space: pre-line;
}

.property-detail__state {
  padding: 36px 20px;
  text-align: center;
}

.property-detail__notice {
  margin: 0;
  padding: 10px 20px;
  color:
    var(--zipda-color-primary-active);
  font-size: 13px;
}

.property-detail__actions {
  position: fixed;
  z-index: 10;
  bottom: 0;
  left: 50%;

  display: grid;
  grid-template-columns:
    112px minmax(0, 1fr);
  gap: 10px;

  width: 100%;
  max-width: 720px;

  padding:
    12px
    var(--zipda-page-padding)
    calc(
      12px +
      env(safe-area-inset-bottom)
    );

  background:
    var(--zipda-color-white);
  border-top:
    1px solid var(--zipda-color-border);

  transform: translateX(-50%);
}

.property-detail__actions--management {
  grid-template-columns:
    repeat(2, minmax(0, 1fr));
}

.property-detail__actions button {
  min-height: 48px;
  border-radius:
    var(--zipda-radius-medium);
  font-weight: 700;
}

.property-detail__favorite-action {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;

  color: var(--zipda-color-text);
  background: white;
  border:
    1px solid var(--zipda-color-border);
  cursor: pointer;
}

.property-detail__favorite-action--active {
  color: #d93b32;
  border-color: #d93b32;
}

.property-detail__favorite-action-icon {
  width: 20px;
  height: 19px;
}

.property-detail__contact {
  color: var(--zipda-color-text-muted);
  background:
    var(--zipda-color-subtle-background);
  border: 0;
}

.property-detail__secondary-action {
  color: var(--zipda-color-text);
  background: white;
  border:
    1px solid var(--zipda-color-border);
  cursor: pointer;
}

.property-detail__edit-action {
  color: white;
  background:
    var(--zipda-color-primary-active);
  border:
    1px solid
    var(--zipda-color-primary-active);
  cursor: pointer;
}

/*
 * 모바일에서는 4:3으로 사진을 충분히 보여주고,
 * 화면이 넓어지면 16:9로 낮춰
 * PC에서 사진이 과도하게 커지는 것을 방지한다.
 */
@media (min-width: 640px) {
  .property-detail__gallery-viewport {
    aspect-ratio: 16 / 9;
  }

  .property-detail__section {
    padding-top: 28px;
    padding-bottom: 28px;
  }
}
</style>