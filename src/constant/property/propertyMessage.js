// 임호탁 파트 (매물 API 오류 코드·필드 오류·traceId 표시 정책)
const ERROR_MESSAGES = {
  VERSION_CONFLICT: "다른 사용자가 먼저 매물을 변경했습니다. 최신 정보를 다시 불러와 확인해 주세요.",
  IDEMPOTENCY_CONFLICT: "이 등록 요청의 내용이 이전 요청과 달라 처리할 수 없습니다. 내용을 확인한 후 다시 제출해 주세요.",
  IDEMPOTENCY_REQUEST_IN_PROGRESS: "같은 등록 요청을 처리하고 있습니다. 잠시 후 다시 확인해 주세요.",
  PROPERTY_OWNERSHIP_REQUIRED: "이 매물을 변경할 권한이 없습니다.",
  PROPERTY_CREATE_NOT_ALLOWED: "현재 계정으로는 이 유형의 매물을 등록할 수 없습니다.",
  PROPERTY_NOT_FOUND: "매물이 삭제되었거나 접근할 수 없습니다.",
  NOT_FOUND_RESOURCE: "요청한 정보를 찾을 수 없습니다.",
  INVALID_STATUS_TRANSITION: "현재 상태에서는 요청한 거래 상태로 변경할 수 없습니다.",
  PROPERTY_VERIFICATION_ALREADY_IN_PROGRESS: "이미 처리 중인 검증 신청이 있습니다.",
  PROPERTY_VERIFICATION_EVIDENCE_INVALID: "검증 증빙을 확인해 주세요.",
  FILE_OWNERSHIP_REQUIRED: "본인이 등록한 검증 증빙만 사용할 수 있습니다.",
  INVALID_FILE_TYPE: "허용되지 않는 파일 형식입니다.",
  FILE_TOO_LARGE: "파일 크기가 허용 범위를 초과했습니다.",
  UPLOAD_SESSION_EXPIRED: "파일 업로드 시간이 만료되었습니다. 다시 업로드해 주세요.",
  FILE_MANAGED_ERROR: "파일을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
  INVALID_PRICE_COMBINATION: "거래 유형에 맞게 가격을 입력해 주세요.",
  OPTION_CODE_NOT_FOUND: "선택한 옵션 정보를 찾을 수 없습니다.",
  OPTION_NOT_ALLOWED_FOR_PROPERTY_TYPE: "이 매물 유형에서 사용할 수 없는 옵션이 포함되어 있습니다.",
  OPTION_VALUE_INVALID: "옵션 입력값을 확인해 주세요.",
  OPTION_VALUE_REQUIRED: "필수 옵션값을 입력해 주세요.",
  RESTORE_REFERENCE_INVALID: "매물을 복구하는 데 필요한 참조 정보가 유효하지 않습니다.",
  PROPERTY_REGION_NOT_FOUND: "선택한 지역 정보를 찾을 수 없습니다.",
  PROPERTY_REGION_BOUNDARY_NOT_FOUND: "선택한 지역의 경계 정보를 확인할 수 없습니다.",
  PROPERTY_LOCATION_REGION_MISMATCH: "선택한 지역과 주소 위치가 일치하지 않습니다.",
  PROPERTY_PUBLIC_LOCATION_GENERATION_FAILED: "지도 공개 위치를 만들 수 없습니다. 주소를 다시 확인해 주세요.",
  PROPERTY_REGISTRATION_RISK_BLOCKED: "등록 정보 검토 결과 매물 등록이 제한되었습니다.",
  PROPERTY_DUPLICATE_DETECTED: "동일한 매물로 의심되는 등록 정보가 있습니다.",
  IDEMPOTENCY_KEY_REQUIRED: "등록 요청 식별 정보를 만들지 못했습니다. 다시 시도해 주세요.",
  MEMBER_PERMISSION_DENIED: "회원 상태 또는 권한을 확인해 주세요.",
  MEMBER_API_UNAVAILABLE: "회원 권한을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.",
  KAKAO_LOCAL_API_ERROR: "주소 정보를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.",
  SCG_NOT_FOUND_ERROR: "요청한 API 경로를 찾을 수 없습니다. 잠시 후 다시 시도해 주세요.",
  INVALID_REQUEST: "입력 내용을 확인해 주세요.",
  UNAUTHENTICATED: "로그인이 필요합니다.",
  FORBIDDEN: "이 작업을 수행할 권한이 없습니다.",
  DB_ERROR: "일시적인 서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
  SYSTEM_ERROR: "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
};

const ERROR_NAMES_BY_CODE = {
  E03: "UNAUTHENTICATED",
  E04: "FORBIDDEN",
  E10: "NOT_FOUND_RESOURCE",
  E12: "PROPERTY_OWNERSHIP_REQUIRED",
  E21: "INVALID_REQUEST",
  E40: "FILE_MANAGED_ERROR",
  E41: "INVALID_FILE_TYPE",
  E42: "FILE_TOO_LARGE",
  E43: "UPLOAD_SESSION_EXPIRED",
  E44: "FILE_OWNERSHIP_REQUIRED",
  E50: "KAKAO_LOCAL_API_ERROR",
  E51: "MEMBER_PERMISSION_DENIED",
  E52: "MEMBER_API_UNAVAILABLE",
  E80: "DB_ERROR",
  E81: "DB_ERROR",
  E99: "SYSTEM_ERROR",
  P01: "INVALID_PRICE_COMBINATION",
  P02: "INVALID_STATUS_TRANSITION",
  P03: "VERSION_CONFLICT",
  P10: "PROPERTY_NOT_FOUND",
  P11: "PROPERTY_CREATE_NOT_ALLOWED",
  P12: "PROPERTY_OWNERSHIP_REQUIRED",
  P14: "OPTION_CODE_NOT_FOUND",
  P15: "OPTION_NOT_ALLOWED_FOR_PROPERTY_TYPE",
  P16: "OPTION_VALUE_INVALID",
  P17: "OPTION_VALUE_REQUIRED",
  P18: "RESTORE_REFERENCE_INVALID",
  P19: "PROPERTY_REGION_NOT_FOUND",
  P20: "IDEMPOTENCY_KEY_REQUIRED",
  P21: "IDEMPOTENCY_CONFLICT",
  P22: "IDEMPOTENCY_REQUEST_IN_PROGRESS",
  P23: "PROPERTY_REGION_BOUNDARY_NOT_FOUND",
  P24: "PROPERTY_LOCATION_REGION_MISMATCH",
  P25: "PROPERTY_VERIFICATION_ALREADY_IN_PROGRESS",
  P28: "PROPERTY_VERIFICATION_EVIDENCE_INVALID",
  P29: "PROPERTY_PUBLIC_LOCATION_GENERATION_FAILED",
  P30: "PROPERTY_REGISTRATION_RISK_BLOCKED",
  P31: "PROPERTY_DUPLICATE_DETECTED",
};

export const normalizePropertyError = (error) => {
  const status = error?.response?.status ?? null;
  const response = error?.response?.data ?? {};
  const code = response.code || error?.code || "UNKNOWN_ERROR";
  const errorName = ERROR_MESSAGES[response.message]
    ? response.message
    : ERROR_NAMES_BY_CODE[code] || code;
  const fieldErrors = Array.isArray(response.data)
    ? Object.fromEntries(response.data
        .filter((item) => item?.field && item?.message)
        .map((item) => [item.field, item.message]))
    : {};
  const fallback = status === 401
    ? ERROR_MESSAGES.UNAUTHENTICATED
    : status === 403
      ? ERROR_MESSAGES.FORBIDDEN
      : status === 404
        ? ERROR_MESSAGES.PROPERTY_NOT_FOUND
        : status === 429
          ? "요청이 많습니다. 잠시 후 다시 시도해 주세요."
          : "네트워크 상태를 확인하고 다시 시도해 주세요.";

  return {
    code,
    status,
    message: ERROR_MESSAGES[errorName] || fallback,
    traceId: response.traceId || "",
    fieldErrors,
    isConflict: errorName === "VERSION_CONFLICT",
    requiresLogin: status === 401,
    isForbidden: status === 403,
    isNotFound: status === 404,
    isRetryable: status == null
      || status === 429
      || status >= 500
      || errorName === "IDEMPOTENCY_REQUEST_IN_PROGRESS",
  };
};
