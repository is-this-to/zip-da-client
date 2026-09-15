// 임호탁 파트 (매물 입력값과 문자열 TSID 공통 검증 규칙)
export const isBlank = (value) => String(value ?? "").trim().length === 0;

export const isNonNegativeInteger = (value) => {
  if (isBlank(value)) return true;
  return /^\d+$/.test(String(value));
};

export const isOptionalInteger = (value) =>
  isBlank(value) || /^-?\d+$/.test(String(value));

export const isPositiveDecimal = (value) => {
  if (isBlank(value)) return false;
  return /^\d+(\.\d{1,2})?$/.test(String(value)) && Number(value) > 0;
};

export const optionalPositiveDecimal = (value) =>
  isBlank(value) || isPositiveDecimal(value);

export const isValidTsid = (value) =>
  typeof value === "string" && /^\d+$/.test(value);
