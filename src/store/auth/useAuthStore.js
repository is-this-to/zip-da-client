import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { jwtDecode } from "jwt-decode";
import myAxios from "../../api/myAxios";

export const useAuthStore = defineStore("authStore", () => {
  const isLoggedIn = ref(false);
  const accessToken = ref("");
  const userInfo = ref(null);
  const authInitialized = ref(false);
  const socialSignupContext = ref(null);
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
  };

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

  const getTerms = async () =>
    (await myAxios.get("/api/member/terms")).data.data;

  const checkDuplicate = async (typePolicy, value) =>
    (
      await myAxios.post("/api/member/member-validations", {
        typePolicy,
        value,
      })
    ).data.data;

  const sendEmailVerification = async (email) =>
    (await myAxios.post("/api/member/email-verifications", { email })).data
      .data;

  const verifyEmailVerification = async (
    verificationId,
    email,
    verificationCode,
  ) =>
    (
      await myAxios.patch(
        `/api/member/email-verifications/${encodeURIComponent(String(verificationId))}`,
        { email, verificationCode },
      )
    ).data.data;

  const uploadProfile = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return (
      await myAxios.post("/api/member/files/profiles", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    ).data.data;
  };

  const registration = async (newMemberData) =>
    (await myAxios.post("/api/member", newMemberData)).data.data;

  const startKakaoLogin = () => {
    const baseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(
      /\/$/,
      "",
    );
    window.location.assign(`${baseUrl}/api/auth/oauth2/authorization/kakao`);
  };

  const getSocialSignupContext = async () => {
    const context = (
      await myAxios.get("/api/member/auth/social-signups/current")
    ).data.data;
    socialSignupContext.value = context;
    return context;
  };

  const socialRegistration = async (additionalInfo) =>
    (await myAxios.post("/api/member/auth/social-signups", additionalInfo)).data
      .data;

  const linkSocialAccount = async (linkRequest) => {
    await myAxios.post("/api/member/auth/social-links", linkRequest);
  };

  return {
    isLoggedIn,
    accessToken,
    userInfo,
    authInitialized,
    socialSignupContext,
    role,
    clearAuthStore,
    login,
    reissue,
    logout,
    getTerms,
    checkDuplicate,
    sendEmailVerification,
    verifyEmailVerification,
    uploadProfile,
    registration,
    startKakaoLogin,
    getSocialSignupContext,
    socialRegistration,
    linkSocialAccount,
  };
});

