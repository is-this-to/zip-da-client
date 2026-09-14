<script setup>
import { computed, useId } from "vue";

const props = defineProps({
  id: { type: String, default: "" },
  label: { type: String, default: "" },
  placeholder: { type: String, default: "" },
  helperText: { type: String, default: "" },
  errorMessage: { type: String, default: "" },
  maxlength: { type: Number, default: undefined },
  rows: { type: Number, default: 5 },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
});

const model = defineModel({ type: String, default: "" });
const generatedId = useId();
const textareaId = computed(() => props.id || `zipda-textarea-${generatedId}`);
const descriptionId = computed(() => `${textareaId.value}-description`);
</script>

<template>
  <div class="my-textarea" :class="{ 'my-textarea--error': errorMessage }">
    <label v-if="label" class="my-textarea__label" :for="textareaId">
      {{ label }}<span v-if="required" class="my-textarea__required"> *</span>
    </label>
    <textarea
      :id="textareaId"
      v-model="model"
      class="my-textarea__field"
      :placeholder="placeholder"
      :maxlength="maxlength"
      :rows="rows"
      :required="required"
      :disabled="disabled"
      :aria-invalid="Boolean(errorMessage)"
      :aria-describedby="helperText || errorMessage ? descriptionId : undefined"
    ></textarea>
    <div class="my-textarea__footer">
      <p v-if="errorMessage || helperText" :id="descriptionId">
        {{ errorMessage || helperText }}
      </p>
      <small v-if="maxlength">{{ model.length }}/{{ maxlength }}</small>
    </div>
  </div>
</template>

<style scoped>
.my-textarea {
  display: grid;
  gap: 7px;
}

.my-textarea__label {
  font-size: 14px;
  font-weight: 700;
}

.my-textarea__required,
.my-textarea--error .my-textarea__footer p {
  color: var(--zipda-color-danger);
}

.my-textarea__field {
  width: 100%;
  min-height: 120px;
  padding: 13px;
  resize: vertical;
  color: var(--zipda-color-text);
  background: var(--zipda-color-white);
  border: 1px solid var(--zipda-color-border);
  border-radius: var(--zipda-radius-medium);
  outline: none;
  line-height: 1.55;
}

.my-textarea__field:focus {
  border-color: var(--zipda-color-primary);
  box-shadow: var(--zipda-focus-ring);
}

.my-textarea__footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  min-height: 17px;
  color: var(--zipda-color-text-muted);
  font-size: 12px;
}

.my-textarea__footer small {
  margin-left: auto;
}
</style>

