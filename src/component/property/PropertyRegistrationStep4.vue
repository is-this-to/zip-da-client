<script setup>
import { computed, ref } from "vue";
import MyButton from "../button/MyButton.vue";
import PropertyImageUploader from "./PropertyImageUploader.vue";
import PropertyOptionSelector from "./PropertyOptionSelector.vue";
import { createRegistrationStep4Patch } from "../../store/property/propertyRequestPolicy.js";

const props = defineProps({
  propertyType: { type: String, required: true },
  initialFileIds: { type: Array, default: () => [] },
  initialOptions: { type: Array, default: () => [] },
  errorMessage: { type: String, default: "" },
});
const emit = defineEmits(["back", "busy-change", "complete"]);

const fileIds = ref([...props.initialFileIds]);
const options = ref(props.initialOptions.map((option) => ({ ...option })));
const optionsReady = ref(false);
const imagesBusy = ref(false);
const canComplete = computed(() =>
  optionsReady.value
  && !imagesBusy.value
  && fileIds.value.length >= 1
  && fileIds.value.length <= 30,
);

const currentPatch = () => createRegistrationStep4Patch(fileIds.value, options.value);

const setImagesBusy = (busy) => {
  imagesBusy.value = busy;
  emit("busy-change", busy);
};

const goBack = () => {
  if (imagesBusy.value) return;
  emit("back", currentPatch());
};

const complete = () => {
  if (!canComplete.value) return;
  emit("complete", currentPatch());
};

defineExpose({ currentPatch });
</script>

<template>
  <div class="registration-step4">
    <PropertyOptionSelector
      v-model="options"
      :property-type="propertyType"
      @ready-change="optionsReady = $event"
    />
    <PropertyImageUploader
      v-model="fileIds"
      @busy-change="setImagesBusy"
    />

    <p v-if="errorMessage" class="error-box" role="alert">{{ errorMessage }}</p>
    <p v-if="fileIds.length === 0" class="text-error" role="alert">
      다음 단계로 이동하려면 업로드 완료된 사진이 1장 이상 필요합니다.
    </p>

    <div class="form-actions form-actions--step step4-actions">
      <MyButton variant="outline" :disabled="imagesBusy" @click="goBack">이전</MyButton>
      <MyButton :disabled="!canComplete" :loading="imagesBusy" @click="complete">5단계 확인</MyButton>
    </div>
  </div>
</template>

<style scoped>
.registration-step4 { display: grid; gap: 26px; }
.step4-actions { position: sticky; bottom: 0; z-index: 10; width: calc(100% + var(--zipda-page-padding) + var(--zipda-page-padding)); margin: 0 calc(var(--zipda-page-padding) * -1) -40px; padding: 12px var(--zipda-page-padding) calc(12px + env(safe-area-inset-bottom)); background: linear-gradient(to bottom, rgb(255 255 255 / 75%), var(--zipda-color-white) 24%); }
</style>
