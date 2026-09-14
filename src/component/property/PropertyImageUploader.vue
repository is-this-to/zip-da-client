<script setup>
import { computed, onBeforeUnmount, ref } from "vue";
import {
  completePropertyFile,
  createPropertyUploadSession,
  putPropertyFile,
} from "../../api/propertyFileApi.js";
import { createFilePreviewUrl } from "../../api/propertyFilePolicy.js";

const emit = defineEmits(["busy-change"]);
const fileIds = defineModel({ type: Array, default: () => [] });
const input = ref(null);
const isUploading = ref(false);
const errorMessage = ref("");
const uploadedFiles = ref(fileIds.value.map((fileId, index) => ({
  fileId,
  name: `업로드된 사진 ${index + 1}`,
  previewUrl: "",
})));

const remainingCount = computed(() => 30 - uploadedFiles.value.length);

const syncFileIds = () => {
  fileIds.value = uploadedFiles.value.map((item) => item.fileId);
};

const uploadFiles = async (event) => {
  const selectedFiles = Array.from(event.target.files ?? []);
  event.target.value = "";
  errorMessage.value = "";
  if (selectedFiles.length === 0) return;
  if (selectedFiles.length > remainingCount.value) {
    errorMessage.value = "사진은 최대 30장까지 등록할 수 있습니다.";
    return;
  }

  isUploading.value = true;
  emit("busy-change", true);
  try {
    const uploads = await createPropertyUploadSession(selectedFiles);
    const results = await Promise.all(selectedFiles.map(async (file, index) => {
      try {
        const upload = uploads[index];
        await putPropertyFile(upload, file);
        const fileId = await completePropertyFile(upload.fileId, file);
        return {
          fileId,
          name: file.name,
          previewUrl: createFilePreviewUrl(file),
        };
      } catch {
        return null;
      }
    }));

    const completed = results.filter(Boolean);
    uploadedFiles.value = [...uploadedFiles.value, ...completed];
    syncFileIds();
    const failedCount = selectedFiles.length - completed.length;
    if (failedCount > 0) {
      errorMessage.value = `${failedCount}장의 업로드를 완료하지 못했습니다. 완료된 사진만 등록 목록에 포함했습니다.`;
    }
  } catch {
    errorMessage.value = "사진 업로드를 시작하지 못했습니다. 다시 시도해 주세요.";
  } finally {
    isUploading.value = false;
    emit("busy-change", false);
  }
};

const removeFile = (index) => {
  const [removed] = uploadedFiles.value.splice(index, 1);
  if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
  uploadedFiles.value = [...uploadedFiles.value];
  syncFileIds();
};

const moveFile = (index, offset) => {
  const target = index + offset;
  if (target < 0 || target >= uploadedFiles.value.length) return;
  const reordered = [...uploadedFiles.value];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
  uploadedFiles.value = reordered;
  syncFileIds();
};

onBeforeUnmount(() => {
  uploadedFiles.value.forEach((item) => {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
  });
});
</script>

<template>
  <section class="image-uploader" aria-labelledby="property-image-title">
    <div class="section-heading">
      <div>
        <h2 id="property-image-title">사진</h2>
        <p>첫 번째 사진이 대표 이미지가 됩니다. 1장 이상, 최대 30장까지 등록해 주세요.</p>
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
    <button
      type="button"
      class="upload-button"
      :disabled="isUploading || remainingCount === 0"
      @click="input?.click()"
    >
      {{ isUploading ? "사진을 업로드하고 있습니다…" : "사진 선택" }}
    </button>

    <p v-if="errorMessage" class="error-box" role="alert">{{ errorMessage }}</p>
    <p v-if="uploadedFiles.length === 0" class="info-box">complete까지 성공한 사진이 아직 없습니다.</p>

    <ol v-else class="image-list">
      <li v-for="(item, index) in uploadedFiles" :key="item.fileId" class="image-item">
        <img v-if="item.previewUrl" :src="item.previewUrl" :alt="item.name" />
        <span v-else class="image-placeholder" aria-hidden="true">사진</span>
        <div class="image-copy">
          <strong>{{ index === 0 ? "대표 이미지" : `${index + 1}번째 사진` }}</strong>
          <span>{{ item.name }}</span>
        </div>
        <div class="image-actions" aria-label="사진 순서 및 삭제">
          <button type="button" :disabled="isUploading || index === 0" aria-label="앞으로 이동" @click="moveFile(index, -1)">←</button>
          <button type="button" :disabled="isUploading || index === uploadedFiles.length - 1" aria-label="뒤로 이동" @click="moveFile(index, 1)">→</button>
          <button type="button" :disabled="isUploading" aria-label="사진 삭제" @click="removeFile(index)">삭제</button>
        </div>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.image-uploader { display: grid; gap: 14px; }
.section-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.section-heading div { display: grid; gap: 5px; }
.section-heading h2 { font-size: 18px; }
.section-heading p { color: var(--zipda-color-text-muted); font-size: 13px; line-height: 1.45; }
.section-heading > span { flex: 0 0 auto; color: var(--zipda-color-primary-active); font-size: 12px; font-weight: 700; }
.file-input { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.upload-button { min-height: 88px; padding: 16px; color: var(--zipda-color-primary-active); background: var(--zipda-color-primary-light); border: 1px dashed var(--zipda-color-primary); border-radius: var(--zipda-radius-large); font: inherit; font-weight: 700; cursor: pointer; }
.upload-button:disabled { cursor: not-allowed; opacity: 0.65; }
.image-list { display: grid; gap: 9px; padding: 0; margin: 0; list-style: none; }
.image-item { display: grid; grid-template-columns: 64px minmax(0, 1fr) auto; align-items: center; gap: 10px; padding: 9px; border: 1px solid var(--zipda-color-border); border-radius: var(--zipda-radius-medium); }
.image-item img,
.image-placeholder { width: 64px; height: 64px; border-radius: var(--zipda-radius-small); object-fit: cover; }
.image-placeholder { display: grid; place-items: center; color: var(--zipda-color-text-muted); background: var(--zipda-color-surface); font-size: 12px; }
.image-copy { display: grid; gap: 4px; min-width: 0; }
.image-copy strong { font-size: 13px; }
.image-copy span { overflow: hidden; color: var(--zipda-color-text-muted); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.image-actions { display: flex; gap: 4px; }
.image-actions button { min-width: 32px; min-height: 32px; padding: 5px 7px; background: var(--zipda-color-white); border: 1px solid var(--zipda-color-border); border-radius: var(--zipda-radius-small); color: var(--zipda-color-text); cursor: pointer; }
.image-actions button:disabled { cursor: not-allowed; opacity: 0.45; }
@media (max-width: 560px) { .image-item { grid-template-columns: 56px minmax(0, 1fr); } .image-item img, .image-placeholder { width: 56px; height: 56px; } .image-actions { grid-column: 1 / -1; justify-content: flex-end; } }
</style>
