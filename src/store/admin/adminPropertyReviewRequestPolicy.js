import {
  createVersionedMutation,
  normalizePropertyId,
} from "../property/propertyRequestPolicy.js";

const adminVerificationPath = (verificationId = null) =>
  verificationId == null
    ? "/api/admin/property-verifications"
    : `/api/admin/property-verifications/${encodeURIComponent(
      normalizePropertyId(verificationId),
    )}`;

const adminPublicationPath = (propertyId = null) =>
  propertyId == null
    ? "/api/admin/property-publication-reviews"
    : `/api/admin/property-publication-reviews/${encodeURIComponent(
      normalizePropertyId(propertyId),
    )}`;

const propertyPath = (propertyId, suffix = "") =>
  `/api/property/properties/${encodeURIComponent(
    normalizePropertyId(propertyId),
  )}${suffix}`;

export const ADMIN_PROPERTY_REVIEW_API_PATHS = {
  verificationList: adminVerificationPath(),

  verificationDetail: (verificationId) =>
    adminVerificationPath(verificationId),

  publicationList: adminPublicationPath(),

  publicationDetail: (propertyId) =>
    adminPublicationPath(propertyId),

  verificationReview: (propertyId, verificationId) =>
    propertyPath(
      propertyId,
      `/verifications/${encodeURIComponent(
        normalizePropertyId(verificationId),
      )}`,
    ),

  publicationStatus: (propertyId) =>
    propertyPath(propertyId, "/publication-status"),
};

export const createAdminVerificationListParams = ({
                                                    status = "IN_REVIEW",
                                                    verificationType = null,
                                                    cursor = null,
                                                    size = 20,
                                                  } = {}) => ({
  status,
  ...(verificationType ? { verificationType } : {}),
  ...(cursor ? { cursor } : {}),
  size,
});

export const createAdminPublicationListParams = ({
                                                   status = "IN_REVIEW",
                                                   verificationStatus = null,
                                                   publisherType = null,
                                                   propertyType = null,
                                                   cursor = null,
                                                   size = 20,
                                                 } = {}) => ({
  status,
  ...(verificationStatus ? { verificationStatus } : {}),
  ...(publisherType ? { publisherType } : {}),
  ...(propertyType ? { propertyType } : {}),
  ...(cursor ? { cursor } : {}),
  size,
});

export const createAuditReasonHeaders = (auditReason) => {
  const reason = String(auditReason ?? "").trim();

  if (!reason) {
    throw new TypeError("상세 조회 사유를 입력해 주세요.");
  }

  if (reason.length > 200) {
    throw new TypeError(
      "상세 조회 사유는 200자 이하여야 합니다.",
    );
  }

  return {
    "X-Audit-Reason": reason,
  };
};

export const createVerificationReviewMutation = ({
                                                   propertyVersion,
                                                   decision,
                                                   reason = "",
                                                 }) => {
  const normalizedDecision = String(decision ?? "")
    .trim()
    .toUpperCase();

  if (!["APPROVE", "REJECT"].includes(normalizedDecision)) {
    throw new TypeError(
      "검증 처리 값은 APPROVE 또는 REJECT여야 합니다.",
    );
  }

  const normalizedReason = String(reason ?? "").trim();

  if (
    normalizedDecision === "REJECT" &&
    !normalizedReason
  ) {
    throw new TypeError(
      "검증 반려 사유를 입력해 주세요.",
    );
  }

  if (normalizedReason.length > 1000) {
    throw new TypeError(
      "검증 처리 사유는 1000자 이하여야 합니다.",
    );
  }

  return createVersionedMutation(propertyVersion, {
    decision: normalizedDecision,
    reason: normalizedReason || null,
  });
};

export const createPublicationReviewMutation = ({
                                                  propertyVersion,
                                                  targetStatus,
                                                  reason,
                                                }) => {
  const normalizedStatus = String(targetStatus ?? "")
    .trim()
    .toUpperCase();

  if (!["PUBLISHED", "REJECTED"].includes(normalizedStatus)) {
    throw new TypeError(
      "공개 검수 상태는 PUBLISHED 또는 REJECTED여야 합니다.",
    );
  }

  const normalizedReason = String(reason ?? "").trim();

  if (!normalizedReason) {
    throw new TypeError(
      "공개 검수 처리 사유를 입력해 주세요.",
    );
  }

  if (normalizedReason.length > 200) {
    throw new TypeError(
      "공개 검수 처리 사유는 200자 이하여야 합니다.",
    );
  }

  return createVersionedMutation(propertyVersion, {
    targetStatus: normalizedStatus,
    reason: normalizedReason,
  });
};
