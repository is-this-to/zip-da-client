<script setup>
import { computed, useId } from 'vue'

const props = defineProps({
  id: { type: String, default: '' },
  name: { type: String, default: '' },
  type: { type: String, default: 'text' },
  label: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  helperText: { type: String, default: '' },
  errorMessage: { type: String, default: '' },
  autocomplete: { type: String, default: 'off' },
  inputmode: { type: String, default: undefined },
  maxlength: { type: Number, default: undefined },
  required: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})

const model = defineModel({ type: [String, Number], default: '' })
const generatedId = useId()
const inputId = computed(() => props.id || `zipda-input-${generatedId}`)
const descriptionId = computed(() => `${inputId.value}-description`)
</script>

<template>
  <div class="my-input" :class="{ 'my-input--error': errorMessage }">
    <label v-if="label" class="my-input__label" :for="inputId">
      {{ label }}<span v-if="required" class="my-input__required" aria-hidden="true"> *</span>
    </label>

    <div class="my-input__control">
      <slot name="leading"></slot>
      <input
        :id="inputId"
        v-model="model"
        class="my-input__field"
        :name="name"
        :type="type"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        :inputmode="inputmode"
        :maxlength="maxlength"
        :required="required"
        :readonly="readonly"
        :disabled="disabled"
        :aria-invalid="Boolean(errorMessage)"
        :aria-describedby="helperText || errorMessage ? descriptionId : undefined"
      />
      <slot name="trailing"></slot>
    </div>

    <p v-if="errorMessage || helperText" :id="descriptionId" class="my-input__message">
      {{ errorMessage || helperText }}
    </p>
  </div>
</template>

<style scoped>
.my-input {
  display: grid;
  width: 100%;
  gap: 7px;
  text-align: left;
}

.my-input__label {
  color: var(--zipda-color-text);
  font-size: 14px;
  font-weight: 700;
}

.my-input__required {
  color: var(--zipda-color-danger);
}

.my-input__control {
  display: flex;
  align-items: center;
  min-height: 46px;
  box-sizing: border-box;
  padding: 0 13px;
  overflow: hidden;
  background: var(--zipda-color-white);
  border: 1px solid var(--zipda-color-border);
  border-radius: var(--zipda-radius-medium);
  transition: border-color 150ms ease, box-shadow 150ms ease;
}

.my-input__control:focus-within {
  border-color: var(--zipda-color-primary);
  box-shadow: var(--zipda-focus-ring);
}

.my-input__field {
  width: 100%;
  min-width: 0;
  padding: 0;
  color: var(--zipda-color-text);
  background: transparent;
  border: 0;
  outline: 0;
  font: inherit;
  font-size: 15px;
}

.my-input__field::placeholder {
  color: var(--zipda-color-text-muted);
}

.my-input__field:disabled {
  cursor: not-allowed;
}

.my-input__control:has(.my-input__field:disabled) {
  background: var(--zipda-color-disabled);
}

.my-input--error .my-input__control {
  border-color: var(--zipda-color-danger);
}

.my-input__message {
  margin: 0;
  color: var(--zipda-color-text-muted);
  font-size: 12px;
  line-height: 1.4;
}

.my-input--error .my-input__message {
  color: var(--zipda-color-danger);
}
</style>
