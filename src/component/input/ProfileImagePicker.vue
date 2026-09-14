<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";

const props = defineProps({
  currentUrl: { type: String, default: "" },
  removed: { type: Boolean, default: false },
  name: { type: String, default: "회원" },
  previewOnly: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
});

const emit = defineEmits(["update:file", "remove", "preview-click"]);
const fileInput = ref(null);
const objectUrl = ref("");
const errorMessage = ref("");

const previewUrl = computed(() => {
  if (objectUrl.value) return objectUrl.value;
  if (props.removed) return "";
  return props.currentUrl;
});

const releaseObjectUrl = () => {
  if (!objectUrl.value) return;
  URL.revokeObjectURL(objectUrl.value);
  objectUrl.value = "";
};

const selectFile = (event) => {
  const [file] = event.target.files || [];
  if (!file) return;
  if (
    !["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type)
  ) {
    errorMessage.value = "JPG, PNG, GIF, WEBP 이미지만 선택할 수 있어요.";
    event.target.value = "";
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    errorMessage.value = "프로필 이미지는 10MB 이하만 선택할 수 있어요.";
    event.target.value = "";
    return;
  }
  releaseObjectUrl();
  objectUrl.value = URL.createObjectURL(file);
  errorMessage.value = "";
  emit("update:file", file);
};

const removeImage = () => {
  releaseObjectUrl();
  if (fileInput.value) fileInput.value.value = "";
  emit("update:file", null);
  emit("remove");
};

const handlePreviewClick = () => {
  if (props.previewOnly) {
    emit("preview-click");
    return;
  }
  fileInput.value?.click();
};

watch(
  () => props.currentUrl,
  () => {
    if (!objectUrl.value) return;
    releaseObjectUrl();
  },
);

onBeforeUnmount(releaseObjectUrl);
</script>

<template>
  <div class="profile-picker" :class="{ 'profile-picker--compact': compact }">
    <button
      type="button"
      class="profile-picker__preview"
      :aria-label="previewOnly ? '프로필 수정으로 이동' : '프로필 이미지 선택'"
      @click="handlePreviewClick"
    >
      <img
        v-if="previewUrl"
        :src="previewUrl"
        alt=""
        referrerpolicy="no-referrer"
      />
      <span v-else>{{ name.slice(0, 1) }}</span>
    </button>
    <input
      v-if="!previewOnly"
      ref="fileInput"
      class="visually-hidden"
      type="file"
      accept="image/jpeg,image/png,image/gif,image/webp"
      @change="selectFile"
    />
    <div v-if="!previewOnly" class="profile-picker__actions">
      <button type="button" @click="fileInput?.click()">사진 선택</button>
      <button v-if="previewUrl" type="button" @click="removeImage">삭제</button>
    </div>
    <p v-if="!previewOnly && errorMessage" class="text-error">
      {{ errorMessage }}
    </p>
    <small v-else-if="!previewOnly">JPG, PNG, GIF, WEBP · 최대 10MB</small>
  </div>
</template>

<style scoped>
.profile-picker {
  display: grid;
  justify-items: center;
  gap: 10px;
}

.profile-picker__preview {
  position: relative;
  display: grid;
  place-items: center;
  overflow: hidden;
  width: 104px;
  height: 104px;
  padding: 0;
  color: var(--zipda-color-primary-active);
  background: var(--zipda-color-primary-light);
  border: 1px solid var(--zipda-color-border);
  border-radius: 50%;
  cursor: pointer;
  font-size: 34px;
  font-weight: 700;
}

.profile-picker--compact .profile-picker__preview {
  width: 92px;
  height: 92px;
  font-size: 30px;
}

.profile-picker__preview:focus-visible {
  outline: none;
  box-shadow: var(--zipda-focus-ring);
}

.profile-picker__preview img {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  object-fit: cover;
}

.profile-picker__preview i {
  position: absolute;
  right: 0;
  bottom: 3px;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  color: var(--zipda-color-white);
  background: var(--zipda-color-primary);
  border: 3px solid var(--zipda-color-white);
  border-radius: 50%;
  font-size: 14px;
  font-style: normal;
}

.profile-picker__actions {
  display: flex;
  gap: 14px;
}

.profile-picker__actions button {
  padding: 3px;
  color: var(--zipda-color-primary);
  background: transparent;
  border: 0;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
}

.profile-picker p,
.profile-picker small {
  color: var(--zipda-color-text-muted);
  font-size: 11px;
}

.profile-picker .text-error {
  color: var(--zipda-color-danger);
}
</style>
