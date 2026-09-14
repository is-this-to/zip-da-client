import test from "node:test";
import assert from "node:assert/strict";
import {
  createRegistrationStep4Patch,
  isRegistrationBackDisabled,
  mergeRegistrationIntegration,
} from "../src/store/property/propertyRequestPolicy.js";
import {
  calculateFileChecksum,
  createFilePreviewUrl,
  normalizeUploadSessionFiles,
} from "../src/api/propertyFilePolicy.js";
import {
  buildRegistrationOptions,
  groupRegistrationOptions,
  selectedOptionCodesFromOptions,
} from "../src/api/propertyOptionPolicy.js";
import { hasPropertyAddressIntegrationData } from "../src/util/validator/property/propertyValidator.js";

const currentIntegration = {
  regionId: "884685586571263701",
  apartmentComplexId: "884685586571263704",
  address: {
    roadAddress: "테스트 도로명 주소 10",
    jibunAddress: "테스트동 100-1",
    legalDongCode: "1168010100",
    longitude: 127.01,
    latitude: 37.51,
  },
  fileIds: ["884685586571263702"],
  options: [{ optionCode: "AIR_CONDITIONER", optionValue: "false" }],
};

test("4단계 병합은 기존 주소와 Region 데이터를 보존하고 fileIds와 options만 변경한다", () => {
  const fileIds = ["884685586571263705", "884685586571263706"];
  const options = [
    { optionCode: "AIR_CONDITIONER", optionValue: "true" },
    { optionCode: "REFRIGERATOR", optionValue: "false" },
  ];

  const merged = mergeRegistrationIntegration(currentIntegration, { fileIds, options });

  assert.equal(merged.regionId, currentIntegration.regionId);
  assert.equal(merged.apartmentComplexId, currentIntegration.apartmentComplexId);
  assert.equal(merged.address, currentIntegration.address);
  assert.deepEqual(merged.fileIds, fileIds);
  assert.deepEqual(merged.options, options);
  assert.notEqual(merged.fileIds, fileIds);
  assert.notEqual(merged.options, options);
  assert.equal(typeof merged.fileIds[0], "string");
});

test("current가 null이어도 patch 필드만 안전하게 복사한다", () => {
  const fileIds = ["884685586571263707"];
  const options = [{ optionCode: "ELEVATOR", optionValue: "true" }];

  const merged = mergeRegistrationIntegration(null, { fileIds, options });

  assert.deepEqual(merged, { fileIds, options });
  assert.notEqual(merged.fileIds, fileIds);
  assert.notEqual(merged.options, options);
});

test("patch에 없는 필드는 기존 값을 유지하고 전달된 일반 필드만 변경한다", () => {
  const merged = mergeRegistrationIntegration(currentIntegration, {
    fileIds: ["884685586571263708"],
  });

  assert.deepEqual(merged.options, currentIntegration.options);
  assert.notEqual(merged.options, currentIntegration.options);
  assert.equal(merged.address, currentIntegration.address);
  assert.equal(merged.fileIds[0], "884685586571263708");
});

test("등록 가능 옵션만 displayOrder로 정렬하고 모든 값을 true 또는 false로 만든다", () => {
  const serverOptions = [
    { optionCode: "PARKING", optionName: "주차", optionCategory: "BUILDING", registrationEnabled: true, required: true, displayOrder: 20 },
    { optionCode: "HIDDEN", optionName: "숨김", optionCategory: "ETC", registrationEnabled: false, required: false, displayOrder: 1 },
    { optionCode: "ELEVATOR", optionName: "엘리베이터", optionCategory: "BUILDING", registrationEnabled: true, required: false, displayOrder: 10 },
  ];

  const options = buildRegistrationOptions(serverOptions, new Set(["ELEVATOR"]));

  assert.deepEqual(options, [
    { optionCode: "ELEVATOR", optionValue: "true" },
    { optionCode: "PARKING", optionValue: "false" },
  ]);
});

test("등록 옵션 화면은 optionCategory별로 묶고 서버 optionName을 유지한다", () => {
  const groups = groupRegistrationOptions([
    { optionCode: "ELEVATOR", optionName: "엘리베이터", optionCategory: "BUILDING", registrationEnabled: true, displayOrder: 2 },
    { optionCode: "AIR_CONDITIONER", optionName: "에어컨", optionCategory: "APPLIANCE", registrationEnabled: true, displayOrder: 1 },
    { optionCode: "PARKING", optionName: "주차", optionCategory: "BUILDING", registrationEnabled: true, displayOrder: 3 },
  ]);

  assert.deepEqual(groups.map((group) => ({
    category: group.category,
    names: group.items.map((item) => item.optionName),
  })), [
    { category: "APPLIANCE", names: ["에어컨"] },
    { category: "BUILDING", names: ["엘리베이터", "주차"] },
  ]);
});

test("업로드 완료 요청용 checksum은 SHA-256 64자리 hexadecimal 문자열이다", async () => {
  const checksum = await calculateFileChecksum(new Blob(["abc"]));

  assert.equal(
    checksum,
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});

test("업로드 세션 응답은 문자열 TSID와 요청 순서를 만족해야 한다", () => {
  const files = normalizeUploadSessionFiles([
    {
      fileId: "884685586571263709",
      uploadUrl: "https://storage.example/first",
      requiredHeaders: { "Content-Type": "image/jpeg" },
    },
  ], 1);

  assert.equal(files[0].fileId, "884685586571263709");
  assert.equal(typeof files[0].fileId, "string");
  assert.throws(
    () => normalizeUploadSessionFiles([
      { fileId: 884685586571263709, uploadUrl: "https://storage.example/first" },
    ], 1),
    /TSID 문자열/,
  );
  assert.throws(
    () => normalizeUploadSessionFiles([], 1),
    /파일 수/,
  );
});

test("Step4 뒤로가기 patch는 fileIds와 options만 복사한다", () => {
  const fileIds = ["884685586571263710"];
  const options = [{ optionCode: "PARKING", optionValue: "true" }];

  const patch = createRegistrationStep4Patch(fileIds, options);

  assert.deepEqual(patch, { fileIds, options });
  assert.deepEqual(Object.keys(patch), ["fileIds", "options"]);
  assert.notEqual(patch.fileIds, fileIds);
  assert.notEqual(patch.options, options);
});

test("주소와 Region 계약이 유효할 때만 5단계 주소 준비 상태로 판단한다", () => {
  assert.equal(hasPropertyAddressIntegrationData(currentIntegration), true);
  assert.equal(hasPropertyAddressIntegrationData({
    ...currentIntegration,
    regionId: null,
  }), false);
  assert.equal(hasPropertyAddressIntegrationData({
    ...currentIntegration,
    address: { ...currentIntegration.address, legalDongCode: "11680" },
  }), false);
});

test("4단계 이미지 업로드 중에만 공통 뒤로가기를 막는다", () => {
  assert.equal(isRegistrationBackDisabled(4, true), true);
  assert.equal(isRegistrationBackDisabled(4, false), false);
  assert.equal(isRegistrationBackDisabled(2, true), false);
});

test("옵션 재조회용 선택 상태는 기존 true 옵션에서 복원한다", () => {
  const selected = selectedOptionCodesFromOptions([
    { optionCode: "ELEVATOR", optionValue: "true" },
    { optionCode: "PARKING", optionValue: "false" },
  ]);

  assert.deepEqual([...selected], ["ELEVATOR"]);
});

test("preview 생성 실패는 complete된 파일 결과를 실패시키지 않는다", () => {
  const previewUrl = createFilePreviewUrl(new Blob(["image"]), () => {
    throw new Error("preview unavailable");
  });

  assert.equal(previewUrl, "");
});
