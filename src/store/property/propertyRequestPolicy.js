// 임호탁 파트 (매물 API 경로·TSID·cursor·If-Match·멱등성 요청 정책)
export const normalizePropertyId = (value) => {
  if (value == null) return null;
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new TypeError("TSID는 숫자로 변환하지 않은 문자열이어야 합니다.");
  }
  return value;
};

export const createIfMatch = (version) => `"${version}"`;

export const createVersionedMutation = (version, payload = {}) => ({
  body: { ...payload, version },
  headers: { "If-Match": createIfMatch(version) },
});

const propertyPath = (propertyId, suffix = "") =>
  `/api/property/properties/${encodeURIComponent(normalizePropertyId(propertyId))}${suffix}`;

export const PROPERTY_API_PATHS = {
  myList: "/api/property/me",
  create: "/api/property/properties",
  update: (propertyId) => propertyPath(propertyId),
  editDetail: (propertyId) => propertyPath(propertyId, "/edit"),
  transactionStatus: (propertyId) => propertyPath(propertyId, "/transaction-status"),
  verification: (propertyId, mode) => {
    const suffix = {
      owner: "/verifications/owner",
      tenant: "/verifications/tenant",
      reverification: "/reverification",
    }[mode];
    if (!suffix) throw new Error(`Unsupported verification mode: ${mode}`);
    return propertyPath(propertyId, suffix);
  },
};

export const createMyPropertyListParams = ({ cursor, size = 20 }) => ({
  ...(cursor ? { cursor } : {}),
  size,
});

export const mergeRegistrationIntegration = (current, patch = {}) => {
  const merged = { ...(current ?? {}), ...patch };
  if (Array.isArray(merged.fileIds)) merged.fileIds = [...merged.fileIds];
  if (Array.isArray(merged.options)) merged.options = [...merged.options];
  return merged;
};

export const createRegistrationStep4Patch = (fileIds, options) => ({
  fileIds: [...fileIds],
  options: [...options],
});

export const isRegistrationBackDisabled = (step, imageUploadBusy) =>
  step === 4 && imageUploadBusy;

// 임호탁 파트 (팀원 담당 3·4단계 완료값을 매물 등록 API 계약으로 조합)
const numberOrNull = (value) => value === "" || value == null ? null : Number(value);

export const createPropertyCreateRequest = (form, integration) => ({
  regionId: normalizePropertyId(integration.regionId),
  apartmentComplexId: normalizePropertyId(integration.apartmentComplexId),
  publisherType: form.publisherType,
  propertyType: form.propertyType,
  transactionType: form.transactionType,
  salePrice: form.transactionType === "SALE" ? numberOrNull(form.salePrice) : null,
  deposit: ["JEONSE", "MONTHLY_RENT"].includes(form.transactionType)
    ? numberOrNull(form.deposit)
    : null,
  monthlyRent: form.transactionType === "MONTHLY_RENT" ? numberOrNull(form.monthlyRent) : null,
  maintenanceFee: numberOrNull(form.maintenanceFee),
  supplyArea: numberOrNull(form.supplyArea),
  exclusiveArea: numberOrNull(form.exclusiveArea),
  roomCount: numberOrNull(form.roomCount),
  bathroomCount: numberOrNull(form.bathroomCount),
  floor: numberOrNull(form.floor),
  totalFloor: numberOrNull(form.totalFloor),
  floorCondition: form.floorCondition.trim() || null,
  direction: form.direction.trim() || null,
  approvalDate: form.approvalDate || null,
  buildingUse: form.buildingUse.trim() || null,
  isParkingAvailable: form.isParkingAvailable,
  hasElevator: form.hasElevator,
  isPetAllowed: form.isPetAllowed,
  title: form.title.trim(),
  description: form.description.trim(),
  fileIds: integration.fileIds.map(normalizePropertyId),
  address: { ...integration.address },
  options: integration.options.map((option) => ({ ...option })),
});

export const createRequestFingerprint = async (request) => {
  const source = new TextEncoder().encode(JSON.stringify(request));
  const digest = await crypto.subtle.digest("SHA-256", source);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
};

export const resolveIdempotencyKey = async ({ request, pending, createKey }) => {
  const fingerprint = await createRequestFingerprint(request);
  if (pending?.fingerprint === fingerprint && pending?.key) {
    return { fingerprint, key: pending.key, reused: true };
  }
  return { fingerprint, key: createKey(), reused: false };
};
