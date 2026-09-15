<script setup>
import { computed, ref } from "vue";
import {
  completePropertyFile,
  createPropertyUploadSession,
  putPropertyFile,
} from "../../api/propertyFileApi.js";

const emit = defineEmits(["busy-change"]);
const propertyFileIds = defineModel({ type: Array, default: () => [] });
const uploadedFiles = ref(propertyFileIds.value.map((propertyFileId, index) => ({
  propertyFileId,
  name: `업로드된 증빙 ${index + 1}`,
})));
const input = ref(null);
const isUploading = ref(false);
const errorMessage = ref("");
const remainingCount = computed(() => 30 - uploadedFiles.value.length);
const allowedExtension = /\.(jpg|jpeg|png|gif|webp)$/i;
const maxFileSize = 20 * 1024 * 1024;

const syncFileIds = () => {
  propertyFileIds.value = uploadedFiles.value.map((item) => item.propertyFileId);
};

const uploadFiles = async (event) => {
  const files = Array.from(event.target.files ?? []);
  event.target.value = "";
  errorMessage.value = "";
  if (files.length === 0) return;
  if (files.length > remainingCount.value) {
    errorMessage.value = "증빙 파일은 최대 30개까지 등록할 수 있습니다.";
    return;
  }
  if (files.some((file) => !allowedExtension.test(file.name))) {
    errorMessage.value = "JPG, JPEG, PNG, GIF, WebP 파일만 업로드할 수 있습니다.";
    return;
  }
  if (files.some((file) => file.size <= 0 || file.size > maxFileSize)) {
    errorMessage.value = "파일당 크기는 0보다 크고 20MB 이하여야 합니다.";
    return;
  }

  isUploading.value = true;
  emit("busy-change", true);
  try {
    const uploads = await createPropertyUploadSession(files, "VERIFICATION");
    const results = await Promise.all(files.map(async (file, index) => {
      try {
        await putPropertyFile(uploads[index], file);
        const propertyFileId = await completePropertyFile(uploads[index].fileId, file);
        return { propertyFileId, name: file.name };
      } catch {
        return null;
      }
    }));
    const completed = results.filter(Boolean);
    uploadedFiles.value = [...uploadedFiles.value, ...completed];
    syncFileIds();
    const failedCount = files.length - completed.length;
    if (failedCount > 0) {
      errorMessage.value = `${failedCount}개 파일의 업로드를 완료하지 못했습니다. 완료된 파일만 목록에 포함했습니다.`;
    }
  } catch {
    errorMessage.value = "증빙 업로드를 시작하지 못했습니다. 다시 시도해 주세요.";
  } finally {
    isUploading.value = false;
    emit("busy-change", false);
  }
};

const removeFile = (index) => {
  uploadedFiles.value = uploadedFiles.value.filter((_, itemIndex) => itemIndex !== index);
  syncFileIds();
};
</script>

<template>
  <section class="verification-uploader" aria-labelledby="verification-files-title">
    <div class="heading">
      <div>
        <h2 id="verification-files-title">검증 증빙 파일</h2>
        <p>JPG, JPEG, PNG, GIF, WebP · 파일당 최대 20MB · 최대 30개</p>
      </div>
      <span>{{ uploadedFiles.length }}/30</span>
    </div>
    <input
      ref="input"
      class="file-input"
      type="file"
      accept=".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp"
      multiple
      :disabled="isUploading || remainingCount === 0"
      @change="uploadFiles"
    />
    <button type="button" class="upload-button" :disabled="isUploading || remainingCount === 0" @click="input?.click()">
      {{ isUploading ? "증빙 파일을 업로드하고 있습니다…" : "증빙 파일 선택" }}
    </button>
    <p v-if="errorMessage" class="error-box" role="alert">{{ errorMessage }}</p>
    <p v-if="uploadedFiles.length === 0" class="info-box">업로드가 완료된 증빙 파일이 없습니다.</p>
    <ul v-else class="file-list">
      <li v-for="(item, index) in uploadedFiles" :key="item.propertyFileId">
        <span :title="item.name">{{ item.name }}</span>
        <button type="button" :disabled="isUploading" :aria-label="`${item.name} 목록에서 제거`" @click="removeFile(index)">삭제</button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.verification-uploader { display: grid; gap: 14px; }
.heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.heading div { display: grid; gap: 5px; }
.heading h2 { font-size: 18px; }
.heading p { color: var(--zipda-color-text-muted); font-size: 13px; line-height: 1.45; }
.heading > span { flex: 0 0 auto; color: var(--zipda-color-primary-active); font-size: 12px; font-weight: 700; }
.file-input { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.upload-button { min-height: 88px; padding: 16px; color: var(--zipda-color-primary-active); background: var(--zipda-color-primary-light); border: 1px dashed var(--zipda-color-primary); border-radius: var(--zipda-radius-large); font: inherit; font-weight: 700; cursor: pointer; }
.upload-button:disabled { cursor: not-allowed; opacity: 0.65; }
.file-list { display: grid; gap: 8px; padding: 0; margin: 0; list-style: none; }
.file-list li { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px; border: 1px solid var(--zipda-color-border); border-radius: var(--zipda-radius-small); }
.file-list span { overflow: hidden; min-width: 0; text-overflow: ellipsis; white-space: nowrap; }
.file-list button { flex: 0 0 auto; padding: 6px 10px; color: var(--zipda-color-text); background: var(--zipda-color-white); border: 1px solid var(--zipda-color-border); border-radius: var(--zipda-radius-small); cursor: pointer; }
.file-list button:disabled { opacity: 0.45; cursor: not-allowed; }
</style>
