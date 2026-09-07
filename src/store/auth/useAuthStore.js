import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { jwtDecode } from "jwt-decode";
import myAxios from "../../api/myAxios";

export const useAuthStore = defineStore("authStore", () => {
  const isLoggedIn = ref(false);
  const accessToken = ref("");
  const userInfo = ref(null);
  const authInitialized = ref(false);

  let reissuePromise = null;

  const role = computed(() => {
    if (!accessToken.value) return null;

    try {
      return jwtDecode(accessToken.value).role;
    } catch {
      return null;
    }
  });

  const clearAuthStore = () => {
    isLoggedIn.value = false;
    accessToken.value = "";
    userInfo.value = null;
  };

  const setAuthentication = (data) => {
    accessToken.value = data.accessToken;
    userInfo.value = data.principal;
    isLoggedIn.value = true;
  };

  const login = async (loginForm) => {
    const res = await myAxios.post("/api/member/auth/sessions", loginForm);
    setAuthentication(res.data.data);
  };

  const performReissue = async () => {
    try {
      const res = await myAxios.post("/api/member/auth/token-refreshes");
      setAuthentication(res.data.data);
      return true;
    } catch {
      clearAuthStore();
      return false;
    } finally {
      authInitialized.value = true;
    }
  }; // 만료 시 여러 API 요청이 동시에 들어와도 refresh token은 한 번만 회전시킨다.

  const reissue = () => {
    if (!reissuePromise) {
      reissuePromise = performReissue().finally(() => {
        reissuePromise = null;
      });
    }

    return reissuePromise;
  };

  const logout = async () => {
    try {
      await myAxios.delete("/api/member/auth/sessions/current");
    } finally {
      clearAuthStore();
    }
  };

  const registration = async (newUserData) => {
    await myAxios.post("/api/users", newUserData);
  };

  return {
    isLoggedIn,
    accessToken,
    userInfo,
    authInitialized,
    role,
    login,
    reissue,
    logout,
    registration,
  };
});
