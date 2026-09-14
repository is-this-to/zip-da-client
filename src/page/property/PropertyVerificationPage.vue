<script setup>
// 임호탁 파트 (소유자·임차인·재검증 신청 화면)
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Header from "../../component/Header.vue";
import MyButton from "../../component/button/MyButton.vue";
import { PROPERTY_LABELS, resolvePropertyVerificationMode } from "../../constant/property/propertyStatus.js";
import { usePropertyManagementStore } from "../../store/property/usePropertyManagementStore.js";
import { hasVerificationEvidenceData } from "../../util/validator/property/propertyValidator.js";

const route = useRoute();
const router = useRouter();
const store = usePropertyManagementStore();
const confirmed = ref(false);

const mode = computed(() => route.params.mode);
const property = computed(() => store.items.find(
  (item) => item.propertyId === String(route.params.propertyId),
) ?? (store.editDetail?.propertyId === String(route.params.propertyId) ? store.editDetail : null));
const title = computed(() => mode.value === "owner"
  ? "소유자 검증 신청"
  : mode.value === "tenant"
    ? "임차인 검증 신청"
    : "재검증 신청");
const evidenceReady = computed(() => hasVerificationEvidenceData(store.verificationEvidence));
const modeAllowed = computed(() =>
  resolvePropertyVerificationMode(property.value) === mode.value,
);

const submit = async () => {
  if (!property.value || !modeAllowed.value || !confirmed.value || !evidenceReady.value) return;
  try {
    await store.submitVerification(property.value, mode.value, store.verificationEvidence);
    store.setVerificationEvidence([]);
    await router.replace("/my-properties");
  } catch { /* store owns feedback */ }
};

const loadProperty = async () => {
  try { await store.fetchEditDetail(route.params.propertyId); } catch { /* store owns feedback */ }
};

onMounted(async () => {
  const access = await store.ensureAccess(["USER", "AGENT"]);
  if (access === "login") {
    await router.replace("/sign-in");
    return;
  }
  if (access !== "allowed") return;
  if (property.value) return;
  await loadProperty();
});
</script>

<template>
  <section class="page verification-page">
    <Header :title="title" show-back back-to="/my-properties" />
    <div class="page-content verification-content">
      <div>
        <h1 class="page-title">{{ title }}</h1>
        <p class="page-description">검증에 필요한 최소한의 증빙만 제출해 주세요.</p>
      </div>

      <p v-if="store.isAccessLoading || store.isDetailLoading" class="verification-state" aria-live="polite">
        검증할 매물 정보를 불러오는 중입니다.
      </p>

      <div v-else-if="property" class="verification-property">
        <strong>{{ property.title }}</strong>
        <span>{{ PROPERTY_LABELS.publisherType[property.publisherType] }}</span>
        <span>현재 version {{ property.version }}</span>
      </div>
      <div v-else-if="!store.error" class="error-box">목록에서 검증할 매물을 다시 선택해 주세요.</div>
      <div v-if="property && !modeAllowed" class="error-box">
        현재 등록 주체 또는 인증 상태에서는 이 검증 경로를 사용할 수 없습니다.
      </div>

      <section v-if="property" class="verification-evidence">
        <h2>검증 증빙</h2>
        <p v-if="!evidenceReady" class="info-box">
          증빙 파일 담당 화면에서 업로드를 완료해야 신청할 수 있습니다. 증빙 원문과 내부 저장 경로는 이 화면에 표시하지 않습니다.
        </p>
        <ul v-else>
          <li v-for="(item, index) in store.verificationEvidence" :key="`${item.propertyFileId}-${index}`">
            {{ PROPERTY_LABELS.evidenceType[item.evidenceType] || item.evidenceType }} · {{ index + 1 }}번째 파일
          </li>
        </ul>
      </section>

      <label v-if="property" class="verification-consent">
        <input v-model="confirmed" type="checkbox" />
        검증 목적과 보존 정책을 확인했으며 제출에 동의합니다.
      </label>

      <div v-if="store.error" class="error-box" role="alert">
        <strong>{{ store.error.message }}</strong>
        <p v-if="store.error.traceId">문의 코드: {{ store.error.traceId }}</p>
        <MyButton v-if="store.conflict" size="small" variant="outline" @click="router.replace('/my-properties')">최신 목록 확인</MyButton>
        <MyButton v-else-if="store.error.requiresLogin" size="small" variant="outline" @click="router.push('/sign-in')">로그인</MyButton>
        <MyButton v-else-if="store.error.isForbidden" size="small" variant="outline" @click="router.push('/main')">홈으로</MyButton>
        <MyButton v-else-if="store.error.isNotFound" size="small" variant="outline" @click="router.replace('/my-properties')">내 매물로</MyButton>
        <MyButton v-else-if="store.error.isRetryable" size="small" variant="outline" @click="loadProperty">다시 시도</MyButton>
      </div>

      <MyButton
        v-if="property"
        block
        size="large"
        :disabled="!property || !modeAllowed || !evidenceReady || !confirmed"
        :loading="store.pendingAction === 'verification'"
        @click="submit"
      >{{ title }}</MyButton>
    </div>
  </section>
</template>

<style scoped>
.verification-content,
.verification-evidence { display: grid; gap: 18px; }
.verification-property { display: grid; gap: 5px; padding: 18px; background: var(--zipda-color-surface); border: 1px solid var(--zipda-color-border); border-radius: var(--zipda-radius-large); }
.verification-property span { color: var(--zipda-color-text-muted); font-size: 13px; }
.verification-state { padding: 48px 0; color: var(--zipda-color-text-muted); text-align: center; }
.verification-evidence h2 { font-size: 18px; }
.verification-evidence ul { display: grid; gap: 8px; padding-left: 22px; }
.verification-consent { display: flex; align-items: flex-start; gap: 9px; font-size: 13px; line-height: 1.5; }
.error-box { display: grid; gap: 10px; }
@media (min-width: 768px) { .verification-content { width: min(100%, 680px); margin: 0 auto; } }
</style>
