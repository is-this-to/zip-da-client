const registrationOptions = (items) => (Array.isArray(items) ? items : [])
  .filter((item) => item?.registrationEnabled === true)
  .sort((left, right) => left.displayOrder - right.displayOrder);

export const selectedOptionCodesFromOptions = (options) => new Set(
  (Array.isArray(options) ? options : [])
    .filter((option) => option?.optionValue === "true")
    .map((option) => option.optionCode),
);

export const buildRegistrationOptions = (items, selectedOptionCodes = new Set()) => {
  const selected = selectedOptionCodes instanceof Set
    ? selectedOptionCodes
    : new Set(selectedOptionCodes);
  return registrationOptions(items).map((item) => ({
    optionCode: item.optionCode,
    optionValue: selected.has(item.optionCode) ? "true" : "false",
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
    items: groupedItems,
  }));
};
