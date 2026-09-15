// 임호탁 파트 (매물 관리 API·동시성·멱등성·검증 정책 회귀 테스트)
import test from "node:test";
import assert from "node:assert/strict";
import {
  createIfMatch,
  createMyPropertyListParams,
  createPropertyCreateRequest,
  createVersionedMutation,
  normalizePropertyId,
  PROPERTY_API_PATHS,
  resolveIdempotencyKey,
} from "../src/store/property/propertyRequestPolicy.js";
import { normalizePropertyError } from "../src/constant/property/propertyMessage.js";
import {
  resolvePropertyVerificationMode,
  TRANSACTION_STATUS_TRANSITIONS,
} from "../src/constant/property/propertyStatus.js";
import {
  hasPropertyIntegrationData,
  hasVerificationEvidenceData,
  validatePropertyCore,
} from "../src/util/validator/property/propertyValidator.js";

// 임호탁 파트 (김민수·장수린 담당 모듈이 최종 전달할 계약 기반 fixture)
const teammateIntegrationFixture = {
  regionId: "884685586571263701",
  apartmentComplexId: "884685586571263704",
  address: {
    roadAddress: "테스트 도로명 주소 10",
    jibunAddress: "테스트동 100-1",
    legalDongCode: "1168010100",
    longitude: 127.01,
    latitude: 37.51,
  },
  fileIds: ["884685586571263702", "884685586571263703"],
  options: [
    { optionCode: "AIR_CONDITIONER", optionValue: "2" },
    { optionCode: "REFRIGERATOR", optionValue: "1" },
  ],
};

test("TSID는 JavaScript number로 변환하지 않고 문자열로 유지한다", () => {
  assert.equal(normalizePropertyId("884685586571263701"), "884685586571263701");
  assert.equal(typeof normalizePropertyId("884685586571263701"), "string");
  assert.throws(
    () => normalizePropertyId(884685586571263701),
    /문자열/,
  );
});

test("If-Match는 본문 version과 같은 따옴표 형식으로 생성한다", () => {
  assert.equal(createIfMatch(7), '"7"');
});

test("수정·상태·삭제·검증 요청은 본문 version과 동일한 If-Match를 사용한다", () => {
  const mutation = createVersionedMutation(12, {
    targetStatus: "RESERVED",
    reason: "거래 협의 중",
    version: 99,
  });
  assert.deepEqual(mutation, {
    body: {
      targetStatus: "RESERVED",
      reason: "거래 협의 중",
      version: 12,
    },
    headers: { "If-Match": '"12"' },
  });
});

test("동일 등록 요청 재시도는 기존 Idempotency-Key를 유지한다", async () => {
  const request = { title: "같은 요청", fileIds: ["9007199254740993"] };
  const first = await resolveIdempotencyKey({ request, pending: null, createKey: () => "key-1" });
  const retry = await resolveIdempotencyKey({ request, pending: first, createKey: () => "key-2" });
  assert.equal(retry.key, "key-1");
  assert.equal(retry.reused, true);
  assert.equal(first.fingerprint.includes("같은 요청"), false);
});

test("등록 요청 내용이 바뀌면 새로운 Idempotency-Key를 만든다", async () => {
  const pending = await resolveIdempotencyKey({
    request: { title: "이전" },
    pending: null,
    createKey: () => "key-1",
  });
  const changed = await resolveIdempotencyKey({
    request: { title: "변경" },
    pending,
    createKey: () => "key-2",
  });
  assert.equal(changed.key, "key-2");
  assert.equal(changed.reused, false);
});

test("409 version 충돌은 자동 덮어쓰기 대상이 아닌 충돌 상태로 분류한다", () => {
  const error = normalizePropertyError({
    response: { status: 409, data: { code: "P03", message: "VERSION_CONFLICT", traceId: "trace-1" } },
  });
  assert.equal(error.isConflict, true);
  assert.equal(error.traceId, "trace-1");
  assert.match(error.message, /최신 정보/);
});

test("일반 409 오류는 version 충돌로 오인하지 않는다", () => {
  const error = normalizePropertyError({
    response: { status: 409, data: { code: "P02", message: "INVALID_STATUS_TRANSITION" } },
  });
  assert.equal(error.isConflict, false);
  assert.match(error.message, /거래 상태/);
});

test("멱등성 키 누락과 처리 중 오류를 서로 다른 재시도 정책으로 안내한다", () => {
  const missingKey = normalizePropertyError({
    response: { status: 400, data: { code: "P20", message: "IDEMPOTENCY_KEY_REQUIRED" } },
  });
  const inProgress = normalizePropertyError({
    response: { status: 409, data: { code: "P22", message: "IDEMPOTENCY_REQUEST_IN_PROGRESS" } },
  });
  assert.match(missingKey.message, /식별 정보/);
  assert.equal(missingKey.isRetryable, false);
  assert.equal(inProgress.isConflict, false);
  assert.equal(inProgress.isRetryable, true);
});

test("인증·권한·서버 오류에 맞는 화면 동작 정보를 제공한다", () => {
  const unauthorized = normalizePropertyError({ response: { status: 401, data: {} } });
  const forbidden = normalizePropertyError({ response: { status: 403, data: {} } });
  const unavailable = normalizePropertyError({ response: { status: 503, data: {} } });
  assert.equal(unauthorized.requiresLogin, true);
  assert.equal(forbidden.isForbidden, true);
  assert.equal(unavailable.isRetryable, true);
});

test("같은 E50 코드라도 응답 message에 따라 Gateway와 주소 오류를 구분한다", () => {
  const gatewayError = normalizePropertyError({
    response: { status: 404, data: { code: "E50", message: "SCG_NOT_FOUND_ERROR" } },
  });
  const addressError = normalizePropertyError({
    response: { status: 502, data: { code: "E50", message: "KAKAO_LOCAL_API_ERROR" } },
  });
  assert.match(gatewayError.message, /API 경로/);
  assert.match(addressError.message, /주소 정보/);
});

test("서버 fieldErrors를 입력 필드별 메시지로 변환한다", () => {
  const error = normalizePropertyError({
    response: {
      status: 400,
      data: {
        code: "E21",
        message: "INVALID_REQUEST",
        data: [
          { field: "title", message: "매물 제목은 필수입니다." },
          { field: "exclusiveArea", message: "전용면적은 필수입니다." },
        ],
      },
    },
  });
  assert.deepEqual(error.fieldErrors, {
    title: "매물 제목은 필수입니다.",
    exclusiveArea: "전용면적은 필수입니다.",
  });
});

test("거래 유형별 필수 가격 조합을 검증한다", () => {
  const errors = validatePropertyCore({
    publisherType: "DIRECT_OWNER",
    propertyType: "APARTMENT",
    transactionType: "MONTHLY_RENT",
    title: "월세 매물",
    description: "설명",
    exclusiveArea: "30.5",
    supplyArea: "",
    salePrice: "",
    deposit: "",
    monthlyRent: "",
    maintenanceFee: "",
    roomCount: "",
    bathroomCount: "",
  });
  assert.equal(errors.deposit, "월세 보증금을 입력해 주세요.");
  assert.equal(errors.monthlyRent, "월세를 입력해 주세요.");
});

test("해당 층은 지하층을 포함한 정수만 허용한다", () => {
  const base = {
    publisherType: "DIRECT_OWNER",
    propertyType: "APARTMENT",
    transactionType: "SALE",
    salePrice: "100000000",
    title: "매매 매물",
    description: "설명",
    exclusiveArea: "30.5",
  };
  assert.equal(validatePropertyCore({ ...base, floor: "B1" }).floor, "해당 층은 정수로 입력해 주세요.");
  assert.equal(validatePropertyCore({ ...base, floor: "-1" }).floor, undefined);
});

test("거래 상태 선택지는 백엔드 허용 전이만 노출한다", () => {
  assert.deepEqual(TRANSACTION_STATUS_TRANSITIONS.AVAILABLE, ["RESERVED"]);
  assert.deepEqual(TRANSACTION_STATUS_TRANSITIONS.RESERVED, ["AVAILABLE", "COMPLETED"]);
  assert.deepEqual(TRANSACTION_STATUS_TRANSITIONS.COMPLETED, []);
});

test("등록 주체와 검증 상태에 맞는 검증 신청 경로만 선택한다", () => {
  assert.equal(resolvePropertyVerificationMode({
    publisherType: "DIRECT_OWNER",
    verificationStatus: "UNVERIFIED",
  }), "owner");
  assert.equal(resolvePropertyVerificationMode({
    publisherType: "DIRECT_TENANT",
    verificationStatus: "REJECTED",
  }), "tenant");
  assert.equal(resolvePropertyVerificationMode({
    publisherType: "AGENT_BROKERAGE",
    verificationStatus: "UNVERIFIED",
  }), null);
  assert.equal(resolvePropertyVerificationMode({
    publisherType: "AGENT_BROKERAGE",
    verificationStatus: "AGENT_VERIFIED",
  }), "reverification");
  assert.equal(resolvePropertyVerificationMode({
    publisherType: "DIRECT_OWNER",
    verificationStatus: "IN_REVIEW",
  }), null);
});

test("내 매물 다음 cursor는 해석하지 않고 그대로 전달한다", () => {
  const params = createMyPropertyListParams({ cursor: "opaque==/%+" });
  assert.deepEqual(params, { cursor: "opaque==/%+", size: 20 });
});

test("내 매물 목록은 Property 서비스 공통 경로를 사용한다", () => {
  assert.equal(PROPERTY_API_PATHS.myList, "/api/property/me");
});

test("등록 연동값은 문자열 TSID와 백엔드 주소·파일 계약을 모두 만족해야 한다", () => {
  const validDraft = {
    regionId: "884685586571263701",
    apartmentComplexId: null,
    address: {
      roadAddress: "테스트 도로명 주소",
      jibunAddress: "",
      legalDongCode: "1168010100",
      longitude: 127.01,
      latitude: 37.51,
    },
    fileIds: ["884685586571263702"],
    options: [],
  };
  assert.equal(hasPropertyIntegrationData(validDraft), true);
  assert.equal(hasPropertyIntegrationData({ ...validDraft, regionId: 884685586571263701 }), false);
  assert.equal(hasPropertyIntegrationData({
    ...validDraft,
    address: { ...validDraft.address, legalDongCode: "11680" },
  }), false);
  assert.equal(hasPropertyIntegrationData({ ...validDraft, fileIds: [] }), false);
});

test("팀원 완료값 fixture를 임호탁 등록 요청에 손실 없이 조합한다", () => {
  const request = createPropertyCreateRequest({
    publisherType: "DIRECT_OWNER",
    propertyType: "APARTMENT",
    transactionType: "MONTHLY_RENT",
    salePrice: "",
    deposit: "1212",
    monthlyRent: "12",
    maintenanceFee: "8",
    supplyArea: "120.5",
    exclusiveArea: "108",
    roomCount: "3",
    bathroomCount: "2",
    floor: "7",
    totalFloor: "15",
    floorCondition: " 중층 ",
    direction: " 남향 ",
    approvalDate: "2024-01-15",
    buildingUse: " 공동주택 ",
    isParkingAvailable: true,
    hasElevator: true,
    isPetAllowed: false,
    title: " 테스트 매물 ",
    description: " 테스트 설명 ",
  }, teammateIntegrationFixture);

  assert.equal(request.regionId, teammateIntegrationFixture.regionId);
  assert.equal(request.apartmentComplexId, teammateIntegrationFixture.apartmentComplexId);
  assert.deepEqual(request.fileIds, teammateIntegrationFixture.fileIds);
  assert.deepEqual(request.options, teammateIntegrationFixture.options);
  assert.deepEqual(request.address, teammateIntegrationFixture.address);
  assert.equal(typeof request.regionId, "string");
  assert.equal(typeof request.fileIds[0], "string");
  assert.equal(request.salePrice, null);
  assert.equal(request.deposit, 1212);
  assert.equal(request.monthlyRent, 12);
  assert.equal(request.exclusiveArea, 108);
  assert.equal(request.floorCondition, "중층");
  assert.equal(request.title, "테스트 매물");
});

test("팀원 fixture가 바뀌면 등록 재시도에 새 멱등성 키를 발급한다", async () => {
  const firstRequest = createPropertyCreateRequest({
    publisherType: "DIRECT_OWNER",
    propertyType: "APARTMENT",
    transactionType: "SALE",
    salePrice: "300000000",
    deposit: "",
    monthlyRent: "",
    maintenanceFee: "",
    supplyArea: "",
    exclusiveArea: "84",
    roomCount: "",
    bathroomCount: "",
    floor: "",
    totalFloor: "",
    floorCondition: "",
    direction: "",
    approvalDate: "",
    buildingUse: "",
    isParkingAvailable: false,
    hasElevator: false,
    isPetAllowed: false,
    title: "매매 매물",
    description: "설명",
  }, teammateIntegrationFixture);
  const pending = await resolveIdempotencyKey({
    request: firstRequest,
    pending: null,
    createKey: () => "fixture-key-1",
  });
  const changed = await resolveIdempotencyKey({
    request: { ...firstRequest, fileIds: ["884685586571263705"] },
    pending,
    createKey: () => "fixture-key-2",
  });

  assert.equal(changed.key, "fixture-key-2");
  assert.equal(changed.reused, false);
});

test("팀원 증빙 fixture를 검증 신청 version 및 If-Match와 함께 전달한다", () => {
  const evidence = [{
    propertyFileId: "884685586571263706",
    evidenceType: "REGISTRY_DOCUMENT",
    sortOrder: 0,
  }];
  const mutation = createVersionedMutation(4, { evidence });

  assert.deepEqual(mutation, {
    body: { evidence, version: 4 },
    headers: { "If-Match": '"4"' },
  });
  assert.equal(typeof mutation.body.evidence[0].propertyFileId, "string");
});

test("검증 증빙은 문자열 파일 TSID와 증빙 유형·정렬 계약을 만족해야 한다", () => {
  const validEvidence = [{
    propertyFileId: "884685586571263703",
    evidenceType: "REGISTRY_DOCUMENT",
    sortOrder: 0,
  }];
  assert.equal(hasVerificationEvidenceData(validEvidence), true);
  assert.equal(hasVerificationEvidenceData([
    { ...validEvidence[0], propertyFileId: 884685586571263703 },
  ]), false);
  assert.equal(hasVerificationEvidenceData([
    { ...validEvidence[0], evidenceType: "UNKNOWN" },
  ]), false);
  assert.equal(hasVerificationEvidenceData([
    { ...validEvidence[0], sortOrder: -1 },
  ]), false);
});

test("매물 API 경로는 문자열 TSID를 손실 없이 사용한다", () => {
  assert.equal(
    PROPERTY_API_PATHS.transactionStatus("884685586571263701"),
    "/api/property/properties/884685586571263701/transaction-status",
  );
});

test("검증 모드별 endpoint 계약을 지킨다", () => {
  assert.deepEqual(["owner", "tenant", "reverification"].map(
    (mode) => PROPERTY_API_PATHS.verification("884685586571263701", mode),
  ), [
    "/api/property/properties/884685586571263701/verifications/owner",
    "/api/property/properties/884685586571263701/verifications/tenant",
    "/api/property/properties/884685586571263701/reverification",
  ]);
});
