export const PROPERTY_REPORT_API_PATH =
  "/api/property/me/property-reports";

export const PROPERTY_REPORT_REASON_LABELS = {
  FALSE_INFO: "허위 정보",
  DUPLICATE: "중복 매물",
  UNAVAILABLE: "거래 불가능",
  PRICE_MISMATCH: "가격 정보 불일치",
  OTHER: "기타",
};

export const PROPERTY_REPORT_STATUS_LABELS = {
  RECEIVED: "접수",
  TRIAGED: "분류 완료",
  IN_REVIEW: "검토 중",
  ACTIONED: "조치 완료",
  REJECTED: "반려",
  CLOSED: "종결",
};

export const createMyReportListParams = ({
  cursor = null,
  size = 20,
} = {}) => {
  const params = {
    size,
  };

  if (cursor) {
    params.cursor = cursor;
  }

  return params;
};