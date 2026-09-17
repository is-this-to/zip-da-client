import test from "node:test";
import assert from "node:assert/strict";

import {
  ADMIN_PROPERTY_REVIEW_API_PATHS,
  createAdminPublicationListParams,
  createAdminVerificationListParams,
  createAuditReasonHeaders,
  createPublicationReviewMutation,
  createVerificationReviewMutation,
} from "../src/store/admin/adminPropertyReviewRequestPolicy.js";

test("관리자 검증·공개 검수 API 경로를 백엔드 계약과 동일하게 사용한다", () => {
  assert.equal(
    ADMIN_PROPERTY_REVIEW_API_PATHS.verificationList,
    "/api/admin/property-verifications",
  );

  assert.equal(
    ADMIN_PROPERTY_REVIEW_API_PATHS.verificationDetail(
      "9007199254740993",
    ),
    "/api/admin/property-verifications/9007199254740993",
  );

  assert.equal(
    ADMIN_PROPERTY_REVIEW_API_PATHS.publicationList,
    "/api/admin/property-publication-reviews",
  );

  assert.equal(
    ADMIN_PROPERTY_REVIEW_API_PATHS.publicationDetail(
      "9007199254740994",
    ),
    "/api/admin/property-publication-reviews/9007199254740994",
  );
});

test("검증 승인·반려 mutation 경로는 propertyId와 verificationId를 모두 사용한다", () => {
  assert.equal(
    ADMIN_PROPERTY_REVIEW_API_PATHS.verificationReview(
      "9007199254740993",
      "9007199254740994",
    ),
    "/api/property/properties/9007199254740993/verifications/9007199254740994",
  );
});

test("공개 검수 mutation은 기존 publication-status API를 재사용한다", () => {
  assert.equal(
    ADMIN_PROPERTY_REVIEW_API_PATHS.publicationStatus(
      "9007199254740993",
    ),
    "/api/property/properties/9007199254740993/publication-status",
  );
});

test("관리자 검증 목록 기본 조회는 IN_REVIEW와 size 20을 사용한다", () => {
  assert.deepEqual(
    createAdminVerificationListParams(),
    {
      status: "IN_REVIEW",
      size: 20,
    },
  );
});

test("관리자 검증 목록 cursor와 verificationType은 해석하지 않고 전달한다", () => {
  assert.deepEqual(
    createAdminVerificationListParams({
      verificationType: "OWNER",
      cursor: "opaque==/%+",
      size: 30,
    }),
    {
      status: "IN_REVIEW",
      verificationType: "OWNER",
      cursor: "opaque==/%+",
      size: 30,
    },
  );
});

test("공개 검수 목록은 선택한 필터만 요청 파라미터에 포함한다", () => {
  assert.deepEqual(
    createAdminPublicationListParams({
      verificationStatus: "OWNER_VERIFIED",
      publisherType: "DIRECT_OWNER",
      propertyType: "APARTMENT",
    }),
    {
      status: "IN_REVIEW",
      verificationStatus: "OWNER_VERIFIED",
      publisherType: "DIRECT_OWNER",
      propertyType: "APARTMENT",
      size: 20,
    },
  );
});

test("상세 조회 사유는 X-Audit-Reason 헤더에 trim하여 전달한다", () => {
  assert.deepEqual(
    createAuditReasonHeaders("  검증 증빙 확인  "),
    {
      "X-Audit-Reason": "검증 증빙 확인",
    },
  );
});

test("상세 조회 사유가 비어 있으면 요청을 만들지 않는다", () => {
  assert.throws(
    () => createAuditReasonHeaders("   "),
    /상세 조회 사유/,
  );
});

test("상세 조회 사유는 200자를 초과할 수 없다", () => {
  assert.throws(
    () => createAuditReasonHeaders("가".repeat(201)),
    /200자/,
  );
});

test("검증 승인에는 propertyVersion을 body version과 If-Match에 동일하게 사용한다", () => {
  const mutation = createVerificationReviewMutation({
    propertyVersion: 7,
    decision: "APPROVE",
  });

  assert.deepEqual(mutation, {
    body: {
      decision: "APPROVE",
      reason: null,
      version: 7,
    },
    headers: {
      "If-Match": "\"7\"",
    },
  });
});

test("검증 반려에는 반려 사유가 필수다", () => {
  assert.throws(
    () =>
      createVerificationReviewMutation({
        propertyVersion: 7,
        decision: "REJECT",
        reason: " ",
      }),
    /반려 사유/,
  );
});

test("검증 처리에는 verificationVersion이 아니라 propertyVersion을 사용한다", () => {
  const mutation = createVerificationReviewMutation({
    propertyVersion: 12,
    decision: "REJECT",
    reason: "증빙 불충분",
  });

  assert.equal(mutation.body.version, 12);
  assert.equal(mutation.headers["If-Match"], "\"12\"");
});

test("공개 승인·반려 mutation은 PUBLISHED 또는 REJECTED만 허용한다", () => {
  const approved = createPublicationReviewMutation({
    propertyVersion: 5,
    targetStatus: "PUBLISHED",
    reason: "공개 기준 충족",
  });

  assert.deepEqual(approved, {
    body: {
      targetStatus: "PUBLISHED",
      reason: "공개 기준 충족",
      version: 5,
    },
    headers: {
      "If-Match": "\"5\"",
    },
  });

  assert.throws(
    () =>
      createPublicationReviewMutation({
        propertyVersion: 5,
        targetStatus: "HIDDEN",
        reason: "테스트",
      }),
    /PUBLISHED 또는 REJECTED/,
  );
});

test("공개 검수 처리 사유는 필수이며 최대 200자다", () => {
  assert.throws(
    () =>
      createPublicationReviewMutation({
        propertyVersion: 5,
        targetStatus: "REJECTED",
        reason: " ",
      }),
    /처리 사유/,
  );

  assert.throws(
    () =>
      createPublicationReviewMutation({
        propertyVersion: 5,
        targetStatus: "REJECTED",
        reason: "가".repeat(201),
      }),
    /200자/,
  );
});
