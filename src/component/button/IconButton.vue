<script setup>
const props = defineProps({
  // 스크린 리더가 읽을 버튼의 목적. 아이콘 버튼에는 반드시 필요하다.
  label: { type: String, required: true },
  // SVG가 준비되기 전 또는 단순 아이콘 표시에 사용하는 값
  icon: { type: String, default: '' },
  variant: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'primary', 'danger'].includes(value),
  },
  // 찜처럼 켜짐·꺼짐 상태가 있는 버튼의 현재 상태
  pressed: { type: Boolean, default: undefined },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['click'])

const handleClick = (event) => {
  if (props.disabled || props.loading) return
  emit('click', event)
}
</script>

<template>
  <button
    type="button"
    class="icon-button"
    :class="[`icon-button--${variant}`, { 'icon-button--pressed': pressed }]"
    :disabled="disabled || loading"
    :aria-label="label"
    :aria-pressed="pressed"
    :aria-busy="loading"
    @click="handleClick"
  >
    <span v-if="loading" class="icon-button__spinner" aria-hidden="true"></span>
    <slot v-else><span aria-hidden="true">{{ icon }}</span></slot>
  </button>
</template>

<style scoped>
.icon-button {
  display: inline-grid;
  place-items: center;
  width: 40px;
  height: 40px;
  padding: 0;
  color: var(--zipda-color-text);
  background: var(--zipda-color-white);
  border: 1px solid var(--zipda-color-border);
  border-radius: var(--zipda-radius-medium);
  cursor: pointer;
}

.icon-button:focus-visible {
  outline: none;
  box-shadow: var(--zipda-focus-ring);
}

.icon-button--primary,
.icon-button--pressed {
  color: var(--zipda-color-subtle-text);
  background: var(--zipda-color-subtle-hover);
  border-color: var(--zipda-color-subtle-hover);
}

.icon-button--danger {
  color: var(--zipda-color-danger);
}

.icon-button:disabled {
  color: var(--zipda-color-text-muted);
  background: var(--zipda-color-disabled);
  cursor: not-allowed;
}

.icon-button__spinner {
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: icon-button-spin 700ms linear infinite;
}

@keyframes icon-button-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .icon-button__spinner {
    animation: none;
  }
}
</style>
