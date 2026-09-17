<script setup>
// 임호탁 파트 (매물 등록 1·2·5단계와 팀원 담당 3·4단계 연결 흐름)
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import Header from "../../component/Header.vue";
import MyButton from "../../component/button/MyButton.vue";
import PropertyAddressComplexStep from "../../component/property/PropertyAddressComplexStep.vue";
import PropertyCoreForm from "../../component/property/PropertyCoreForm.vue";
import PropertyRegistrationStep4 from "../../component/property/PropertyRegistrationStep4.vue";
import { PROPERTY_LABELS } from "../../constant/property/propertyStatus.js";
import {
  createPropertyCreateRequest,
  isRegistrationBackDisabled,
} from "../../store/property/propertyRequestPolicy.js";
import { usePropertyManagementStore } from "../../store/property/usePropertyManagementStore.js";
import { useAuthStore } from "../../store/auth/useAuthStore.js";
import { formatPropertyPrice } from "../../util/property/formatPropertyPrice.js";
import {
  hasPropertyIntegrationData,
  hasPropertyLocationData,
  validatePropertyCore,
} from "../../util/validator/property/propertyValidator.js";

const router = useRouter();
const store = usePropertyManagementStore();
const authStore = useAuthStore();

const step = ref(1);
const errors = ref({});
const confirmedFacts = ref(false);
const confirmedEvidence = ref(false);
const step4ImageUploadBusy = ref(false);
const step4 = ref(null);
const hasVisitedStep4 = ref(false);

watch(step, (currentStep) => {
  if (currentStep === 4) {
    hasVisitedStep4.value = true;
  }
});

const form = ref({
  publisherType: "",
  propertyType: "",
  transactionType: "",
  salePrice: "",
  deposit: "",
  monthlyRent: "",
  maintenanceFee: "",
  isParkingAvailable: false,
  hasElevator: false,
  isPetAllowed: false,
  supplyArea: "",
  exclusiveArea: "",
  roomCount: "",
  bathroomCount: "",
  floor: "",
  totalFloor: "",
  floorCondition: "",
  direction: "",
  approvalDate: "",
  buildingUse: "",
  title: "",
  description: "",
});

const role = computed(() =>
  String(authStore.role).replace(/^ROLE_/, ""),
);

const publisherChoices = computed(() =>
  role.value === "AGENT"
    ? [
      {
        value: "AGENT_BROKERAGE",
        title: "중개사무소 매물",
        description:
          "승인된 중개 계정과 등록 권한을 서버에서 확인합니다.",
      },
    ]
    : [
      {
        value: "DIRECT_OWNER",
        title: "집주인 직거래",
        description:
          "소유관계를 확인한 뒤 공개합니다.",
      },
      {
        value: "DIRECT_TENANT",
        title: "세입자 직거래",
        description:
          "임대차관계를 확인한 뒤 공개합니다.",
      },
    ],
);

const locationReady = computed(() =>
  hasPropertyLocationData(
    store.registrationIntegration,
    form.value.propertyType,
  ),
);

const integrationReady = computed(() =>
  hasPropertyIntegrationData(
    store.registrationIntegration,
    form.value.propertyType,
  ),
);

const backDisabled = computed(() =>
  isRegistrationBackDisabled(
    step.value,
    step4ImageUploadBusy.value,
  ),
);

const isPersonalProperty = computed(
  () => form.value.publisherType !== "AGENT_BROKERAGE",
);

const selectedOptionCount = computed(
  () =>
    store.registrationIntegration?.options?.filter(
      (option) => option.optionValue === "true",
    ).length ?? 0,
);

const reviewPrice = computed(() =>
  form.value.transactionType
    ? formatPropertyPrice({
      transactionType: form.value.transactionType,

      salePrice:
        form.value.salePrice !== "" &&
        form.value.salePrice != null
          ? Math.round(
            Number(form.value.salePrice) * 10_000,
          )
          : null,

      deposit:
        form.value.deposit !== "" &&
        form.value.deposit != null
          ? Math.round(
            Number(form.value.deposit) * 10_000,
          )
          : null,

      monthlyRent:
        form.value.monthlyRent !== "" &&
        form.value.monthlyRent != null
          ? Math.round(
            Number(form.value.monthlyRent) * 10_000,
          )
          : null,
    })
    : "-",
);

const canSubmit = computed(
  () =>
    integrationReady.value &&
    confirmedFacts.value &&
    (!isPersonalProperty.value ||
      confirmedEvidence.value),
);

// 임호탁 파트 (화면 입력과 팀원 완료값으로 최종 등록 요청 생성)
const buildRequest = () =>
  createPropertyCreateRequest(
    form.value,
    store.registrationIntegration,
  );

const selectPublisher = (publisherType) => {
  form.value.publisherType = publisherType;
  errors.value = {};
};

const nextFromPublisher = () => {
  if (!form.value.publisherType) {
    errors.value = {
      publisherType: "등록 주체를 선택해 주세요.",
    };
    return;
  }

  errors.value = {};
  step.value = 2;
};

const nextFromCore = () => {
  errors.value = validatePropertyCore(form.value);

  if (Object.keys(errors.value).length > 0) {
    return;
  }

  store.clearFeedback();
  step.value = 3;
};

const completeLocationStep = (locationIntegration) => {
  store.setRegistrationIntegration(locationIntegration);
  step.value = 4;
};

const completeStep4 = (patch) => {
  store.setRegistrationIntegration(patch);

  if (
    !hasPropertyLocationData(
      store.registrationIntegration,
      form.value.propertyType,
    )
  ) {
    errors.value = {
      ...errors.value,
      integration:
        "주소·Region 검증 결과가 필요합니다. 이전 단계에서 주소 연결 상태를 확인해 주세요.",
    };

    return;
  }

  errors.value = {};
  step4ImageUploadBusy.value = false;
  confirmedFacts.value = false;
  confirmedEvidence.value = false;
  step.value = 5;
};

const backFromStep4 = (patch) => {
  store.setRegistrationIntegration(patch);
  step4ImageUploadBusy.value = false;
  goBack();
};

const goBack = () => {
  if (backDisabled.value) {
    return;
  }

  if (step.value === 4) {
    const patch = step4.value?.currentPatch();

    if (patch) {
      store.setRegistrationIntegration(patch);
    }
  }

  store.clearFeedback();
  errors.value = {};

  if (step.value === 5) {
    confirmedFacts.value = false;
    confirmedEvidence.value = false;
    step.value = 4;
    return;
  }

  if (step.value === 4) {
    step.value = 3;
    return;
  }

  if (step.value === 3) {
    step.value = 2;
    return;
  }

  if (step.value === 2) {
    step.value = 1;
    return;
  }
};

const submit = async () => {
  errors.value = validatePropertyCore(form.value);

  if (
    Object.keys(errors.value).length > 0 ||
    !canSubmit.value
  ) {
    return;
  }

  try {
    await store.createProperty(buildRequest());
  } catch {
    errors.value = {
      ...errors.value,
      ...store.error?.fieldErrors,
    };

    return;
  }

  // 등록 완료 후 작성 중이던 draft 초기화
  store.resetRegistrationDraft();

  // 등록 직후 검증 신청 화면으로 이동하지 않는다.
  // 바로 '내가 올린 매물' 목록으로 이동한다.
  // 검증 신청은 내 매물 카드에서 사용자가 직접 진행한다.
  await router.replace({
    name: "my-properties",
  });
};

onMounted(async () => {
  store.resetRegistrationDraft();

  const access = await store.ensureAccess([
    "USER",
    "AGENT",
  ]);

  if (access === "login") {
    await router.replace("/sign-in");
  }
});
</script>

<template>
  <section class="page property-create-page">
    <Header title="매물 등록" />

    <div
      class="property-progress"
      :aria-label="`등록 ${step}단계, 전체 5단계`"
    >
      <span
        :style="{
          width: `${step * 20}%`,
        }"
      ></span>
    </div>

    <div class="page-content property-create-content">
      <p
        v-if="store.isAccessLoading"
        class="info-box"
        aria-live="polite"
      >
        등록 권한을 확인하고 있습니다.
      </p>

      <div
        v-else-if="store.error?.isForbidden"
        class="error-box"
        role="alert"
      >
        <strong>
          {{ store.error.message }}
        </strong>

        <MyButton
          variant="outline"
          @click="router.push('/main')"
        >
          홈으로
        </MyButton>
      </div>

      <template v-else>
        <div
          class="step-heading"
          :class="{
            'step-heading--first': step === 1,
          }"
        >
          <button
            v-if="step !== 1"
            class="step-back"
            type="button"
            aria-label="이전"
            :disabled="backDisabled"
            @click="goBack"
          >
            ←
          </button>

          <div class="step-heading__copy">
            <p class="step-number">
              <strong>{{ step }}</strong>/5
            </p>

            <h1 class="page-title">
              {{
                step === 1
                  ? "어떤 매물을 등록하나요?"
                  : step === 2
                    ? "매물 정보를 입력해 주세요"
                    : step === 3
                      ? "주소와 단지를 확인해 주세요"
                      : step === 4
                        ? "옵션과 사진을 등록해 주세요"
                        : "등록 내용을 확인해 주세요"
              }}
            </h1>
          </div>
        </div>

        <!-- 1단계 -->
        <template v-if="step === 1">
          <p class="page-description">
            등록 주체에 따라 인증과 연락 방법이 달라집니다.
          </p>

          <div class="publisher-list">
            <button
              v-for="choice in publisherChoices"
              :key="choice.value"
              type="button"
              class="publisher-card"
              :class="{
                'publisher-card--selected':
                  form.publisherType === choice.value,
              }"
              :aria-pressed="
                form.publisherType === choice.value
              "
              @click="selectPublisher(choice.value)"
            >
              <span
                class="publisher-card__icon"
                aria-hidden="true"
              >
                {{
                  choice.value === "DIRECT_OWNER"
                    ? "⌂"
                    : choice.value === "DIRECT_TENANT"
                      ? "⌁"
                      : "▣"
                }}
              </span>

              <span class="publisher-card__copy">
                <strong>
                  {{ choice.title }}
                </strong>

                <span>
                  {{ choice.description }}
                </span>
              </span>

              <span
                class="publisher-card__check"
                aria-hidden="true"
              >
                {{
                  form.publisherType === choice.value
                    ? "●"
                    : "○"
                }}
              </span>
            </button>
          </div>

          <p
            v-if="errors.publisherType"
            class="text-error"
            role="alert"
          >
            {{ errors.publisherType }}
          </p>

          <p
            v-if="role === 'AGENT'"
            class="info-box"
          >
            중개 계정의 소속 상태와 PROPERTY_CREATE
            권한은 등록 요청 시 서버가 최종 확인합니다.
          </p>

          <div
            class="create-actions create-actions--single"
          >
            <MyButton
              block
              size="large"
              @click="nextFromPublisher"
            >
              다음
            </MyButton>
          </div>
        </template>

        <!-- 2단계 -->
        <template v-else-if="step === 2">
          <PropertyCoreForm
            v-model="form"
            :errors="errors"
            :disabled="store.isActionLoading"
            :show-living-conditions="false"
            publisher-locked
          />

          <div class="info-box integration-box">
            <strong>
              주소·Region 연결 상태
            </strong>

            <p v-if="locationReady">
              준비된 주소·단지 검증 결과를 그대로 유지합니다.
            </p>

            <p v-else>
              주소·단지 검증 결과가 아직 연결되지 않았습니다.
            </p>

            <p>
              주소 검증을 마치면 옵션과 사진 입력 단계로 이동합니다.
            </p>
          </div>

          <div
            class="form-actions form-actions--step create-actions"
          >
            <MyButton
              variant="outline"
              @click="goBack"
            >
              이전
            </MyButton>

            <MyButton @click="nextFromCore">
              3단계 주소·단지
            </MyButton>
          </div>
        </template>

        <!-- 3단계 -->
        <PropertyAddressComplexStep
          v-else-if="step === 3"
          :property-type="form.propertyType"
          :initial-value="store.registrationIntegration"
          @back="goBack"
          @complete="completeLocationStep"
        />

        <!-- 5단계 -->
        <template v-else-if="step === 5">
          <section
            class="review-complete"
            aria-label="등록 준비 완료"
          >
            <span aria-hidden="true">
              ✓
            </span>

            <strong>
              마지막 확인 후 매물이 등록됩니다.
            </strong>

            <p>
              작성한 내용과 필수 동의를 확인해 주세요.
            </p>
          </section>

          <section class="review-card">
            <h2>
              {{
                PROPERTY_LABELS.publisherType[
                  form.publisherType
                  ]
              }}
              ·
              {{
                PROPERTY_LABELS.propertyType[
                  form.propertyType
                  ]
              }}
            </h2>

            <dl>
              <div>
                <dt>거래</dt>
                <dd>
                  {{ reviewPrice }}
                </dd>
              </div>

              <div>
                <dt>전용면적</dt>
                <dd>
                  {{ form.exclusiveArea }}㎡
                </dd>
              </div>

              <div>
                <dt>사진</dt>
                <dd>
                  {{
                    store.registrationIntegration
                      ?.fileIds?.length ?? 0
                  }}장
                </dd>
              </div>

              <div>
                <dt>선택 옵션</dt>
                <dd>
                  {{ selectedOptionCount }}개
                </dd>
              </div>
            </dl>

            <p>
              정확 주소와 좌표는 등록 요청에만 사용하며
              이 확인 화면에는 표시하지 않습니다.
            </p>
          </section>

          <section class="review-card">
            <h2>
              공개 전 필요한 확인
            </h2>

            <label class="confirmation">
              <input
                v-model="confirmedFacts"
                type="checkbox"
              />

              입력한 매물 정보가 사실임을 확인합니다.
            </label>

            <label
              v-if="isPersonalProperty"
              class="confirmation"
            >
              <input
                v-model="confirmedEvidence"
                type="checkbox"
              />

              소유·임대차 관계 증빙의 수집과 보존에 동의합니다.
            </label>

            <p class="info-box">
              등록 후 내가 올린 매물에서 검증 신청을 진행할 수 있습니다.
            </p>
          </section>

          <div
            v-if="store.error"
            class="error-box"
            role="alert"
          >
            <strong>
              {{ store.error.message }}
            </strong>

            <p v-if="store.error.traceId">
              문의 코드:
              {{ store.error.traceId }}
            </p>

            <MyButton
              v-if="store.error.requiresLogin"
              size="small"
              variant="outline"
              @click="router.push('/sign-in')"
            >
              로그인
            </MyButton>
          </div>

          <div
            class="form-actions form-actions--step create-actions"
          >
            <MyButton
              variant="outline"
              :disabled="store.isActionLoading"
              @click="goBack"
            >
              이전
            </MyButton>

            <MyButton
              :disabled="!canSubmit"
              :loading="
                store.pendingAction === 'create'
              "
              @click="submit"
            >
              동의하고 등록
            </MyButton>
          </div>
        </template>

        <!-- 4단계 -->
        <PropertyRegistrationStep4
          v-if="hasVisitedStep4"
          v-show="step === 4"
          ref="step4"
          :property-type="form.propertyType"
          :initial-file-ids="
            store.registrationIntegration?.fileIds ?? []
          "
          :initial-options="
            store.registrationIntegration?.options ?? []
          "
          :error-message="errors.integration"
          @back="backFromStep4"
          @busy-change="
            step4ImageUploadBusy = $event
          "
          @complete="completeStep4"
        />
      </template>
    </div>
  </section>
</template>

<style scoped>
.property-progress {
  height: 3px;
  overflow: hidden;
  background: var(--zipda-color-disabled);
}

.property-progress span {
  display: block;
  height: 100%;
  background: var(--zipda-color-primary);
  transition: width 180ms ease;
}

.property-create-content {
  display: grid;
  gap: 24px;
  padding-top: 18px;
}

.step-heading {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr);
  align-items: start;
  gap: 6px;
}

.step-heading--first {
  grid-template-columns: minmax(0, 1fr);
}

.step-heading__copy {
  display: grid;
  gap: 12px;
}

.step-back {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  padding: 0;
  color: var(--zipda-color-text);
  background: transparent;
  border: 0;
  font-size: 20px;
  cursor: pointer;
}

.step-back:disabled {
  color: var(--zipda-color-text-muted);
  cursor: not-allowed;
  opacity: 0.5;
}

.step-number {
  justify-self: end;
  min-width: 42px;
  padding: 4px 9px;
  color: var(--zipda-color-text-muted);
  background: var(
    --zipda-color-subtle-background
  );
  border-radius: 999px;
  font-size: 12px;
  text-align: center;
}

.step-number strong {
  color: var(--zipda-color-primary-active);
}

.step-heading .page-title {
  grid-column: 1 / -1;
  font-size: 21px;
}

.publisher-list {
  display: grid;
  gap: 12px;
}

.publisher-card {
  display: grid;
  grid-template-columns:
    36px minmax(0, 1fr) 20px;
  align-items: center;
  gap: 12px;
  min-height: 82px;
  padding: 16px;
  color: var(--zipda-color-text);
  text-align: left;
  background: var(--zipda-color-white);
  border:
    1px solid var(--zipda-color-border);
  border-radius: var(--zipda-radius-large);
  cursor: pointer;
}

.publisher-card__icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  color: var(
    --zipda-color-primary-active
  );
  background: var(
    --zipda-color-primary-light
  );
  border-radius: 50%;
  font-size: 20px;
}

.publisher-card__copy {
  display: grid;
  gap: 5px;
}

.publisher-card__copy > span {
  color: var(--zipda-color-text-muted);
  font-size: 12px;
  line-height: 1.45;
}

.publisher-card__check {
  color: var(--zipda-color-border);
  font-size: 17px;
}

.publisher-card--selected {
  background: #f6faef;
  border-color: var(--zipda-color-primary);
  box-shadow: var(--zipda-focus-ring);
}

.publisher-card--selected
.publisher-card__check {
  color: var(--zipda-color-primary);
}

.integration-box {
  display: grid;
  gap: 5px;
}

.review-card {
  display: grid;
  gap: 14px;
  padding: 18px;
  background: var(--zipda-color-surface);
  border:
    1px solid var(--zipda-color-border);
  border-radius: var(--zipda-radius-large);
}

.review-card h2 {
  font-size: 18px;
}

.review-card dl {
  display: grid;
  grid-template-columns:
    repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.review-card dl div {
  display: grid;
  gap: 4px;
}

.review-card dt,
.review-card p {
  color: var(--zipda-color-text-muted);
  font-size: 13px;
}

.review-card dd {
  margin: 0;
  font-weight: 700;
}

.review-complete {
  display: grid;
  justify-items: center;
  gap: 6px;
  padding: 20px 16px;
  text-align: center;
  background: #edf8dc;
  border-radius: var(--zipda-radius-large);
}

.review-complete > span {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  color: var(--zipda-color-white);
  background: var(--zipda-color-primary);
  border-radius: 50%;
  font-weight: 700;
}

.review-complete p {
  color: var(--zipda-color-text-muted);
  font-size: 12px;
}

.confirmation {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  font-size: 13px;
  line-height: 1.5;
}

.confirmation input {
  margin-top: 3px;
  accent-color: var(--zipda-color-primary);
}

.error-box {
  display: grid;
  gap: 6px;
}

.create-actions {
  position: sticky;
  bottom: 0;
  z-index: 10;
  margin:
    0
    calc(var(--zipda-page-padding) * -1)
    -40px;
  padding:
    12px
    var(--zipda-page-padding)
    calc(
      12px + env(safe-area-inset-bottom)
    );
  background:
    linear-gradient(
      to bottom,
      rgb(255 255 255 / 75%),
      var(--zipda-color-white) 24%
    );
}

.create-actions--single {
  display: block;
}

@media (min-width: 768px) {
  .property-create-content {
    width: min(100%, 760px);
    margin: 0 auto;
  }
}

@media (max-width: 480px) {
  .review-card dl {
    grid-template-columns: 1fr;
  }
}
</style>
