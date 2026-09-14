import axios from "axios";
import { jwtDecode } from "jwt-decode";
import dayjs from "dayjs";
import { useAuthStore } from "../store/auth/useAuthStore";

const myAxios = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

const shouldReissue = (accessToken) => {
  try {
    const claims = jwtDecode(accessToken);
    const reissueAt = dayjs.unix(claims.exp).subtract(2, "minute").unix();
    return dayjs().unix() >= reissueAt;
  } catch {
    return true;
  }
};

myAxios.interceptors.request.use(async (config) => {
  const authStore = useAuthStore();
  const isReissueRequest = config.url === "/api/auth/tokens";

  if (
    !isReissueRequest &&
    authStore.isLoggedIn &&
    shouldReissue(authStore.accessToken)
  ) {
    await authStore.reissue();
  }

  if (authStore.accessToken && !isReissueRequest) {
    config.headers.Authorization = `Bearer ${authStore.accessToken}`;
  }

  return config;
});

export default myAxios;
