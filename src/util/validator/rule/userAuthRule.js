/**
 * @param {string} val 검증할 문자열
 * @returns {string} 통과시 빈문자열(''), 실패 시 에러메시지
 */

export const email = (val) => {
  const regexp =
    /^[0-9a-zA-Z](?!.*?[\-_.]{2})[a-zA-Z0-9\-_.]{3,63}@[0-9a-zA-Z](?!.*?[\-_.]{2})[a-zA-Z0-9\-_.]{3,63}\.[a-zA-Z]{2,3}$/;
  if (!val) {
    return "이메일은 필수입니다.";
  }

  if (!regexp.test(val)) {
    return "이메일 양식이 올바르지 않습니다.";
  }

  return "";
};

export const password = (val) => {
  const regexp =
    /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()])[A-Za-z\d!@#$%^&*()]{8,20}$/;
  if (!val) {
    return "비밀번호는 필수입니다.";
  }

  if (!regexp.test(val)) {
    return "비밀번호는 영문, 숫자, 특수문자를 포함하여 8~20자로 입력해주세요.";
  }

  return "";
};
