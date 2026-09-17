<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

import MyButton from "../button/MyButton.vue";
import MyInput from "../input/MyInput.vue";
import { usePropertyRegistrationLocationStore } from "../../store/property/usePropertyRegistrationLocationStore.js";
import PropertyLocationPreviewMap from "./PropertyLocationPreviewMap.vue";

const props = defineProps({
  propertyType: { type: String, required: true },
  initialValue: { type: Object, default: null },
});

const emit = defineEmits(["back", "complete"]);
const locationStore = usePropertyRegistrationLocationStore();

const addressQuery = ref("");
const selectedAddress = ref(null);
const complexKeyword = ref("");
const selectedApartmentComplexId = ref(null);
const localErrorMessage = ref("");
const mapErrorMessage = ref("");

const isApartment = computed(() => props.propertyType === "APARTMENT");
const validatedLocation = computed(() => locationStore.validatedLocation);
const isBusy = computed(() =>
  locationStore.isAddressLoading ||
  locationStore.isValidationLoading ||
  locationStore.isComplexLoading,
);
const canComplete = computed(() =>
  locationStore.hasValidatedLocation &&
  (!isApartment.value || selectedApartmentComplexId.value != null),
);

const addressKey = (address) => [
  address?.roadAddress,
  address?.jibunAddress,
  address?.legalDongCode,
  address?.longitude,
  address?.latitude,
].join("|");

const addressLabel = (address) =>
  address?.roadAddress || address?.jibunAddress || "";

const searchAddresses = async () => {
  localErrorMessage.value = "";
  selectedAddress.value = null;
  selectedApartmentComplexId.value = null;
  locationStore.clearLocationSelection();

  if (addressQuery.value.trim().length < 2) {
    localErrorMessage.value = "주소를 두 글자 이상 입력해 주세요.";
    return;
  }

  try {
    await locationStore.searchAddresses(addressQuery.value);
  } catch {
    // Store의 사용자 메시지를 화면에서 표시한다.
  }
};

const loadApartmentComplexes = async () => {
  if (!validatedLocation.value?.regionId || !isApartment.value) return;
  try {
    await locationStore.searchApartmentComplexes({
      regionId: validatedLocation.value.regionId,
      keyword: complexKeyword.value,
      size: 20,
    });
  } catch {
    // Store의 사용자 메시지를 화면에서 표시한다.
  }
};

const selectAddress = async (address) => {
  localErrorMessage.value = "";
  mapErrorMessage.value = "";
  selectedAddress.value = address;
  addressQuery.value = addressLabel(address);
  selectedApartmentComplexId.value = null;

  try {
    const location = await locationStore.validateAddress(address);
    if (location && isApartment.value) await loadApartmentComplexes();
  } catch {
    // Store의 사용자 메시지를 화면에서 표시한다.
  }
};

const selectApartmentComplex = (complex) => {
  selectedApartmentComplexId.value = String(complex.apartmentComplexId);
};

const complete = () => {
  if (!canComplete.value) {
    localErrorMessage.value = isApartment.value
      ? "검증된 주소와 아파트 단지를 선택해 주세요."
      : "검증된 주소를 선택해 주세요.";
    return;
  }

  emit("complete", {
    regionId: String(validatedLocation.value.regionId),
    apartmentComplexId: isApartment.value
      ? String(selectedApartmentComplexId.value)
      : null,
    address: {
      roadAddress: validatedLocation.value.roadAddress || null,
      jibunAddress: validatedLocation.value.jibunAddress || null,
      legalDongCode: validatedLocation.value.legalDongCode,
      longitude: validatedLocation.value.longitude,
      latitude: validatedLocation.value.latitude,
    },
  });
};

watch(isApartment, async (apartment) => {
  selectedApartmentComplexId.value = null;
  complexKeyword.value = "";
  locationStore.apartmentComplexItems = [];
  if (apartment && validatedLocation.value?.regionId) {
    await loadApartmentComplexes();
  }
});

watch(addressQuery, (query) => {
  if (
    selectedAddress.value &&
    query.trim() !== addressLabel(selectedAddress.value)
  ) {
    selectedAddress.value = null;
    selectedApartmentComplexId.value = null;
    locationStore.clearLocationSelection();
  }
});

watch(complexKeyword, () => {
  selectedApartmentComplexId.value = null;
});

onMounted(async () => {
  locationStore.reset();
  const initialAddress = props.initialValue?.address;
  const initialRegionId = props.initialValue?.regionId;

  if (!initialAddress || !initialRegionId) return;

  selectedAddress.value = { ...initialAddress };
  addressQuery.value = addressLabel(initialAddress);
  selectedApartmentComplexId.value = props.initialValue.apartmentComplexId == null
    ? null
    : String(props.initialValue.apartmentComplexId);
  locationStore.hydrateValidatedLocation({
    regionId: String(initialRegionId),
    ...initialAddress,
  });

  if (isApartment.value) await loadApartmentComplexes();
});

onBeforeUnmount(() => {
  locationStore.reset();
});
</script>

<template>
  <section class="property-location-step" aria-label="주소 및 단지 선택">
    <form class="search-form" @submit.prevent="searchAddresses">
      <MyInput
        v-model="addressQuery"
        label="주소 검색"
        placeholder="도로명 또는 지번 주소를 입력해 주세요"
        autocomplete="street-address"
        required
      >
        <template #trailing>
          <MyButton
            type="submit"
            size="small"
            :loading="locationStore.isAddressLoading"
          >검색</MyButton>
        </template>
      </MyInput>
    </form>

    <div v-if="locationStore.addressItems.length" class="selection-section">
      <h2>주소 검색 결과</h2>
      <div class="selection-list">
        <button
          v-for="address in locationStore.addressItems"
          :key="addressKey(address)"
          type="button"
          class="selection-card"
          :class="{
            'selection-card--selected':
              addressKey(selectedAddress) === addressKey(address),
          }"
          :aria-pressed="addressKey(selectedAddress) === addressKey(address)"
          @click="selectAddress(address)"
        >
          <strong>{{ addressLabel(address) }}</strong>
          <span v-if="address.roadAddress && address.jibunAddress">
            지번 {{ address.jibunAddress }}
          </span>
          <span v-if="address.buildingName">{{ address.buildingName }}</span>
        </button>
      </div>
    </div>

    <p
      v-else-if="addressQuery && !locationStore.isAddressLoading"
      class="empty-message"
    >
      검색 버튼을 눌러 주소를 확인해 주세요.
    </p>

    <div
      v-if="locationStore.isValidationLoading"
      class="info-box"
      aria-live="polite"
    >
      주소와 내부 Region 경계를 확인하고 있습니다.
    </div>

    <template v-if="validatedLocation">
      <div class="validation-result" aria-live="polite">
        <strong>주소 검증이 완료되었습니다.</strong>
        <span>{{ validatedLocation.fullRegionName }}</span>
      </div>

      <PropertyLocationPreviewMap
        :latitude="validatedLocation.latitude"
        :longitude="validatedLocation.longitude"
        @map-error="mapErrorMessage = '지도 미리보기를 표시하지 못했습니다.'"
      />
      <p v-if="mapErrorMessage" class="text-error" role="alert">
        {{ mapErrorMessage }}
      </p>

      <div v-if="isApartment" class="selection-section">
        <form class="search-form" @submit.prevent="loadApartmentComplexes">
          <MyInput
            v-model="complexKeyword"
            label="아파트 단지"
            placeholder="단지명 또는 주소를 입력해 주세요"
            required
          >
            <template #trailing>
              <MyButton
                type="submit"
                size="small"
                :loading="locationStore.isComplexLoading"
              >검색</MyButton>
            </template>
          </MyInput>
        </form>

        <div v-if="locationStore.apartmentComplexItems.length" class="selection-list">
          <button
            v-for="complex in locationStore.apartmentComplexItems"
            :key="complex.apartmentComplexId"
            type="button"
            class="selection-card"
            :class="{
              'selection-card--selected':
                selectedApartmentComplexId === String(complex.apartmentComplexId),
            }"
            :aria-pressed="selectedApartmentComplexId === String(complex.apartmentComplexId)"
            @click="selectApartmentComplex(complex)"
          >
            <strong>{{ complex.complexName }}</strong>
            <span>{{ complex.roadAddress || complex.jibunAddress }}</span>
            <span>
              {{ complex.totalBuildings ?? 0 }}개 동 ·
              {{ complex.totalHouseholds ?? 0 }}세대
            </span>
          </button>
        </div>
        <p
          v-else-if="!locationStore.isComplexLoading"
          class="empty-message"
        >
          이 Region에서 선택할 수 있는 아파트 단지가 없습니다.
        </p>
      </div>

      <div v-else class="info-box">
        아파트가 아닌 매물은 단지를 선택하지 않습니다.
      </div>

      <p class="privacy-message">
        정확한 주소와 좌표는 등록 검증에만 사용하며 공개 화면에는 비식별 위치가 표시됩니다.
      </p>
    </template>

    <div
      v-if="localErrorMessage || locationStore.errorMessage"
      class="error-box"
      role="alert"
    >
      {{ localErrorMessage || locationStore.errorMessage }}
    </div>

    <div class="form-actions form-actions--step location-actions">
      <MyButton variant="outline" :disabled="isBusy" @click="emit('back')">
        이전
      </MyButton>
      <MyButton :disabled="!canComplete || isBusy" @click="complete">
        검증 후 다음
      </MyButton>
    </div>
  </section>
</template>

<style scoped>
.property-location-step,
.selection-section,
.search-form,
.selection-list {
  display: grid;
  gap: 12px;
}

.selection-section h2 {
  font-size: 16px;
}

.selection-list {
  max-height: 320px;
  overflow-y: auto;
}

.selection-card {
  display: grid;
  gap: 5px;
  width: 100%;
  padding: 15px;
  color: var(--zipda-color-text);
  text-align: left;
  background: var(--zipda-color-white);
  border: 1px solid var(--zipda-color-border);
  border-radius: var(--zipda-radius-large);
  cursor: pointer;
}

.selection-card span,
.empty-message,
.privacy-message {
  color: var(--zipda-color-text-muted);
  font-size: 13px;
  line-height: 1.5;
}

.selection-card--selected {
  background: #f6faef;
  border-color: var(--zipda-color-primary);
  box-shadow: var(--zipda-focus-ring);
}

.selection-card:focus-visible {
  outline: none;
  box-shadow: var(--zipda-focus-ring);
}

.validation-result {
  display: grid;
  gap: 5px;
  padding: 15px;
  color: var(--zipda-color-primary-active);
  background: var(--zipda-color-primary-light);
  border-radius: var(--zipda-radius-large);
}

.validation-result span {
  color: var(--zipda-color-text-muted);
  font-size: 13px;
}

.location-actions {
  position: sticky;
  bottom: 0;
  z-index: 10;
  width: calc(100% + var(--zipda-page-padding) + var(--zipda-page-padding));
  margin: 0 calc(var(--zipda-page-padding) * -1) -40px;
  padding: 12px var(--zipda-page-padding) calc(12px + env(safe-area-inset-bottom));
  background: linear-gradient(
    to bottom,
    rgb(255 255 255 / 75%),
    var(--zipda-color-white) 24%
  );
}
</style>
