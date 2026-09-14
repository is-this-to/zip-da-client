import { defineStore } from "pinia";
import { ref } from "vue";
import myAxios from "../../api/myAxios";

const APPLICATION_API = "/api/member/agent-applications";
const MEMBER_API = "/api/member/members/me";
const AGENT_API = "/api/member/agents";

export const useMemberStore = defineStore("memberStore", () => {
  const agentApplication = ref(null);
  const loadingAgentApplication = ref(false);
  const uploadingAgentDocument = ref(false);
  const submittingAgentApplication = ref(false);
  const memberProfile = ref(null);
  const agentProfile = ref(null);
  const loadingProfile = ref(false);
  const savingProfile = ref(false);

  const setAgentApplication = (application) => {
    agentApplication.value = application;
    return application;
  };

  const createAgentApplication = async () => {
    const response = await myAxios.post(APPLICATION_API);
    return setAgentApplication(response.data.data);
  };

  const getCurrentAgentApplication = async () => {
    const response = await myAxios.get(`${APPLICATION_API}/current`);
    return setAgentApplication(response.data.data);
  };

  const initializeAgentApplication = async () => {
    loadingAgentApplication.value = true;
    try {
      return await createAgentApplication();
    } catch (error) {
      if (error?.response?.status === 409) {
        return getCurrentAgentApplication();
      }
      throw error;
    } finally {
      loadingAgentApplication.value = false;
    }
  };

  const uploadAgentDocument = async (applicationId, documentType, file) => {
    const formData = new FormData();
    formData.append("file", file);

    uploadingAgentDocument.value = true;
    try {
      const response = await myAxios.post(
        `${APPLICATION_API}/${encodeURIComponent(String(applicationId))}/documents`,
        formData,
        {
          params: { documentType },
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      return response.data.data;
    } finally {
      uploadingAgentDocument.value = false;
    }
  };

  const updateAgentApplication = async (applicationId, request) => {
    const response = await myAxios.patch(
      `${APPLICATION_API}/${encodeURIComponent(String(applicationId))}`,
      request,
    );
    return setAgentApplication(response.data.data);
  };

  const submitAgentApplication = async (applicationId) => {
    submittingAgentApplication.value = true;
    try {
      const response = await myAxios.post(
        `${APPLICATION_API}/${encodeURIComponent(String(applicationId))}/submissions`,
      );
      return setAgentApplication(response.data.data);
    } finally {
      submittingAgentApplication.value = false;
    }
  };

  const getMyProfile = async () => {
    loadingProfile.value = true;
    try {
      const response = await myAxios.get(MEMBER_API);
      memberProfile.value = response.data.data;
      return memberProfile.value;
    } finally {
      loadingProfile.value = false;
    }
  };

  const updateMyProfile = async (request) => {
    savingProfile.value = true;
    try {
      const response = await myAxios.patch(MEMBER_API, request);
      memberProfile.value = response.data.data;
      return memberProfile.value;
    } finally {
      savingProfile.value = false;
    }
  };

  const uploadMyProfileImage = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await myAxios.post(
      "/api/member/files/profiles/me",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return response.data.data;
  };

  const sendPasswordVerification = async () => {
    const response = await myAxios.post(
      `${MEMBER_API}/password-verifications`,
    );
    return response.data.data;
  };

  const verifyPasswordCode = async (verificationId, verificationCode) => {
    const response = await myAxios.patch(
      `${MEMBER_API}/password-verifications/${encodeURIComponent(String(verificationId))}`,
      { verificationCode },
    );
    return response.data.data;
  };

  const changePassword = async (request) => {
    await myAxios.patch(`${MEMBER_API}/password`, request);
  };

  const getAgentProfile = async (agentId) => {
    const response = await myAxios.get(
      `${AGENT_API}/${encodeURIComponent(String(agentId))}`,
    );
    agentProfile.value = response.data.data;
    return agentProfile.value;
  };

  const updateAgentProfile = async (agentId, request) => {
    savingProfile.value = true;
    try {
      const response = await myAxios.patch(
        `${AGENT_API}/${encodeURIComponent(String(agentId))}`,
        request,
      );
      agentProfile.value = response.data.data;
      return agentProfile.value;
    } finally {
      savingProfile.value = false;
    }
  };

  const uploadAgentProfileImage = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await myAxios.post(
      "/api/member/files/agent-profiles/me",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return response.data.data;
  };

  return {
    agentApplication,
    loadingAgentApplication,
    uploadingAgentDocument,
    submittingAgentApplication,
    memberProfile,
    agentProfile,
    loadingProfile,
    savingProfile,
    initializeAgentApplication,
    getCurrentAgentApplication,
    uploadAgentDocument,
    updateAgentApplication,
    submitAgentApplication,
    getMyProfile,
    updateMyProfile,
    uploadMyProfileImage,
    sendPasswordVerification,
    verifyPasswordCode,
    changePassword,
    getAgentProfile,
    updateAgentProfile,
    uploadAgentProfileImage,
  };
});
