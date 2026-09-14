// 임호탁 파트 (매물 유형·상태·검증 증빙 상수와 화면 라벨)
export const PROPERTY_TYPES = ["APARTMENT", "OFFICETEL", "VILLA", "ROOM"];

export const PUBLISHER_TYPES = [
  "DIRECT_OWNER",
  "DIRECT_TENANT",
  "AGENT_BROKERAGE",
];

export const TRANSACTION_TYPES = ["SALE", "JEONSE", "MONTHLY_RENT"];

export const TRANSACTION_STATUSES = ["AVAILABLE", "RESERVED", "COMPLETED"];

export const TRANSACTION_STATUS_TRANSITIONS = {
  AVAILABLE: ["RESERVED"],
  RESERVED: ["AVAILABLE", "COMPLETED"],
  COMPLETED: [],
};

export const VERIFICATION_EVIDENCE_TYPES = [
  "REGISTRY_DOCUMENT",
  "OWNERSHIP_CONTRACT",
  "BROKERAGE_REGISTRATION",
  "OTHER",
];

export const PROPERTY_LABELS = {
  propertyType: {
    APARTMENT: "아파트",
    OFFICETEL: "오피스텔",
    VILLA: "빌라",
    ROOM: "원룸·투룸+",
  },
  publisherType: {
    DIRECT_OWNER: "집주인 직접",
    DIRECT_TENANT: "세입자 직접",
    AGENT_BROKERAGE: "중개사",
  },
  transactionType: {
    SALE: "매매",
    JEONSE: "전세",
    MONTHLY_RENT: "월세",
  },
  publicationStatus: {
    IN_REVIEW: "공개 검수 중",
    PUBLISHED: "공개 중",
    HIDDEN: "숨김",
    REJECTED: "공개 거절",
  },
  transactionStatus: {
    AVAILABLE: "거래 가능",
    RESERVED: "예약·협의 중",
    COMPLETED: "거래 완료",
  },
  verificationStatus: {
    UNVERIFIED: "미인증",
    IN_REVIEW: "인증 검토 중",
    OWNER_VERIFIED: "소유자 인증",
    TENANT_VERIFIED: "임차인 인증",
    AGENT_VERIFIED: "중개사 인증",
    REJECTED: "인증 반려",
    EXPIRED: "인증 만료",
  },
  evidenceType: {
    REGISTRY_DOCUMENT: "등기 관련 서류",
    OWNERSHIP_CONTRACT: "소유·임대차 계약 서류",
    BROKERAGE_REGISTRATION: "중개업 등록 서류",
    OTHER: "기타 증빙",
  },
};

export const labelPropertyValue = (group, value) =>
  PROPERTY_LABELS[group]?.[value] ?? value ?? "-";

export const resolvePropertyVerificationMode = (property) => {
  if (!property || property.verificationStatus === "IN_REVIEW") return null;
  if (["OWNER_VERIFIED", "TENANT_VERIFIED", "AGENT_VERIFIED"].includes(property.verificationStatus)) {
    return "reverification";
  }
  if (property.publisherType === "DIRECT_OWNER") return "owner";
  if (property.publisherType === "DIRECT_TENANT") return "tenant";
  return null;
};
