<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import Header from "../../component/Header.vue";
import MyButton from "../../component/button/MyButton.vue";
import { useMemberStore } from "../../store/member/member.js";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "application/pdf"];

const router = useRouter();
const memberStore = useMemberStore();
const pageError = ref("");
const uploading = ref(false);
const draggingType = ref("");

const documents = reactive([
  {
    type: "BUSINESS_LICENSE",
    label: "사업자 등록증",
    helperText: "사업자 등록증 사본",
    file: null,
    previewUrl: "",
    error: "",
  },
  {
    type: "BROKER_OFFICE_LICENSE",
    label: "중개사무소 등록증",
    helperText: "중개사무소 등록증 사본",
    file: null,
    previewUrl: "",
    error: "",
  },
]);

const application = computed(() => memberStore.agentApplication);
const isEditable = computed(() => application.value?.editable === true);

const latestUploadedDocument = (documentType) =>
  [...(application.value?.documents || [])]
    .filter((document) => document.documentType === documentType)
    .sort((left, right) =>
      String(right.uploadedAt || "").localeCompare(
        String(left.uploadedAt || ""),
      ),
    )[0];

const hasCompletedDocument = (documentType) =>
  latestUploadedDocument(documentType)?.ocrStatus === "COMPLETED";

const canContinue = computed(
  () =>
    isEditable.value &&
    documents.every(
      (document) => document.file || hasCompletedDocument(document.type),
    ),
);

const readError = (error, fallback) => {
  const responseData = error?.response?.data;
  if (typeof responseData?.message === "string") return responseData.message;
  if (typeof responseData?.data === "string") return responseData.data;
  return fallback;
};

const releasePreview = (document) => {
  if (document.previewUrl) {
    URL.revokeObjectURL(document.previewUrl);
    document.previewUrl = "";
  }
};

const clearSelectedFile = (document) => {
  releasePreview(document);
  document.file = null;
  document.error = "";
};

const validateFile = (file) => {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const allowedExtension = ["jpg", "jpeg", "png", "pdf"].includes(extension);

  if (!ALLOWED_FILE_TYPES.includes(file.type) && !allowedExtension) {
    return "JPG, PNG, PDF 파일만 업로드할 수 있습니다.";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "파일 크기는 10MB 이하여야 합니다.";
  }
  return "";
};

const selectFile = (document, file) => {
  if (!file) return;

  const validationMessage = validateFile(file);
  if (validationMessage) {
    document.error = validationMessage;
    return;
  }

  releasePreview(document);
  document.file = file;
  document.previewUrl = URL.createObjectURL(file);
  document.error = "";
  pageError.value = "";
};

const onFileChange = (document, event) => {
  selectFile(document, event.target.files?.[0]);
  event.target.value = "";
};

const onDrop = (document, event) => {
  draggingType.value = "";
  selectFile(document, event.dataTransfer.files?.[0]);
};

const loadApplication = async () => {
  try {
    pageError.value = "";
    await memberStore.initializeAgentApplication();
  } catch (error) {
    pageError.value = readError(
      error,
      "중개사 전환 신청 정보를 불러오지 못했습니다.",
    );
  }
};

const uploadDocuments = async () => {
  if (!canContinue.value || uploading.value) return;

  try {
    uploading.value = true;
    pageError.value = "";

    for (const document of documents) {
      if (!document.file) continue;

      const result = await memberStore.uploadAgentDocument(
        application.value.applicationId,
        document.type,
        document.file,
      );

      if (result.ocrStatus !== "COMPLETED") {
        document.error =
          result.failureReason ||
          "문서 내용을 읽지 못했습니다. 더 선명한 서류로 다시 시도해 주세요.";
        return;
      }

      clearSelectedFile(document);
    }

    await memberStore.getCurrentAgentApplication();
    await router.push("/mypage/agent-application/ocr");
  } catch (error) {
    pageError.value = readError(
      error,
      "서류 업로드 또는 OCR 처리에 실패했습니다.",
    );
  } finally {
    uploading.value = false;
  }
};

onMounted(loadApplication);
onBeforeUnmount(() => {
  documents.forEach(releasePreview);
});
</script>

<template>
  <section class="page document-upload-page">
    <Header title="서류 업로드" show-back back-to="/mypage" />

    <div class="page-content document-upload-content">
      <header class="upload-heading">
        <h1 class="page-title">서류 등록</h1>
        <p>
          서류에서 신청 정보를 자동으로 읽어 입력 부담을 줄입니다. 원본은
          비공개로 안전하게 보관됩니다.
        </p>
        <small>※ 최대 10MB 크기의 JPG, PNG, PDF 파일 업로드 가능</small>
      </header>

      <p v-if="memberStore.loadingAgentApplication" class="info-box">
        신청 정보를 불러오고 있어요.
      </p>
      <p v-else-if="pageError" class="error-box" role="alert">
        {{ pageError }}
      </p>
      <p
        v-if="
          application && !isEditable && !memberStore.loadingAgentApplication
        "
        class="info-box"
      >
        현재 신청은 제출되어 서류를 수정할 수 없습니다.
      </p>

      <div v-if="application && isEditable" class="document-list">
        <section
          v-for="document in documents"
          :key="document.type"
          class="document-section"
        >
          <div class="document-title">
            <h2>{{ document.label }}</h2>
            <span v-if="hasCompletedDocument(document.type) && !document.file">
              업로드 완료
            </span>
          </div>

          <label
            class="dropzone"
            :class="{
              'dropzone--dragging': draggingType === document.type,
              'dropzone--selected': document.file,
              'dropzone--error': document.error,
            }"
            @dragenter.prevent="draggingType = document.type"
            @dragover.prevent="draggingType = document.type"
            @dragleave.prevent="draggingType = ''"
            @drop.prevent="onDrop(document, $event)"
          >
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
              @change="onFileChange(document, $event)"
            />

            <template v-if="document.previewUrl">
              <img
                v-if="document.file.type.startsWith('image/')"
                class="file-preview"
                :src="document.previewUrl"
                :alt="`${document.label} 미리보기`"
              />
              <iframe
                v-else
                class="file-preview pdf-file-preview"
                :src="document.previewUrl"
                :title="`${document.label} PDF 미리보기`"
              ></iframe>
              <strong class="selected-file-name">{{
                document.file.name
              }}</strong>
              <small>클릭하거나 파일을 드래그해 교체</small>
            </template>

            <template v-else>
              <i class="upload-icon" aria-hidden="true">⇧</i>
              <strong>파일 선택 또는 여기로 드래그</strong>
              <small>{{ document.helperText }}</small>
            </template>
          </label>

          <div v-if="document.file" class="file-actions">
            <span> {{ (document.file.size / 1024 / 1024).toFixed(1) }}MB </span>
            <button type="button" @click="clearSelectedFile(document)">
              선택 취소
            </button>
          </div>
          <p v-if="document.error" class="document-error" role="alert">
            {{ document.error }}
          </p>
        </section>
      </div>
    </div>

    <div class="page-bottom-action">
      <MyButton
        block
        size="large"
        :disabled="!canContinue"
        :loading="uploading"
        loading-text="서류 분석 중"
        @click="uploadDocuments"
      >
        다음 단계로
      </MyButton>
    </div>
  </section>
</template>

<style scoped>
.document-upload-page {
  display: flex;
  flex-direction: column;
}

.document-upload-content {
  flex: 1;
  padding-top: 22px;
}

.upload-heading {
  display: grid;
  gap: 7px;
  margin-bottom: 24px;
}

.upload-heading .page-title {
  font-size: 23px;
}

.upload-heading p {
  color: var(--zipda-color-text-muted);
  font-size: 13px;
  line-height: 1.55;
}

.upload-heading small {
  color: var(--zipda-color-primary);
  font-size: 11px;
}

.document-list {
  display: grid;
  gap: 24px;
}

.document-section {
  display: grid;
  gap: 9px;
}

.document-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.document-title h2 {
  font-size: 16px;
}

.document-title span {
  color: var(--zipda-color-primary);
  font-size: 11px;
  font-weight: 700;
}

.dropzone {
  display: grid;
  place-items: center;
  align-content: center;
  gap: 7px;
  min-height: 166px;
  padding: 16px;
  overflow: hidden;
  text-align: center;
  background: #f6f5ef;
  border: 1px dashed #cfd5c7;
  border-radius: 14px;
  cursor: pointer;
  transition:
    border-color 150ms ease,
    background-color 150ms ease;
}

.dropzone--dragging,
.dropzone:focus-within {
  background: #eef5e4;
  border-color: var(--zipda-color-primary);
  box-shadow: var(--zipda-focus-ring);
}

.dropzone--selected {
  border-style: solid;
}

.dropzone--error {
  border-color: var(--zipda-color-danger);
}

.dropzone input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.dropzone strong {
  max-width: 100%;
  overflow: hidden;
  color: var(--zipda-color-primary-active);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropzone small {
  color: #8a9878;
  font-size: 11px;
}

.upload-icon,
.pdf-preview {
  display: grid;
  place-items: center;
  width: 50px;
  height: 50px;
  color: var(--zipda-color-primary);
  background: var(--zipda-color-white);
  border-radius: 50%;
  font-size: 25px;
  font-style: normal;
  font-weight: 800;
}

.pdf-preview {
  border: 1px solid var(--zipda-color-border);
  border-radius: 10px;
  font-size: 13px;
}

.file-preview {
  width: 100%;
  height: 86px;
  border-radius: 8px;
  object-fit: contain;
}

.pdf-file-preview {
  background: var(--zipda-color-white);
  border: 0;
  pointer-events: none;
}

.selected-file-name {
  width: 100%;
}

.file-actions {
  display: flex;
  justify-content: space-between;
  color: var(--zipda-color-text-muted);
  font-size: 11px;
}

.file-actions button {
  padding: 0;
  color: var(--zipda-color-primary);
  background: transparent;
  border: 0;
  font-size: 11px;
  text-decoration: underline;
  cursor: pointer;
}

.document-error {
  color: var(--zipda-color-danger);
  font-size: 12px;
  line-height: 1.4;
}

@media (min-width: 768px) {
  .document-upload-content,
  .document-upload-page > .page-bottom-action {
    width: min(100%, 620px);
    margin-right: auto;
    margin-left: auto;
  }

  .document-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
