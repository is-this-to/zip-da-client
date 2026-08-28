<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

const props = defineProps({
  // ZIPDA 내부 이동 경로. 값이 있으면 RouterLink로 렌더링한다.
  to: { type: [String, Object], default: null },
  // 전화(tel:), 이메일(mailto:), 외부 URL. to가 없을 때 HTML <a>에 사용한다.
  href: { type: String, default: '' },
  target: { type: String, default: '' },
  rel: { type: String, default: '' },
  variant: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'secondary', 'outline', 'subtle', 'text'].includes(value),
  },
  size: {
    type: String,
    default: 'medium',
    validator: (value) => ['small', 'medium', 'large'].includes(value),
  },
  block: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})

const safeRel = computed(() => {
  if (props.rel) return props.rel
  return props.target === '_blank' ? 'noopener noreferrer' : undefined
})

const classNames = computed(() => [
  'action-link',
  `action-link--${props.variant}`,
  `action-link--${props.size}`,
  { 'action-link--block': props.block, 'action-link--disabled': props.disabled },
])

const handleInternalClick = (event, navigate) => {
  if (props.disabled) {
    event.preventDefault()
    return
  }
  navigate(event)
}

const handleExternalClick = (event) => {
  if (props.disabled) event.preventDefault()
}
</script>

<template>
  <RouterLink v-if="to" :to="to" custom v-slot="{ href: resolvedHref, navigate }">
    <a
      :href="resolvedHref"
      :class="classNames"
      :aria-disabled="disabled || undefined"
      @click="handleInternalClick($event, navigate)"
    >
      <slot name="leading"></slot>
      <span><slot></slot></span>
      <slot name="trailing"></slot>
    </a>
  </RouterLink>

  <a
    v-else
    :href="href"
    :target="target || undefined"
    :rel="safeRel"
    :class="classNames"
    :aria-disabled="disabled || undefined"
    @click="handleExternalClick"
  >
    <slot name="leading"></slot>
    <span><slot></slot></span>
    <slot name="trailing"></slot>
  </a>
</template>

<style scoped>
.action-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid transparent;
  border-radius: var(--zipda-radius-medium);
  font-weight: 700;
  line-height: 1;
  text-decoration: none;
  transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease;
}

.action-link:focus-visible {
  outline: none;
  box-shadow: var(--zipda-focus-ring);
}

.action-link--small {
  min-height: 36px;
  padding: 0 14px;
  font-size: 13px;
}

.action-link--medium {
  min-height: 44px;
  padding: 0 18px;
  font-size: 15px;
}

.action-link--large {
  min-height: 48px;
  padding: 0 20px;
  font-size: 16px;
}

.action-link--block {
  width: 100%;
}

.action-link--primary {
  color: var(--zipda-color-white);
  background: var(--zipda-color-primary);
}

.action-link--secondary {
  color: var(--zipda-color-primary-active);
  background: var(--zipda-color-primary-light);
}

.action-link--outline {
  color: var(--zipda-color-primary);
  background: var(--zipda-color-white);
  border-color: var(--zipda-color-primary);
}

.action-link--subtle {
  color: var(--zipda-color-subtle-text);
  background: var(--zipda-color-subtle-background);
}

.action-link--subtle:hover:not(.action-link--disabled) {
  background: var(--zipda-color-subtle-hover);
}

.action-link--text {
  min-height: auto;
  padding: 4px;
  color: var(--zipda-color-text-muted);
  background: transparent;
}

.action-link--disabled {
  color: var(--zipda-color-text-muted);
  background: var(--zipda-color-disabled);
  border-color: var(--zipda-color-disabled);
  pointer-events: none;
  cursor: not-allowed;
}

@media (prefers-reduced-motion: reduce) {
  .action-link {
    transition: none;
  }
}
</style>
