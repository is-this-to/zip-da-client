const memberMessages = {
  LOGIN_ERROR: "이메일 또는 비밀번호를 확인해 주세요.",
  PROFILE_LOAD_ERROR:
    "프로필 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
  PROFILE_SAVE_ERROR:
    "프로필을 저장하지 못했어요. 입력 내용을 확인하고 다시 시도해 주세요.",
  PASSWORD_CODE_SEND_ERROR:
    "인증번호를 보내지 못했어요. 잠시 후 다시 시도해 주세요.",
  PASSWORD_CODE_VERIFY_ERROR:
    "인증번호가 올바르지 않아요. 다시 확인해 주세요.",
  PASSWORD_CHANGE_ERROR:
    "비밀번호를 변경하지 못했어요. 입력 내용을 확인하고 다시 시도해 주세요.",
  PASSWORD_RESET_REQUEST_ERROR:
    "재설정 메일을 보내지 못했어요. 잠시 후 다시 시도해 주세요.",
  PASSWORD_RESET_LINK_ERROR:
    "재설정 링크가 올바르지 않거나 만료되었어요. 새 링크를 요청해 주세요.",
  PASSWORD_RESET_ERROR:
    "비밀번호를 재설정하지 못했어요. 입력 내용을 확인하고 다시 시도해 주세요.",
  PROFILE_IMAGE_UPLOAD_ERROR:
    "프로필 사진을 올리지 못했어요. 잠시 후 다시 시도해 주세요.",
  TERMS_LOAD_ERROR:
    "약관을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
  DUPLICATE_CHECK_ERROR:
    "중복 여부를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.",
  EMAIL_CODE_SEND_ERROR:
    "인증번호를 보내지 못했어요. 이메일 주소를 확인하고 다시 시도해 주세요.",
  EMAIL_CODE_RESEND_ERROR:
    "인증번호를 다시 보내지 못했어요. 잠시 후 다시 시도해 주세요.",
  EMAIL_CODE_VERIFY_ERROR:
    "인증번호를 확인하지 못했어요. 입력한 번호를 다시 확인해 주세요.",
  SIGN_UP_ERROR:
    "회원가입을 완료하지 못했어요. 입력 내용을 확인하고 다시 시도해 주세요.",
  SOCIAL_CONTEXT_ERROR:
    "카카오 계정 정보를 확인하지 못했어요. 다시 로그인해 주세요.",
  SOCIAL_LINK_ERROR:
    "계정을 연결하지 못했어요. 기존 계정의 비밀번호를 확인해 주세요.",
  NICKNAME_CHECK_ERROR:
    "닉네임 중복 여부를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.",
  SOCIAL_SIGN_UP_ERROR:
    "카카오 회원가입을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.",
  SOCIAL_LOGIN_ERROR:
    "카카오 로그인을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.",
  LOGIN_STATUS_ERROR:
    "로그인 상태를 확인하지 못했어요. 다시 로그인해 주세요.",
  AGENT_APPLICATION_LOAD_ERROR:
    "중개사 전환 신청 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
  AGENT_DOCUMENT_READ_ERROR:
    "문서 내용을 읽지 못했어요. 더 선명한 서류로 다시 시도해 주세요.",
  AGENT_DOCUMENT_UPLOAD_ERROR:
    "서류를 처리하지 못했어요. 파일을 확인하고 다시 시도해 주세요.",
  AGENT_OCR_LOAD_ERROR:
    "서류 인식 결과를 불러오지 못했어요. 서류를 다시 등록해 주세요.",
  AGENT_APPLICATION_SUBMIT_ERROR:
    "중개사 전환 신청을 제출하지 못했어요. 입력 내용을 확인해 주세요.",
};

Object.freeze(memberMessages);

const getMemberMessage = (key) =>
  memberMessages[key] || "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.";

export default {
  memberMessages,
  getMemberMessage,
};
