const API_ERROR_MESSAGES = Object.freeze({
  INVALID_PARAMETER_ERROR: "입력한 내용을 다시 확인해 주세요.",
  INVALID_REQUEST: "입력한 내용을 다시 확인해 주세요.",
  NOT_FOUND_RESOURCE_ERROR: "요청한 정보를 찾을 수 없어요.",
  DUPLICATED_RESOURCE_ERROR: "이미 사용 중인 정보입니다.",
  UNAUTHENTICATED_ERROR: "로그인이 필요해요.",
  UNAUTHORIZED_ERROR: "이 작업을 수행할 권한이 없어요.",
  EMAIL_SEND_ERROR: "인증번호를 보내지 못했어요. 잠시 후 다시 시도해 주세요.",
  EMAIL_RESEND_LIMIT_ERROR: "잠시 후 인증번호를 다시 요청해 주세요.",
  EMAIL_VERIFICATION_NOT_FOUND: "인증번호를 찾을 수 없어요. 새 인증번호를 요청해 주세요.",
  EMAIL_VERIFICATION_EXPIRED: "인증번호가 만료되었어요. 새 인증번호를 요청해 주세요.",
  EMAIL_VERIFICATION_ALREADY_COMPLETED: "이미 이메일 인증이 완료되었어요.",
  VERIFICATION_ATTEMPTS_EXCEEDED: "인증번호 확인 횟수를 초과했어요. 새 인증번호를 요청해 주세요.",
  VERIFICATION_CODE_INVALID: "인증번호가 올바르지 않아요. 다시 확인해 주세요.",
  EMAIL_VERIFICATION_EMAIL_MISMATCH: "인증한 이메일과 입력한 이메일이 달라요.",
  EMAIL_VERIFICATION_REQUIRED: "이메일 인증을 먼저 완료해 주세요.",
  MEMBER_NOT_FOUND: "회원 정보를 찾을 수 없어요.",
  MEMBER_WITHDRAWN: "탈퇴한 계정은 이용할 수 없어요.",
  MEMBER_SUSPENDED: "이용이 제한된 계정이에요.",
  MEMBER_LOCKED: "잠긴 계정이에요. 고객센터에 문의해 주세요.",
  ACCOUNT_SANCTIONED: "계정 이용이 제한되어 있어요.",
  PROPERTY_SANCTIONED: "매물 관련 기능 이용이 제한되어 있어요.",
  AGENT_PROFILE_NOT_FOUND: "중개사 프로필 정보를 찾을 수 없어요.",
  AGENT_NOT_ACTIVE: "현재 영업 중인 중개사가 아니에요.",
  FILE_MANAGED_ERROR: "파일을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.",
  OCR_PROCESSING_ERROR: "서류를 인식하지 못했어요. 더 선명한 파일로 다시 시도해 주세요.",
  DB_ERROR: "일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",
  SYSTEM_ERROR: "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.",
  E21: "입력한 내용을 다시 확인해 주세요.",
  E80: "일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",
  E81: "이미 처리된 요청이거나 중복된 정보예요.",
  E99: "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.",
});

export const getApiErrorMessage = (
  error,
  fallback = "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.",
) => {
  const response = error?.response?.data;
  const candidates = [response?.message, response?.code, error?.code];

  return candidates.map((value) => API_ERROR_MESSAGES[value]).find(Boolean) || fallback;
};
