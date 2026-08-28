<script setup>
const props = defineProps({
  // HTML <button>의 동작 유형
  // - button: 폼 제출 없이 클릭 이벤트만 실행하는 일반 버튼
  // - submit: 소속된 <form>의 submit 이벤트를 실행하는 제출 버튼
  // - reset: 소속된 <form>의 입력값을 초기값으로 되돌리는 초기화 버튼
  type: {
    type: String,
    default: 'button',
    validator: (value) => ['button', 'submit', 'reset'].includes(value),
  },
  // 버튼의 색상과 강조 유형
  // - primary: 주요 실행, secondary: 보조 실행, outline: 테두리형 보조 실행
  // - subtle: 더보기·상세보기 등 낮은 강조, danger: 삭제·탈퇴 등 위험 실행
  // - text: 링크형 실행, kakao: 카카오 로그인
  variant: {
    type: String,
    default: 'primary',
    validator: (value) =>
      ['primary', 'secondary', 'outline', 'subtle', 'danger', 'text', 'kakao'].includes(value),
  },
  // 버튼의 높이와 글자 크기: small, medium, large
  size: {
    type: String,
    default: 'medium',
    validator: (value) => ['small', 'medium', 'large'].includes(value),
  },
  // true이면 버튼 너비를 부모 영역의 100%로 확장
  block: {
    type: Boolean,
    default: false,
  },
  // true이면 버튼을 비활성화하고 클릭을 차단
  disabled: {
    type: Boolean,
    default: false,
  },
  // true이면 처리 중 표시를 출력하고 중복 클릭을 차단
  loading: {
    type: Boolean,
    default: false,
  },
  // loading 상태일 때 버튼에 표시할 문구
  loadingText: {
    type: String,
    default: '처리 중',
  },
})

const emit = defineEmits(['click'])

const handleClick = (event) => {
  if (props.disabled || props.loading) return
  emit('click', event)
}
</script>

<template>
  <button
    :type="type"
    class="my-button"
    :class="[`my-button--${variant}`, `my-button--${size}`, { 'my-button--block': block }]"
    :disabled="disabled || loading"
    :aria-busy="loading"
    @click="handleClick"
  >
    <template v-if="loading">      
      <span class="my-button__spinner" aria-hidden="true"></span>
      <span>{{ loadingText }}</span>
    </template>
    <template v-else>
      <slot name="leading"></slot>
      <span><slot></slot></span>
      <slot name="trailing"></slot>
    </template>
  </button>
</template>

<style scoped>
.my-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-sizing: border-box;
  border: 1px solid transparent;
  border-radius: var(--zipda-radius-medium);
  font: inherit;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease;
}

.my-button:focus-visible {
  outline: none;
  box-shadow: var(--zipda-focus-ring);
}

.my-button:disabled {
  color: var(--zipda-color-text-muted);
  background: var(--zipda-color-disabled);
  border-color: var(--zipda-color-disabled);
  cursor: not-allowed;
}

.my-button--small {
  min-height: 36px;
  padding: 0 14px;
  font-size: 13px;
}

.my-button--medium {
  min-height: 44px;
  padding: 0 18px;
  font-size: 15px;
}

.my-button--large {
  min-height: 48px;
  padding: 0 20px;
  font-size: 16px;
}

.my-button--block {
  width: 100%;
}

.my-button--primary {
  color: var(--zipda-color-white);
  background: var(--zipda-color-primary);
}

.my-button--primary:hover:not(:disabled) {
  background: var(--zipda-color-primary-hover);
}

.my-button--primary:active:not(:disabled) {
  background: var(--zipda-color-primary-active);
}

.my-button--secondary {
  color: var(--zipda-color-primary-active);
  background: var(--zipda-color-primary-light);
}

.my-button--outline {
  color: var(--zipda-color-primary);
  background: var(--zipda-color-white);
  border-color: var(--zipda-color-primary);
}

.my-button--subtle {
  color: var(--zipda-color-subtle-text);
  background: var(--zipda-color-subtle-background);
}

.my-button--subtle:hover:not(:disabled) {
  background: var(--zipda-color-subtle-hover);
}

.my-button--subtle:active:not(:disabled) {
  color: var(--zipda-color-white);
  background: var(--zipda-color-subtle-text);
}

.my-button--danger {
  color: var(--zipda-color-white);
  background: var(--zipda-color-danger);
}

.my-button--text {
  min-height: auto;
  padding: 4px;
  color: var(--zipda-color-text-muted);
  background: transparent;
}

.my-button--kakao {
  color: var(--zipda-color-kakao-text);
  background: var(--zipda-color-kakao);
}

.my-button__spinner {
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 700ms linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .my-button,
  .my-button__spinner {
    transition: none;
    animation: none;
  }
}
</style>
