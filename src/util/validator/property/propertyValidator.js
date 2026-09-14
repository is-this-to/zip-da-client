// 임호탁 파트 (매물 핵심 입력과 팀원 연동 결과 검증)
import {
  isBlank,
  isNonNegativeInteger,
  isOptionalInteger,
  isPositiveDecimal,
  isValidTsid,
  optionalPositiveDecimal,
} from "../rule/propertyRule.js";
import { VERIFICATION_EVIDENCE_TYPES } from "../../../constant/property/propertyStatus.js";

const integerFields = [
  "salePrice",
  "deposit",
  "monthlyRent",
  "maintenanceFee",
  "roomCount",
  "bathroomCount",
];

export const validatePropertyCore = (form) => {
  const errors = {};

  if (isBlank(form.publisherType)) errors.publisherType = "등록 주체를 선택해 주세요.";
  if (isBlank(form.propertyType)) errors.propertyType = "매물 유형을 선택해 주세요.";
  if (isBlank(form.transactionType)) errors.transactionType = "거래 유형을 선택해 주세요.";
  if (isBlank(form.title)) errors.title = "제목을 입력해 주세요.";
  if (String(form.title ?? "").length > 200) errors.title = "제목은 200자 이하여야 합니다.";
  if (isBlank(form.description)) errors.description = "설명을 입력해 주세요.";
  if (!isPositiveDecimal(form.exclusiveArea)) errors.exclusiveArea = "전용면적을 0보다 큰 값으로 입력해 주세요.";
  if (!optionalPositiveDecimal(form.supplyArea)) errors.supplyArea = "공급면적은 소수점 둘째 자리까지 입력해 주세요.";
  if (!isBlank(form.totalFloor) && (!isNonNegativeInteger(form.totalFloor) || Number(form.totalFloor) < 1)) {
    errors.totalFloor = "전체 층수는 1 이상의 정수로 입력해 주세요.";
  }
  if (!isOptionalInteger(form.floor)) errors.floor = "해당 층은 정수로 입력해 주세요.";

  integerFields.forEach((field) => {
    if (!isNonNegativeInteger(form[field])) {
      errors[field] = "0 이상의 정수로 입력해 주세요.";
    }
  });

  if (form.transactionType === "SALE" && isBlank(form.salePrice)) {
    errors.salePrice = "매매가를 입력해 주세요.";
  }
  if (form.transactionType === "JEONSE" && isBlank(form.deposit)) {
    errors.deposit = "전세 보증금을 입력해 주세요.";
  }
  if (form.transactionType === "MONTHLY_RENT") {
    if (isBlank(form.deposit)) errors.deposit = "월세 보증금을 입력해 주세요.";
    if (isBlank(form.monthlyRent)) errors.monthlyRent = "월세를 입력해 주세요.";
  }

  return errors;
};

const isValidCoordinate = (value, min, max) =>
  value !== "" && value != null && Number.isFinite(Number(value))
  && Number(value) >= min && Number(value) <= max;

const isValidPropertyAddress = (address) => Boolean(
  address
  && (!isBlank(address.roadAddress) || !isBlank(address.jibunAddress))
  && /^\d{10}$/.test(String(address.legalDongCode ?? ""))
  && isValidCoordinate(address.longitude, -180, 180)
  && isValidCoordinate(address.latitude, -90, 90),
);

export const hasPropertyAddressIntegrationData = (draft) => Boolean(
  draft
  && isValidTsid(draft.regionId)
  && (draft.apartmentComplexId == null || isValidTsid(draft.apartmentComplexId))
  && isValidPropertyAddress(draft.address),
);

export const hasPropertyIntegrationData = (draft) => Boolean(
  hasPropertyAddressIntegrationData(draft)
  && Array.isArray(draft.fileIds)
  && draft.fileIds.length >= 1
  && draft.fileIds.length <= 30
  && draft.fileIds.every(isValidTsid)
  && Array.isArray(draft.options)
  && draft.options.every((option) => option && !isBlank(option.optionCode)),
);

export const hasVerificationEvidenceData = (evidence) =>
  Array.isArray(evidence)
  && evidence.length > 0
  && evidence.every((item) =>
    item
    && isValidTsid(item.propertyFileId)
    && VERIFICATION_EVIDENCE_TYPES.includes(item.evidenceType)
    && Number.isInteger(item.sortOrder)
    && item.sortOrder >= 0,
  );
