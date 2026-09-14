<script setup>
import { computed, ref, useId } from 'vue'

const props = defineProps({
  id: { type: String, default: '' },
  name: { type: String, default: '' },
  label: { type: String, default: '파일 첨부' },
  buttonText: { type: String, default: '파일 선택' },
  helperText: { type: String, default: '' },
  errorMessage: { type: String, default: '' },
  // 백엔드 업로드 정책 API에서 받은 허용 확장자·MIME 문자열
  accept: { type: String, default: '' },
  // 백엔드 업로드 정책 API에서 받은 최대 크기(byte). null이면 프론트 크기 검사를 생략한다.
  maxSize: { type: Number, default: null },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['validation-error', 'change'])
const model = defineModel({ default: null })
const fileInput = ref(null)
const internalError = ref('')
const generatedId = useId()
const inputId = computed(() => props.id || `zipda-file-${generatedId}`)
const descriptionId = computed(() => `${inputId.value}-description`)
const displayedError = computed(() => props.errorMessage || internalError.value)

const setError = (message) => {
  internalError.value = message
  emit('validation-error', message)
}

const handleChange = (event) => {
  const file = event.target.files?.[0] ?? null
  internalError.value = ''

  if (!file) {
    model.value = null
    emit('change', event)
    return
  }

  if (props.maxSize && file.size > props.maxSize) {
    event.target.value = ''
    model.value = null
    setError(`파일 크기는 ${Math.floor(props.maxSize / 1024 / 1024)}MB 이하여야 합니다.`)
    emit('change', event)
    return
  }

  model.value = file
  emit('change', event)
}

const clearFile = () => {
  model.value = null
  internalError.value = ''
  if (fileInput.value) fileInput.value.value = ''
  emit('change', null)
}
</script>

<template>
  <div class="my-file-input" :class="{ 'my-file-input--error': displayedError }">
    <span class="my-file-input__label">
      {{ label }}<span v-if="required" class="my-file-input__required" aria-hidden="true"> *</span>
    </span>

    <div class="my-file-input__control">
      <input
        :id="inputId"
        ref="fileInput"
        class="my-file-input__native"
        type="file"
        :name="name"
        :accept="accept"
        :required="required && !model"
        :disabled="disabled || loading"
        :aria-invalid="Boolean(displayedError)"
        :aria-describedby="helperText || displayedError ? descriptionId : undefined"
        @change="handleChange"
      />

      <label
        class="my-file-input__button"
        :class="{ 'my-file-input__button--disabled': disabled || loading }"
        :for="inputId"
      >
        {{ loading ? 'OCR 처리 중' : buttonText }}
      </label>

      <span class="my-file-input__filename">
        {{ model?.name || '선택된 파일 없음' }}
      </span>

      <button
        v-if="model && !loading"
        type="button"
        class="my-file-input__clear"
        aria-label="선택한 파일 제거"
        @click="clearFile"
      >
        제거
      </button>
    </div>

    <p v-if="displayedError || helperText" :id="descriptionId" class="my-file-input__message">
      {{ displayedError || helperText }}
    </p>
  </div>
</template>

<style scoped>
.my-file-input {
  display: grid;
  width: 100%;
  gap: 7px;
  text-align: left;
}

.my-file-input__label {
  color: var(--zipda-color-text);
  font-size: 14px;
  font-weight: 700;
}

.my-file-input__required,
.my-file-input--error .my-file-input__message {
  color: var(--zipda-color-danger);
}

.my-file-input__control {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 46px;
}

.my-file-input__native {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.my-file-input__native:focus-visible + .my-file-input__button {
  box-shadow: var(--zipda-focus-ring);
}

.my-file-input__button {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0 14px;
  color: var(--zipda-color-white);
  background: var(--zipda-color-primary);
  border-radius: var(--zipda-radius-medium);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.my-file-input__button--disabled {
  color: var(--zipda-color-text-muted);
  background: var(--zipda-color-disabled);
  cursor: not-allowed;
}

.my-file-input__filename {
  min-width: 0;
  overflow: hidden;
  color: var(--zipda-color-text-muted);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.my-file-input__clear {
  flex: 0 0 auto;
  padding: 4px;
  color: var(--zipda-color-danger);
  background: transparent;
  border: 0;
  font: inherit;
  font-size: 12px;
  text-decoration: underline;
  cursor: pointer;
}

.my-file-input__message {
  margin: 0;
  color: var(--zipda-color-text-muted);
  font-size: 12px;
  line-height: 1.4;
}
</style>
