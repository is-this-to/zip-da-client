const memberRoles = {
  USER: "회원",
  AGENT: "중개사",
  ADMIN: "관리자",
};

Object.freeze(memberRoles);

const getMemberRoleName = (code) => memberRoles[code] || "회원";

export default {
  memberRoles,
  getMemberRoleName,
};

