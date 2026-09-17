const ocrStatuses = {
  PENDING: "처리 대기",
  PROCESSING: "처리 중",
  COMPLETED: "인식 완료",
  FAILED: "인식 실패",
};

Object.freeze(ocrStatuses);

const getOcrStatusName = (code) => ocrStatuses[code] || "상태 확인 중";

export default {
  ocrStatuses,
  getOcrStatusName,
};
