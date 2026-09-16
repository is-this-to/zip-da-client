<script setup>
import { computed, ref, watch } from "vue";
import { fetchPropertyOptionCodes } from "../../api/propertyOptionApi.js";
import {
  buildRegistrationOptions,
  groupRegistrationOptions,
  selectedOptionCodesFromOptions,
} from "../../api/propertyOptionPolicy.js";

const props = defineProps({
  propertyType: { type: String, required: true },
});
const emit = defineEmits(["ready-change"]);
const options = defineModel({ type: Array, default: () => [] });

const optionCodes = ref([]);
const selectedOptionCodes = ref(selectedOptionCodesFromOptions(options.value));
const isLoading = ref(false);
const errorMessage = ref("");
const expandedCategories = ref(new Set());
const groups = computed(() => groupRegistrationOptions(optionCodes.value));
let requestSequence = 0;

const syncOptions = () => {
  const nextOptions = buildRegistrationOptions(optionCodes.value, selectedOptionCodes.value);
  selectedOptionCodes.value = selectedOptionCodesFromOptions(nextOptions);
  options.value = nextOptions;
};

const loadOptions = async () => {
  if (!props.propertyType) return;
  const sequence = ++requestSequence;
  isLoading.value = true;
  errorMessage.value = "";
  emit("ready-change", false);
  try {
    const received = await fetchPropertyOptionCodes(props.propertyType);
    if (sequence !== requestSequence) return;
    optionCodes.value = received;
    selectedOptionCodes.value = selectedOptionCodesFromOptions(options.value);
    syncOptions();
    emit("ready-change", true);
  } catch {
    if (sequence !== requestSequence) return;
    errorMessage.value = "옵션 정보를 불러오지 못했습니다. 다시 시도해 주세요.";
  } finally {
    if (sequence === requestSequence) isLoading.value = false;
  }
};

const toggleOption = (item, checked) => {
  if (item.required) return;
  const next = new Set(selectedOptionCodes.value);
  checked ? next.add(item.optionCode) : next.delete(item.optionCode);
  selectedOptionCodes.value = next;
  syncOptions();
};

const selectedCount = (items) => items.filter((item) =>
  selectedOptionCodes.value.has(item.optionCode) || item.required).length;

const isCategoryExpanded = (category) => expandedCategories.value.has(category);

const toggleCategory = (category) => {
  const next = new Set(expandedCategories.value);
  next.has(category) ? next.delete(category) : next.add(category);
  expandedCategories.value = next;
};

const categoryPanelId = (category) => `property-option-${category.toLowerCase()}`;

watch(() => props.propertyType, () => {
  expandedCategories.value = new Set();
  loadOptions();
}, { immediate: true });
</script>

<template>
  <section class="option-selector" aria-labelledby="property-option-title">
    <div class="section-heading">
      <div>
        <h2 id="property-option-title">옵션</h2>
        <p>매물에 해당하는 옵션을 선택해 주세요.</p>
      </div>
      <span>{{ selectedOptionCodes.size }}개 선택</span>
    </div>

    <p v-if="isLoading" class="info-box" aria-live="polite">옵션을 불러오고 있습니다.</p>
    <div v-else-if="errorMessage" class="error-box" role="alert">
      <p>{{ errorMessage }}</p>
      <button type="button" class="retry-button" @click="loadOptions">다시 시도</button>
    </div>
    <p v-else-if="groups.length === 0" class="info-box">등록할 수 있는 옵션이 없습니다.</p>

    <div v-else class="option-groups">
      <section v-for="group in groups" :key="group.category" class="option-group">
        <button
          type="button"
          class="category-toggle"
          :aria-expanded="isCategoryExpanded(group.category)"
          :aria-controls="categoryPanelId(group.category)"
          @click="toggleCategory(group.category)"
        >
          <strong>{{ group.categoryLabel }}</strong>
          <span class="category-summary">
            <span>{{ selectedCount(group.items) }}개 선택</span>
            <span
              class="category-chevron"
              :class="{ 'category-chevron--expanded': isCategoryExpanded(group.category) }"
              aria-hidden="true"
            >⌄</span>
          </span>
        </button>
        <div
          v-show="isCategoryExpanded(group.category)"
          :id="categoryPanelId(group.category)"
          class="option-panel"
          role="region"
          :aria-label="`${group.categoryLabel} 옵션`"
        >
          <div class="option-grid">
            <label
              v-for="item in group.items"
              :key="item.optionCode"
              class="option-item"
              :class="{
                'option-item--selected': selectedOptionCodes.has(item.optionCode) || item.required,
                'option-item--required': item.required,
              }"
            >
              <input
                type="checkbox"
                :checked="selectedOptionCodes.has(item.optionCode) || item.required"
                :disabled="item.required"
                :aria-checked="selectedOptionCodes.has(item.optionCode) || item.required"
                @change="toggleOption(item, $event.target.checked)"
              />
              <span>{{ item.optionName }}</span>
              <small v-if="item.required">필수 포함</small>
            </label>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.option-selector,
.option-groups { display: grid; gap: 14px; }
.section-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.section-heading div { display: grid; gap: 5px; }
.section-heading h2 { font-size: 18px; }
.section-heading p { color: var(--zipda-color-text-muted); font-size: 13px; }
.section-heading > span { flex: 0 0 auto; color: var(--zipda-color-primary-active); font-size: 12px; font-weight: 700; }
.option-groups { gap: 8px; }
.option-group { overflow: hidden; background: var(--zipda-color-white); border: 1px solid var(--zipda-color-border); border-radius: var(--zipda-radius-medium); }
.category-toggle { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; min-height: 52px; padding: 13px 14px; color: var(--zipda-color-text); text-align: left; background: transparent; border: 0; font: inherit; cursor: pointer; }
.category-toggle:focus-visible { outline: none; box-shadow: inset var(--zipda-focus-ring); }
.category-summary { display: flex; align-items: center; gap: 8px; color: var(--zipda-color-text-muted); font-size: 12px; font-weight: 700; }
.category-chevron { display: inline-block; color: var(--zipda-color-text); font-size: 18px; line-height: 1; transition: transform 160ms ease; }
.category-chevron--expanded { transform: rotate(180deg); }
.option-panel { padding: 0 10px 10px; }
.option-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.option-item { display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 4px 8px; min-height: 46px; padding: 10px 12px; background: var(--zipda-color-surface); border: 1px solid var(--zipda-color-border); border-radius: var(--zipda-radius-medium); font-size: 13px; font-weight: 700; cursor: pointer; }
.option-item--selected { color: var(--zipda-color-primary-active); background: var(--zipda-color-primary-light); border-color: var(--zipda-color-primary); box-shadow: var(--zipda-focus-ring); }
.option-item--required { cursor: default; }
.option-item input { accent-color: var(--zipda-color-primary); }
.option-item input:disabled { opacity: 1; }
.option-item small { grid-column: 2; color: var(--zipda-color-text-muted); font-size: 11px; font-weight: 400; }
.error-box { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.retry-button { padding: 7px 10px; background: var(--zipda-color-white); border: 1px solid currentColor; border-radius: var(--zipda-radius-small); color: inherit; cursor: pointer; }
@media (max-width: 360px) { .option-grid { grid-template-columns: 1fr; } }
</style>
