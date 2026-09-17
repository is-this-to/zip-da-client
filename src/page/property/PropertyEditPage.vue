<script setup>
// 임호탁 파트 (수정용 상세 조회·핵심 정보 수정·version 충돌 처리 화면)
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Header from "../../component/Header.vue";
import MyButton from "../../component/button/MyButton.vue";
import PropertyCoreForm from "../../component/property/PropertyCoreForm.vue";
import PropertyStatusBadge from "../../component/property/PropertyStatusBadge.vue";
import { usePropertyManagementStore } from "../../store/property/usePropertyManagementStore.js";
import { validatePropertyCore } from "../../util/validator/property/propertyValidator.js";

const route = useRoute();
const router = useRouter();
const store = usePropertyManagementStore();
const errors = ref({});
const form = ref({});
let original = null;

const editableFields = [
  "transactionType", "salePrice", "deposit", "monthlyRent",
  "maintenanceFee", "supplyArea", "exclusiveArea", "roomCount", "bathroomCount",
  "floor", "totalFloor", "floorCondition", "direction", "approvalDate", "buildingUse",
  "isParkingAvailable", "hasElevator", "isPetAllowed", "title", "description",
];

const priceFields = new Set([
  "salePrice", "deposit", "monthlyRent", "maintenanceFee",
]);

const numericFields = new Set([
  "salePrice", "deposit", "monthlyRent", "maintenanceFee", "supplyArea",
  "exclusiveArea", "roomCount", "bathroomCount", "floor", "totalFloor",
]);

const toWon = (value) => (value === "" || value == null ? null : Math.round(Number(value) * 10_000));
const toManWon = (value) => (value === "" || value == null ? "" : Math.round(Number(value) / 10_000));

const hydrate = (detail) => {
  form.value = { ...detail };
  for (const field of editableFields) {
    if (form.value[field] == null) {
      form.value[field] = "";
    } else if (priceFields.has(field) && form.value[field] !== "") {
      form.value[field] = toManWon(form.value[field]);
    }
  }
  original = { ...form.value };
};

const load = async () => {
  try { hydrate(await store.fetchEditDetail(route.params.propertyId)); } catch { /* store owns feedback */ }
};

const initialize = async () => {
  const access = await store.ensureAccess(["USER", "AGENT", "CS_ADMIN", "SUPER_ADMIN"]);
  if (access === "login") {
    await router.replace("/sign-in");
    return;
  }
  if (access === "allowed") await load();
};

const buildChanges = () => {
  const changes = Object.fromEntries(editableFields
    .filter((field) => form.value[field] !== original[field])
    .map((field) => {
      const value = form.value[field];
      if (value === "") return [field, null];
      if (priceFields.has(field)) return [field, toWon(value)];
      if (numericFields.has(field)) return [field, Number(value)];
      return [field, typeof value === "string" ? value.trim() : value];
    }));

  if (form.value.transactionType !== original.transactionType) {
    changes.salePrice = form.value.transactionType === "SALE" ? toWon(form.value.salePrice) : null;
    changes.deposit = ["JEONSE", "MONTHLY_RENT"].includes(form.value.transactionType)
      ? toWon(form.value.deposit)
      : null;
    changes.monthlyRent = form.value.transactionType === "MONTHLY_RENT"
      ? toWon(form.value.monthlyRent)
      : null;
  }
  return changes;
};

const submit = async () => {
  // 임호탁 파트 (매물 수정 중복 제출 및 상세 조회 전 제출 차단)
  if (store.isActionLoading || !original) return;
  errors.value = validatePropertyCore(form.value);
  if (Object.keys(errors.value).length > 0) return;
  const changes = buildChanges();
  if (Object.keys(changes).length === 0) {
    errors.value = { form: "변경된 내용이 없습니다." };
    return;
  }
  try {
    await store.updateProperty(route.params.propertyId, original.version, { changes });
    await load();
  } catch {
    errors.value = { ...errors.value, ...store.error?.fieldErrors };
  }
};

onMounted(initialize);
</script>

<template>
  <section class="page property-edit-page">
    <Header title="매물 수정" show-back back-to="/my-properties" />
    <div class="page-content property-edit-content">
      <p v-if="store.isAccessLoading || store.isDetailLoading" class="edit-state">매물 정보를 불러오는 중입니다.</p>

      <div v-else-if="store.error && !store.editDetail" class="error-box" role="alert">
        <strong>{{ store.error.message }}</strong>
        <p v-if="store.error.traceId">문의 코드: {{ store.error.traceId }}</p>
        <div class="form-actions">
          <MyButton variant="outline" @click="router.push('/my-properties')">목록으로</MyButton>
          <MyButton v-if="store.error.requiresLogin" @click="router.push('/sign-in')">로그인</MyButton>
          <MyButton v-else-if="store.error.isRetryable" @click="load">다시 시도</MyButton>
        </div>
      </div>

      <template v-else-if="store.editDetail">
        <div class="edit-heading">
          <div>
            <h1 class="page-title">{{ store.editDetail.title }}</h1>
            <p class="page-description">현재 version {{ store.editDetail.version }}</p>
          </div>
          <div class="edit-statuses">
            <PropertyStatusBadge group="publicationStatus" :value="store.editDetail.publicationStatus" />
            <PropertyStatusBadge group="transactionStatus" :value="store.editDetail.transactionStatus" />
            <PropertyStatusBadge group="verificationStatus" :value="store.editDetail.verificationStatus" />
          </div>
        </div>

        <div class="info-box">
          주소·옵션은 수정 응답 계약에 포함될 때 담당 컴포넌트와 연결합니다. 현재 화면에서는 매물 핵심 정보만 변경합니다.
        </div>

        <PropertyCoreForm v-model="form" :errors="errors" edit-mode :disabled="store.isActionLoading" />
        <p v-if="errors.form" class="text-error">{{ errors.form }}</p>

        <div v-if="store.error" class="error-box" role="alert">
          <strong>{{ store.error.message }}</strong>
          <p v-if="store.error.traceId">문의 코드: {{ store.error.traceId }}</p>
          <MyButton v-if="store.conflict" size="small" variant="outline" @click="load">최신 정보 불러오기</MyButton>
          <MyButton v-else-if="store.error.requiresLogin" size="small" variant="outline" @click="router.push('/sign-in')">로그인</MyButton>
        </div>

        <div class="form-actions">
          <MyButton variant="outline" @click="router.push('/my-properties')">취소</MyButton>
          <MyButton :loading="store.pendingAction === 'update'" @click="submit">변경 저장</MyButton>
        </div>
      </template>
    </div>
  </section>
</template>

<style scoped>
.property-edit-content { display: grid; gap: 20px; }
.edit-heading { display: grid; gap: 12px; }
.edit-statuses { display: flex; flex-wrap: wrap; gap: 7px; }
.edit-state { padding: 50px 0; color: var(--zipda-color-text-muted); text-align: center; }
.error-box { display: grid; gap: 10px; }
@media (min-width: 768px) { .property-edit-content { width: min(100%, 760px); margin: 0 auto; } }
</style>
