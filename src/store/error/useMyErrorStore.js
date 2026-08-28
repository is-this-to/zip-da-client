import { defineStore } from "pinia";
import { ref } from "vue";

export const useMyErrorStore = defineStore("myErrorStore", () => {
  // 1.State (ref)
  const isError = ref(false);
  const errorCode = ref("");
  const errorMsg = ref("");

  // 2. Getter (computed)

  // 3. Actions (function)
  const setErrorInfo = (error) => {
    const errorData = error?.response?.data || {
      code: "UNKNOWN_ERROR",
      data: "예기치 못한 에러 발생했습니다",
    };
    errorCode.value = errorData.code;
    errorMsg.value = errorData.data;
    isError.value = true;
  };

  const clearErrorInfo = () => {
    errorCode.value = "";
    errorMsg.value = "";
    isError.value = false;
  };

  const redirectErrorPage = (error) => {
    const code = error?.response?.data?.code;
    if (!["E80", "E99"].includes(code)) {
      return false;
    }

    setErrorInfo(error);
    return true;
  };

  return {
    isError,
    errorCode,
    errorMsg,
    setErrorInfo,
    clearErrorInfo,
    redirectErrorPage,
  };
});
