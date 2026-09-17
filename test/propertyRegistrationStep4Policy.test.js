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
import * as propertyFileOrdering from "../src/api/propertyFilePolicy.js";
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

test("매물등록 허용 코드만 정렬하고 모든 값을 문자열 true 또는 false로 만든다", () => {
  const serverOptions = [
    { optionCode: "PARKING", optionName: "주차", optionCategory: "BUILDING", registrationEnabled: true, required: false, displayOrder: 20 },
    { optionCode: "HIDDEN", optionName: "숨김", optionCategory: "ETC", registrationEnabled: false, required: false, displayOrder: 1 },
    { optionCode: "INTERNET", optionName: "인터넷", optionCategory: "LIVING", registrationEnabled: true, required: false, displayOrder: 10 },
    { optionCode: "BALCONY", optionName: "베란다", optionCategory: "SPACE", registrationEnabled: true, required: false, displayOrder: 4 },
    { optionCode: "AIR_CONDITIONER", optionName: "에어컨", optionCategory: "APPLIANCE", registrationEnabled: true, required: false, displayOrder: 2 },
    { optionCode: "REFRIGERATOR", optionName: "냉장고", optionCategory: "APPLIANCE", registrationEnabled: true, required: false, displayOrder: 3 },
  ];

  const options = buildRegistrationOptions(serverOptions, new Set(["AIR_CONDITIONER"]));

  assert.deepEqual(options, [
    { optionCode: "AIR_CONDITIONER", optionValue: "true" },
    { optionCode: "REFRIGERATOR", optionValue: "false" },
    { optionCode: "BALCONY", optionValue: "false" },
    { optionCode: "INTERNET", optionValue: "false" },
  ]);
  assert.equal(options.every((option) => typeof option.optionValue === "string"), true);
});

test("등록 옵션 화면은 정해진 카테고리 순서와 한글 표시명으로 묶는다", () => {
  const groups = groupRegistrationOptions([
    { optionCode: "BALCONY", optionName: "베란다", optionCategory: "STRUCTURE", registrationEnabled: true, displayOrder: 1 },
    { optionCode: "INTERNET", optionName: "인터넷", optionCategory: "LIVING", registrationEnabled: true, displayOrder: 2 },
    { optionCode: "LOAN_AVAILABLE", optionName: "대출 가능", optionCategory: "ETC", registrationEnabled: true, displayOrder: 3 },
    { optionCode: "ENTRANCE_SECURITY", optionName: "현관보안", optionCategory: "SECURITY", registrationEnabled: true, displayOrder: 4 },
    { optionCode: "BUILT_IN_WARDROBE", optionName: "붙박이장", optionCategory: "FURNITURE", registrationEnabled: true, displayOrder: 5 },
    { optionCode: "AIR_CONDITIONER", optionName: "에어컨", optionCategory: "APPLIANCE", registrationEnabled: true, displayOrder: 6 },
  ]);

  assert.deepEqual(groups.map((group) => ({
    category: group.category,
    categoryLabel: group.categoryLabel,
    names: group.items.map((item) => item.optionName),
  })), [
    { category: "STRUCTURE", categoryLabel: "구조", names: ["베란다"] },
    { category: "APPLIANCE", categoryLabel: "가전", names: ["에어컨"] },
    { category: "FURNITURE", categoryLabel: "가구", names: ["붙박이장"] },
    { category: "LIVING", categoryLabel: "생활", names: ["인터넷"] },
    { category: "SECURITY", categoryLabel: "보안", names: ["현관보안"] },
    { category: "ETC", categoryLabel: "기타", names: ["대출 가능"] },
  ]);
});

test("required 옵션은 기존 선택 여부와 관계없이 항상 문자열 true다", () => {
  const options = buildRegistrationOptions([
    { optionCode: "INTERNET", registrationEnabled: true, required: true, displayOrder: 1 },
    { optionCode: "BIDET", registrationEnabled: true, required: false, displayOrder: 2 },
  ], new Set());

  assert.deepEqual(options, [
    { optionCode: "INTERNET", optionValue: "true" },
    { optionCode: "BIDET", optionValue: "false" },
  ]);
});

test("기존 저장값에 금지 코드가 섞여 있어도 최종 등록 옵션에서 제거한다", () => {
  const selected = selectedOptionCodesFromOptions([
    { optionCode: "AIR_CONDITIONER", optionValue: "true" },
    { optionCode: "PARKING", optionValue: "true" },
    { optionCode: "INTERNET", optionValue: "true" },
    { optionCode: "BIDET", optionValue: "true" },
    { optionCode: "VERANDA", optionValue: "true" },
  ]);
  const options = buildRegistrationOptions([
    { optionCode: "AIR_CONDITIONER", registrationEnabled: true, required: false, displayOrder: 1 },
    { optionCode: "PARKING", registrationEnabled: true, required: false, displayOrder: 2 },
    { optionCode: "INTERNET", registrationEnabled: true, required: false, displayOrder: 3 },
    { optionCode: "BIDET", registrationEnabled: true, required: false, displayOrder: 4 },
    { optionCode: "VERANDA", registrationEnabled: true, required: false, displayOrder: 5 },
  ], selected);

  assert.deepEqual(options, [
    { optionCode: "AIR_CONDITIONER", optionValue: "true" },
    { optionCode: "INTERNET", optionValue: "true" },
    { optionCode: "BIDET", optionValue: "true" },
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

test("두 번째 사진을 앞으로 이동하면 화면과 fileIds 순서 모두 대표사진부터 갱신된다", () => {
  const files = [
    { fileId: "884685586571263711", name: "첫 번째" },
    { fileId: "884685586571263712", name: "두 번째" },
    { fileId: "884685586571263713", name: "세 번째" },
  ];

  const reordered = propertyFileOrdering.reorderPropertyFiles(files, 1, -1);

  assert.deepEqual(reordered.map((file) => file.name), ["두 번째", "첫 번째", "세 번째"]);
  assert.deepEqual(reordered.map((file) => file.fileId), [
    "884685586571263712",
    "884685586571263711",
    "884685586571263713",
  ]);
  assert.deepEqual(files.map((file) => file.name), ["첫 번째", "두 번째", "세 번째"]);
});

test("사진 이동 버튼은 첫 사진의 이전과 마지막 사진의 다음만 비활성화한다", () => {
  assert.deepEqual(propertyFileOrdering.getPropertyFileMoveState(0, 3), {
    canMoveBackward: false,
    canMoveForward: true,
  });
  assert.deepEqual(propertyFileOrdering.getPropertyFileMoveState(1, 3), {
    canMoveBackward: true,
    canMoveForward: true,
  });
  assert.deepEqual(propertyFileOrdering.getPropertyFileMoveState(2, 3), {
    canMoveBackward: true,
    canMoveForward: false,
  });
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
    { optionCode: "AIR_CONDITIONER", optionValue: "true" },
    { optionCode: "PARKING", optionValue: "false" },
  ]);

  assert.deepEqual([...selected], ["AIR_CONDITIONER"]);
});

test("preview 생성 실패는 complete된 파일 결과를 실패시키지 않는다", () => {
  const previewUrl = createFilePreviewUrl(new Blob(["image"]), () => {
    throw new Error("preview unavailable");
  });

  assert.equal(previewUrl, "");
});

test("최종 매물등록 옵션은 허용된 15개 코드를 포함한다", () => {
  const finalRegistrationOptionCodes = [
    "AIR_CONDITIONER",
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
    "LOAN_AVAILABLE",
  ];
  const serverOptionCodes = [
    ...finalRegistrationOptionCodes,
    "PARKING_AVAILABLE",
    "ELEVATOR",
    "PET_ALLOWED",
    "INDUCTION",
    "TV",
    "BED",
  ];

  const options = buildRegistrationOptions(
    serverOptionCodes.map((optionCode, index) => ({
      optionCode,
      optionName: optionCode,
      optionCategory: "LIVING",
      registrationEnabled: true,
      required: false,
      displayOrder: index + 1,
    })),
    new Set(["INTERNET", "BIDET", "LOAN_AVAILABLE"]),
  );

  assert.deepEqual(
    options.map((option) => option.optionCode),
    finalRegistrationOptionCodes,
  );
  assert.deepEqual(
    options
      .filter((option) =>
        ["INTERNET", "BIDET", "LOAN_AVAILABLE"].includes(option.optionCode),
      )
      .map((option) => [option.optionCode, option.optionValue]),
    [
      ["INTERNET", "true"],
      ["BIDET", "true"],
      ["LOAN_AVAILABLE", "true"],
    ],
  );
  assert.equal(
    options.some((option) =>
      ["PARKING_AVAILABLE", "ELEVATOR", "PET_ALLOWED", "INDUCTION", "TV", "BED"].includes(option.optionCode),
    ),
    false,
  );
});
