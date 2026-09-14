<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import Header from "../../component/Header.vue";
import MyButton from "../../component/button/MyButton.vue";
import MyInput from "../../component/input/MyInput.vue";
import { useMemberStore } from "../../store/member/member.js";

const router = useRouter();
const memberStore = useMemberStore();
const loading = ref(true);
const submitting = ref(false);
const pageError = ref("");
const formError = ref("");

const form = reactive({
  agencyName: "",
  representativeName: "",
  businessRegistrationNo: "",
  startDate: "",
  agentRegistrationNo: "",
});

const application = computed(() => memberStore.agentApplication);
const documents = computed(() => application.value?.documents || []);
const formReady = computed(
  () =>
    form.agencyName.trim().length > 0 &&
    form.agencyName.trim().length <= 50 &&
    form.representativeName.trim().length > 0 &&
    form.representativeName.trim().length <= 50 &&
    /^[0-9-]{10,12}$/.test(form.businessRegistrationNo.trim()) &&
    Boolean(form.startDate) &&
    form.agentRegistrationNo.trim().length > 0 &&
    form.agentRegistrationNo.trim().length <= 20,
);

const readError = (error, fallback) => {
  const responseData = error?.response?.data;
  if (typeof responseData?.message === "string") return responseData.message;
  if (typeof responseData?.data === "string") return responseData.data;
  return fallback;
};

const fillForm = (currentApplication) => {
  form.agencyName = currentApplication.agencyName || "";
  form.representativeName = currentApplication.representativeName || "";
  form.businessRegistrationNo = currentApplication.businessRegistrationNo || "";
  form.startDate = currentApplication.startDate || "";
  form.agentRegistrationNo = currentApplication.agentRegistrationNo || "";
};

const loadApplication = async () => {
  try {
    const currentApplication = await memberStore.getCurrentAgentApplication();
    fillForm(currentApplication);

    if (!currentApplication.editable) {
      pageError.value =
        "이미 제출된 신청입니다. 현재 화면에서는 내용을 수정할 수 없습니다.";
    }
  } catch (error) {
    pageError.value = readError(
      error,
      "OCR 결과를 불러오지 못했습니다. 서류를 다시 등록해 주세요.",
    );
  } finally {
    loading.value = false;
  }
};

const submitApplication = async () => {
  if (!formReady.value || submitting.value || !application.value?.editable) {
    formError.value = "심사에 필요한 항목을 모두 올바르게 입력해 주세요.";
    return;
  }

  try {
    submitting.value = true;
    formError.value = "";

    await memberStore.updateAgentApplication(application.value.applicationId, {
      businessRegistrationNo: form.businessRegistrationNo.trim(),
      startDate: form.startDate,
      representativeName: form.representativeName.trim(),
      agentRegistrationNo: form.agentRegistrationNo.trim(),
      agencyName: form.agencyName.trim(),
    });
    await memberStore.submitAgentApplication(application.value.applicationId);

    await router.replace({
      path: "/mypage",
      query: { agentSubmitted: "true" },
    });
  } catch (error) {
    formError.value = readError(
      error,
      "중개사 전환 신청을 제출하지 못했습니다.",
    );
  } finally {
    submitting.value = false;
  }
};

onMounted(loadApplication);
</script>

<template>
  <section class="page ocr-result-page">
    <Header
      title="OCR 결과 확인"
      show-back
      back-to="/mypage/agent-application/documents"
    />

    <div class="page-content ocr-result-content">
      <header class="result-heading">
        <h1 class="page-title">결과 확인</h1>
        <p>스캔된 정보를 확인하고 잘못 읽힌 항목은 직접 수정해 주세요.</p>
      </header>

      <p v-if="loading" class="info-box">OCR 결과를 불러오고 있어요.</p>
      <p v-else-if="pageError" class="error-box" role="alert">
        {{ pageError }}
      </p>

      <form
        v-if="application"
        class="result-form"
        @submit.prevent="submitApplication"
      >
        <div class="notice-box">
          <span aria-hidden="true">ⓘ</span>
          <p>법적·행정 정보가 다르면 서류를 다시 올려 주세요.</p>
        </div>

        <section class="ocr-card">
          <h2>자동 입력 정보</h2>

          <MyInput
            v-model="form.agencyName"
            label="중개사무소명"
            maxlength="50"
            required
          />
          <MyInput
            v-model="form.representativeName"
            label="대표자명"
            maxlength="50"
            required
          />
          <MyInput
            v-model="form.businessRegistrationNo"
            label="사업자등록번호"
            placeholder="123-45-67890"
            inputmode="numeric"
            maxlength="12"
            helper-text="숫자 10자리 또는 하이픈을 포함해 입력해 주세요."
            required
          />
          <MyInput
            v-model="form.startDate"
            label="개업일자"
            type="date"
            required
          />
          <MyInput
            v-model="form.agentRegistrationNo"
            label="공인중개사무소 개설등록번호"
            placeholder="11680-2024-00067"
            maxlength="20"
            required
          />

          <button
            type="button"
            class="reupload-button"
            @click="router.push('/mypage/agent-application/documents')"
          >
            ↻ 서류 다시 올리기
          </button>
        </section>

        <section v-if="documents.length" class="ocr-source">
          <h2>OCR 원문</h2>
          <details v-for="document in documents" :key="document.documentId">
            <summary>
              {{
                document.documentType === "BUSINESS_LICENSE"
                  ? "사업자 등록증"
                  : "중개사무소 등록증"
              }}
              <span>{{ document.ocrStatus }}</span>
            </summary>
            <pre>{{ document.ocrText || "추출된 원문이 없습니다." }}</pre>
          </details>
        </section>

        <p v-if="formError" class="error-box" role="alert">
          {{ formError }}
        </p>

        <div class="page-bottom-action result-action">
          <MyButton
            type="submit"
            block
            size="large"
            :disabled="!formReady || !application.editable"
            :loading="submitting"
            loading-text="신청 제출 중"
          >
            심사 제출
          </MyButton>
        </div>
      </form>

      <MyButton
        v-else-if="!loading"
        block
        variant="secondary"
        @click="router.replace('/mypage/agent-application/documents')"
      >
        서류 등록으로 이동
      </MyButton>
    </div>
  </section>
</template>

<style scoped>
.ocr-result-page {
  display: flex;
  flex-direction: column;
}

.ocr-result-content {
  flex: 1;
  padding-top: 22px;
}

.result-heading {
  display: grid;
  gap: 7px;
  margin-bottom: 20px;
}

.result-heading .page-title {
  font-size: 23px;
}

.result-heading p {
  color: var(--zipda-color-text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.result-form {
  display: grid;
  gap: 16px;
}

.notice-box {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 13px;
  border: 1px solid var(--zipda-color-border);
  border-radius: var(--zipda-radius-medium);
  font-size: 12px;
  line-height: 1.45;
}

.ocr-card,
.ocr-source {
  display: grid;
  gap: 16px;
  padding: 18px;
  border: 1px solid var(--zipda-color-border);
  border-radius: var(--zipda-radius-large);
}

.ocr-card h2,
.ocr-source h2 {
  font-size: 16px;
}

.reupload-button {
  justify-self: center;
  padding: 6px;
  color: var(--zipda-color-primary);
  background: transparent;
  border: 0;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.reupload-button:focus-visible {
  outline: none;
  box-shadow: var(--zipda-focus-ring);
}

.ocr-source details {
  padding: 12px;
  background: #f7f7f3;
  border-radius: var(--zipda-radius-medium);
}

.ocr-source summary {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--zipda-color-text);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.ocr-source summary span {
  color: var(--zipda-color-primary);
  font-size: 10px;
}

.ocr-source pre {
  max-height: 220px;
  margin-top: 12px;
  overflow: auto;
  color: var(--zipda-color-text-muted);
  font-family: inherit;
  font-size: 11px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}

.result-action {
  margin: 4px calc(var(--zipda-page-padding) * -1) -40px;
}

@media (min-width: 768px) {
  .ocr-result-content {
    width: min(100%, 620px);
    margin: 0 auto;
  }
}
</style>
