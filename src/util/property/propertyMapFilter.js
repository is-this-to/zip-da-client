const PROPERTY_TYPES = ["APARTMENT", "OFFICETEL", "VILLA", "ROOM"];
const TRANSACTION_TYPES = ["SALE", "JEONSE", "MONTHLY_RENT"];
const PUBLISHER_TYPES = [
  "DIRECT_OWNER",
  "DIRECT_TENANT",
  "AGENT_BROKERAGE",
];
const SORT_TYPES = ["LATEST", "PRICE_ASC", "PRICE_DESC", "AREA_DESC"];

const NUMBER_FIELDS = [
  "minSalePrice",
  "maxSalePrice",
  "minDeposit",
  "maxDeposit",
  "minMonthlyRent",
  "maxMonthlyRent",
  "minMaintenanceFee",
  "maxMaintenanceFee",
  "minExclusiveArea",
  "maxExclusiveArea",
  "roomCountMin",
  "roomCountMax",
];

const BOOLEAN_FIELDS = [
  "isParkingAvailable",
  "hasElevator",
  "isPetAllowed",
];

const INTEGER_FIELDS = new Set([
  "minSalePrice",
  "maxSalePrice",
  "minDeposit",
  "maxDeposit",
  "minMonthlyRent",
  "maxMonthlyRent",
  "minMaintenanceFee",
  "maxMaintenanceFee",
  "roomCountMin",
  "roomCountMax",
]);

const ARRAY_LABELS = {
  propertyTypes: {
    APARTMENT: "아파트",
    OFFICETEL: "오피스텔",
    VILLA: "빌라",
    ROOM: "원룸·투룸+",
  },
  transactionTypes: {
    SALE: "매매",
    JEONSE: "전세",
    MONTHLY_RENT: "월세",
  },
  publisherTypes: {
    DIRECT_OWNER: "집주인 직접",
    DIRECT_TENANT: "세입자 직접",
    AGENT_BROKERAGE: "중개사",
  },
};

const SCALAR_LABELS = {
  minSalePrice: "매매가 최소",
  maxSalePrice: "매매가 최대",
  minDeposit: "보증금 최소",
  maxDeposit: "보증금 최대",
  minMonthlyRent: "월세 최소",
  maxMonthlyRent: "월세 최대",
  minMaintenanceFee: "관리비 최소",
  maxMaintenanceFee: "관리비 최대",
  minExclusiveArea: "면적 최소",
  maxExclusiveArea: "면적 최대",
  roomCountMin: "방 최소",
  roomCountMax: "방 최대",
  approvalDateFrom: "승인일 시작",
  approvalDateTo: "승인일 종료",
};

const BOOLEAN_LABELS = {
  isParkingAvailable: ["주차 불가", "주차 가능"],
  hasElevator: ["엘리베이터 없음", "엘리베이터 있음"],
  isPetAllowed: ["반려동물 불가", "반려동물 가능"],
};

export const createPropertyMapFilters = (source = {}) => ({
  propertyTypes: [...(source.propertyTypes ?? [])],
  transactionTypes: [...(source.transactionTypes ?? [])],
  minSalePrice: source.minSalePrice ?? null,
  maxSalePrice: source.maxSalePrice ?? null,
  minDeposit: source.minDeposit ?? null,
  maxDeposit: source.maxDeposit ?? null,
  minMonthlyRent: source.minMonthlyRent ?? null,
  maxMonthlyRent: source.maxMonthlyRent ?? null,
  minMaintenanceFee: source.minMaintenanceFee ?? null,
  maxMaintenanceFee: source.maxMaintenanceFee ?? null,
  minExclusiveArea: source.minExclusiveArea ?? null,
  maxExclusiveArea: source.maxExclusiveArea ?? null,
  roomCountMin: source.roomCountMin ?? null,
  roomCountMax: source.roomCountMax ?? null,
  publisherTypes: [...(source.publisherTypes ?? [])],
  approvalDateFrom: source.approvalDateFrom ?? "",
  approvalDateTo: source.approvalDateTo ?? "",
  isParkingAvailable: source.isParkingAvailable ?? null,
  hasElevator: source.hasElevator ?? null,
  isPetAllowed: source.isPetAllowed ?? null,
  sort: source.sort ?? "LATEST",
});

const normalizeArray = (values, allowedValues, fieldName) => {
  const normalized = [...new Set((values ?? []).filter(Boolean))];

  if (normalized.some((value) => !allowedValues.includes(value))) {
    throw new Error(`${fieldName}에 지원하지 않는 값이 포함되어 있습니다.`);
  }

  return normalized;
};

const normalizeNumber = (value, fieldName, positiveOnly = false) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const normalized = Number(value);

  if (!Number.isFinite(normalized)) {
    throw new Error(`${fieldName}은 숫자여야 합니다.`);
  }

  if (positiveOnly ? normalized <= 0 : normalized < 0) {
    throw new Error(
      positiveOnly
        ? `${fieldName}은 0보다 커야 합니다.`
        : `${fieldName}은 0 이상이어야 합니다.`,
    );
  }

  return normalized;
};

const validateRange = (min, max, fieldName) => {
  if (min !== null && max !== null && min > max) {
    throw new Error(`${fieldName} 최솟값은 최댓값보다 클 수 없습니다.`);
  }
};

export const normalizePropertyMapFilters = (source = {}) => {
  const filters = createPropertyMapFilters(source);

  filters.propertyTypes = normalizeArray(
    filters.propertyTypes,
    PROPERTY_TYPES,
    "매물 유형",
  );
  filters.transactionTypes = normalizeArray(
    filters.transactionTypes,
    TRANSACTION_TYPES,
    "거래 유형",
  );
  filters.publisherTypes = normalizeArray(
    filters.publisherTypes,
    PUBLISHER_TYPES,
    "등록 주체",
  );

  NUMBER_FIELDS.forEach((field) => {
    filters[field] = normalizeNumber(
      filters[field],
      field,
      field.includes("ExclusiveArea") || field.includes("roomCount"),
    );

    if (
      filters[field] !== null &&
      INTEGER_FIELDS.has(field) &&
      !Number.isSafeInteger(filters[field])
    ) {
      throw new Error(`${field}은 정수여야 합니다.`);
    }
  });

  BOOLEAN_FIELDS.forEach((field) => {
    const value = filters[field];

    if (value === "" || value === null || value === undefined) {
      filters[field] = null;
    } else if (value === true || value === "true") {
      filters[field] = true;
    } else if (value === false || value === "false") {
      filters[field] = false;
    } else {
      throw new Error(`${field} 값이 올바르지 않습니다.`);
    }
  });

  filters.approvalDateFrom = filters.approvalDateFrom?.trim() || "";
  filters.approvalDateTo = filters.approvalDateTo?.trim() || "";

  if (
    filters.approvalDateFrom &&
    filters.approvalDateTo &&
    filters.approvalDateFrom > filters.approvalDateTo
  ) {
    throw new Error("사용승인일 시작일은 종료일보다 늦을 수 없습니다.");
  }

  if (!SORT_TYPES.includes(filters.sort)) {
    throw new Error("지원하지 않는 정렬 기준입니다.");
  }

  validateRange(filters.minSalePrice, filters.maxSalePrice, "매매가");
  validateRange(filters.minDeposit, filters.maxDeposit, "보증금");
  validateRange(filters.minMonthlyRent, filters.maxMonthlyRent, "월세");
  validateRange(
    filters.minMaintenanceFee,
    filters.maxMaintenanceFee,
    "관리비",
  );
  validateRange(
    filters.minExclusiveArea,
    filters.maxExclusiveArea,
    "전용면적",
  );
  validateRange(filters.roomCountMin, filters.roomCountMax, "방 개수");

  return filters;
};

export const buildPropertyMapQueryParams = (viewport, sourceFilters) => {
  const filters = normalizePropertyMapFilters(sourceFilters);
  const params = new URLSearchParams();

  Object.entries(viewport).forEach(([key, value]) => {
    params.append(key, String(value));
  });

  ["propertyTypes", "transactionTypes", "publisherTypes"].forEach(
    (key) => {
      filters[key].forEach((value) => params.append(key, value));
    },
  );

  NUMBER_FIELDS.forEach((key) => {
    if (filters[key] !== null) {
      params.append(key, String(filters[key]));
    }
  });

  ["approvalDateFrom", "approvalDateTo"].forEach((key) => {
    if (filters[key]) {
      params.append(key, filters[key]);
    }
  });

  BOOLEAN_FIELDS.forEach((key) => {
    if (filters[key] !== null) {
      params.append(key, String(filters[key]));
    }
  });

  params.append("sort", filters.sort);
  return params;
};

export const getAppliedPropertyMapFilterChips = (sourceFilters) => {
  const filters = normalizePropertyMapFilters(sourceFilters);
  const chips = [];

  Object.entries(ARRAY_LABELS).forEach(([key, labels]) => {
    filters[key].forEach((value) => {
      chips.push({ key, value, label: labels[value], array: true });
    });
  });

  Object.entries(SCALAR_LABELS).forEach(([key, label]) => {
    const value = filters[key];
    if (value !== null && value !== "") {
      chips.push({ key, label: `${label} ${Number.isFinite(value) ? value.toLocaleString() : value}` });
    }
  });

  Object.entries(BOOLEAN_LABELS).forEach(([key, labels]) => {
    if (filters[key] !== null) {
      chips.push({ key, label: labels[filters[key] ? 1 : 0] });
    }
  });

  return chips;
};
