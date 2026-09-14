const REGISTRATION_OPTION_CODES = new Set([
  "AIR_CONDITIONER",
  "LOAN_AVAILABLE",
  "REFRIGERATOR",
  "WASHING_MACHINE",
  "GAS_RANGE",
  "MICROWAVE",
  "BUILT_IN_WARDROBE",
  "SHOE_CABINET",
  "BALCONY",
  "ENTRANCE_SECURITY",
  "INTERNET",
  "BIDET",
]);

const REGISTRATION_OPTION_CATEGORIES = [
  ["STRUCTURE", "구조"],
  ["APPLIANCE", "가전"],
  ["FURNITURE", "가구"],
  ["LIVING", "생활"],
  ["SECURITY", "보안"],
  ["ETC", "기타"],
];
const categoryLabels = new Map(REGISTRATION_OPTION_CATEGORIES);
const categoryOrders = new Map(
  REGISTRATION_OPTION_CATEGORIES.map(([category], index) => [category, index]),
);

const registrationOptions = (items) => (Array.isArray(items) ? items : [])
  .filter((item) =>
    item?.registrationEnabled === true
    && REGISTRATION_OPTION_CODES.has(item.optionCode))
  .sort((left, right) => left.displayOrder - right.displayOrder);

export const selectedOptionCodesFromOptions = (options) => new Set(
  (Array.isArray(options) ? options : [])
    .filter((option) =>
      option?.optionValue === "true"
      && REGISTRATION_OPTION_CODES.has(option.optionCode))
    .map((option) => option.optionCode),
);

export const sanitizeRegistrationOptions = (options) =>
  (Array.isArray(options) ? options : [])
    .filter((option) => REGISTRATION_OPTION_CODES.has(option?.optionCode))
    .map((option) => ({
      optionCode: option.optionCode,
      optionValue: option.optionValue === true || option.optionValue === "true"
        ? "true"
        : "false",
    }));

export const buildRegistrationOptions = (items, selectedOptionCodes = new Set()) => {
  const selected = selectedOptionCodes instanceof Set
    ? selectedOptionCodes
    : new Set(selectedOptionCodes);
  return registrationOptions(items).map((item) => ({
    optionCode: item.optionCode,
    optionValue: item.required === true || selected.has(item.optionCode) ? "true" : "false",
  }));
};

export const groupRegistrationOptions = (items) => {
  const groups = new Map();
  registrationOptions(items).forEach((item) => {
    const category = item.optionCategory;
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(item);
  });
  return Array.from(groups, ([category, groupedItems]) => ({
    category,
    categoryLabel: categoryLabels.get(category) ?? category,
    items: groupedItems,
  })).sort((left, right) =>
    (categoryOrders.get(left.category) ?? Number.MAX_SAFE_INTEGER)
    - (categoryOrders.get(right.category) ?? Number.MAX_SAFE_INTEGER));
};
