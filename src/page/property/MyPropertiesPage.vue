<script setup>
// 임호탁 파트 (내 매물 목록·상태 변경·소프트 삭제·검증 진입 화면)
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import Header from "../../component/Header.vue";
import MyButton from "../../component/button/MyButton.vue";
import MyPropertyCard from "../../component/property/MyPropertyCard.vue";
import { PROPERTY_LABELS, TRANSACTION_STATUSES, TRANSACTION_STATUS_TRANSITIONS } from "../../constant/property/propertyStatus.js";
import { usePropertyManagementStore } from "../../store/property/usePropertyManagementStore.js";

const router = useRouter();
const store = usePropertyManagementStore();
const selectedProperty = ref(null);
const dialogMode = ref("");
const targetStatus = ref("");
const reason = ref("");
const localError = ref("");
const availableTransactionStatuses = computed(() =>
  TRANSACTION_STATUS_TRANSITIONS[selectedProperty.value?.transactionStatus] ?? [],
);
const transactionStatusDescriptions = {
  AVAILABLE: "문의와 방문 예약을 받을 수 있는 상태입니다.",
  RESERVED: "특정 사용자와 거래를 협의 중인 상태입니다.",
  COMPLETED: "계약이 끝나 더 이상 거래를 진행하지 않습니다.",
};
const isStatusSelectable = (status) => availableTransactionStatuses.value.includes(status);

const load = async () => {
  try { await store.fetchMyProperties(); } catch { /* store owns feedback */ }
};

const initialize = async () => {
  const access = await store.ensureAccess(["USER", "AGENT"]);
  if (access === "login") {
    await router.replace("/sign-in");
    return;
  }
  if (access === "allowed") await load();
};

const loadMore = async () => {
  try { await store.fetchMyProperties({ append: true }); } catch { /* store owns feedback */ }
};

const openStatus = (property) => {
  store.clearFeedback();
  selectedProperty.value = property;
  targetStatus.value = TRANSACTION_STATUS_TRANSITIONS[property.transactionStatus]?.[0] ?? "";
  reason.value = "";
  localError.value = "";
  dialogMode.value = "status";
};

const openDelete = (property) => {
  store.clearFeedback();
  selectedProperty.value = property;
  reason.value = "";
  localError.value = "";
  dialogMode.value = "delete";
};

const closeDialog = () => {
  if (store.isActionLoading) return;
  dialogMode.value = "";
  selectedProperty.value = null;
};

const submitStatus = async () => {
  // 임호탁 파트 (거래 상태 변경 중복 제출 차단)
  if (store.isActionLoading || !selectedProperty.value) return;
  if (!reason.value.trim()) {
    localError.value = "변경 사유를 입력해 주세요.";
    return;
  }
  if (!availableTransactionStatuses.value.includes(targetStatus.value)) {
    localError.value = "변경할 수 있는 거래 상태를 선택해 주세요.";
    return;
  }
  localError.value = "";
  try {
    await store.changeTransactionStatus(selectedProperty.value, targetStatus.value, reason.value);
    closeDialog();
  } catch { /* store owns feedback */ }
};

const submitDelete = async () => {
  // 임호탁 파트 (매물 소프트 삭제 중복 제출 차단)
  if (store.isActionLoading || !selectedProperty.value) return;
  if (!reason.value.trim()) {
    localError.value = "삭제 사유를 입력해 주세요.";
    return;
  }
  localError.value = "";
  try {
    await store.deleteProperty(selectedProperty.value, reason.value);
    closeDialog();
  } catch { /* store owns feedback */ }
};

const openDetail = (property) => {
  router.push({
    name: "my-property-detail",
    params: {
      propertyId: property.propertyId,
    },
  });
};

const openVerification = (property, mode) => router.push({
  name: "property-verification",
  params: { propertyId: property.propertyId, mode },
});

onMounted(initialize);
</script>

<template>
  <section class="page my-properties-page">
    <!-- 임호탁 파트 (내 매물 목록 단일 공통 헤더) -->
    <Header title="내 매물" />

    <div class="page-content my-properties-content">
      <div class="my-properties-intro">
        <div>
          <h1 class="page-title">내가 관리하는 매물</h1>
          <p class="page-description">공개·거래·인증 상태를 각각 확인하세요.</p>
        </div>
      </div>

      <div v-if="store.error" class="error-box" role="alert">
        <strong>{{ store.error.message }}</strong>
        <p v-if="store.error.traceId">문의 코드: {{ store.error.traceId }}</p>
        <MyButton v-if="store.error.requiresLogin" size="small" variant="outline" @click="router.push('/sign-in')">로그인</MyButton>
        <MyButton v-else-if="store.error.isForbidden" size="small" variant="outline" @click="router.push('/main')">홈으로</MyButton>
        <MyButton v-else-if="store.error.isRetryable" size="small" variant="outline" @click="load">다시 시도</MyButton>
      </div>

      <p v-if="store.isAccessLoading || store.isListLoading" class="property-state" aria-live="polite">매물을 불러오는 중입니다.</p>

      <div v-else-if="store.items.length" class="property-list">
        <MyPropertyCard
          v-for="property in store.items"
          :key="property.propertyId"
          :property="property"
          @detail="openDetail"
          @edit="router.push(`/properties/${property.propertyId}/edit`)"
          @status="openStatus"
          @delete="openDelete"
          @verify="openVerification"
        />
        <MyButton v-if="store.hasNext" variant="outline" block :loading="store.isMoreLoading" @click="loadMore">더 보기</MyButton>
      </div>

      <div v-else-if="!store.error" class="empty-state">
        <strong>등록한 매물이 없습니다.</strong>
        <p>첫 매물을 등록하면 공개·거래·인증 상태를 여기에서 관리할 수 있습니다.</p>
      </div>
    </div>

    <div v-if="dialogMode" class="property-dialog-backdrop" @click.self="closeDialog">
      <section class="property-dialog" role="dialog" aria-modal="true" :aria-labelledby="`${dialogMode}-title`">
        <header class="property-dialog__header">
          <button type="button" aria-label="닫기" :disabled="store.isActionLoading" @click="closeDialog">←</button>
          <h2 :id="`${dialogMode}-title`">{{ dialogMode === "status" ? "거래 상태 변경" : "매물 삭제" }}</h2>
          <span aria-hidden="true"></span>
        </header>
        <template v-if="dialogMode === 'status'">
          <div class="status-current">
            <span>현재 상태</span>
            <strong>● {{ PROPERTY_LABELS.transactionStatus[selectedProperty?.transactionStatus] }}</strong>
          </div>
          <div class="status-choice-list" role="radiogroup" aria-label="변경할 거래 상태">
            <label
              v-for="status in TRANSACTION_STATUSES"
              :key="status"
              class="status-choice"
              :class="{
                'status-choice--selected': targetStatus === status,
                'status-choice--disabled': !isStatusSelectable(status),
              }"
            >
              <input
                v-model="targetStatus"
                type="radio"
                name="transaction-status"
                :value="status"
                :disabled="!isStatusSelectable(status)"
              />
              <span>
                <strong>{{ PROPERTY_LABELS.transactionStatus[status] }}</strong>
                <small>{{ transactionStatusDescriptions[status] }}</small>
              </span>
            </label>
          </div>
        </template>
        <p v-else class="info-box">삭제된 매물은 일반 목록과 검색에서 제외됩니다.</p>
        <label>
          <span>{{ dialogMode === "status" ? "변경 사유 *" : "삭제 사유 *" }}</span>
          <textarea v-model="reason" rows="4" :maxlength="dialogMode === 'status' ? 200 : 500"></textarea>
        </label>
        <p v-if="localError" class="text-error" role="alert">{{ localError }}</p>
        <div v-if="store.conflict" class="error-box">
          {{ store.conflict.message }}
          <MyButton size="small" variant="outline" @click="closeDialog(); load()">최신 목록 불러오기</MyButton>
        </div>
        <div class="form-actions">
          <MyButton variant="outline" :disabled="store.isActionLoading" @click="closeDialog">취소</MyButton>
          <MyButton
            :variant="dialogMode === 'delete' ? 'danger' : 'primary'"
            :loading="store.isActionLoading"
            @click="dialogMode === 'status' ? submitStatus() : submitDelete()"
          >{{ dialogMode === "status" ? "변경" : "삭제" }}</MyButton>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.my-properties-content,
.property-list { display: grid; gap: 16px; }
.my-properties-intro { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.property-state,
.empty-state { padding: 48px 20px; color: var(--zipda-color-text-muted); text-align: center; }
.empty-state { display: grid; justify-items: center; gap: 12px; }
.empty-state strong { color: var(--zipda-color-text); font-size: 18px; }
.error-box { display: grid; gap: 10px; }
.property-dialog-backdrop { position: fixed; inset: 0; z-index: 60; display: grid; place-items: center; padding: 20px; background: rgb(0 0 0 / 45%); }
.property-dialog { display: grid; gap: 18px; width: min(100%, 420px); max-height: calc(100dvh - 40px); padding: 0 20px 20px; overflow-y: auto; background: var(--zipda-color-white); border-radius: var(--zipda-radius-large); }
.property-dialog__header { position: sticky; top: 0; z-index: 1; display: grid; grid-template-columns: 40px minmax(0, 1fr) 40px; align-items: center; min-height: 52px; margin: 0 -20px; padding: 0 8px; background: var(--zipda-color-white); border-bottom: 1px solid var(--zipda-color-border); }
.property-dialog__header h2 { font-size: 15px; text-align: center; }
.property-dialog__header button { width: 40px; height: 40px; padding: 0; background: transparent; border: 0; font-size: 20px; cursor: pointer; }
.status-current { display: grid; gap: 6px; }
.status-current span { color: var(--zipda-color-text-muted); font-size: 12px; }
.status-current strong { color: var(--zipda-color-primary-active); font-size: 18px; }
.status-choice-list { display: grid; gap: 10px; }
.status-choice { display: grid !important; grid-template-columns: 20px minmax(0, 1fr) !important; align-items: start; gap: 10px !important; padding: 14px; background: var(--zipda-color-white); border: 1px solid var(--zipda-color-border); border-radius: var(--zipda-radius-large); cursor: pointer; }
.status-choice > span { display: grid; gap: 4px; }
.status-choice small { color: var(--zipda-color-text-muted); font-size: 12px; font-weight: 400; line-height: 1.45; }
.status-choice input { margin: 2px 0 0; accent-color: var(--zipda-color-primary); }
.status-choice--selected { background: #edf8dc; border-color: var(--zipda-color-primary); }
.status-choice--disabled { background: var(--zipda-color-subtle-background); cursor: not-allowed; opacity: 0.6; }
.property-dialog label { display: grid; gap: 7px; font-size: 14px; font-weight: 700; }
.property-dialog select,
.property-dialog textarea { width: 100%; padding: 11px; border: 1px solid var(--zipda-color-border); border-radius: var(--zipda-radius-medium); }
@media (max-width: 480px) { .property-dialog-backdrop { padding: 0; background: var(--zipda-color-white); } .property-dialog { width: 100%; max-height: 100dvh; min-height: 100dvh; border-radius: 0; } }
@media (min-width: 768px) { .my-properties-content { width: min(100%, 900px); margin: 0 auto; } .property-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }  }
</style>
