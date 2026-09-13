import { createApp } from "vue";
import { createPinia } from "pinia";

import "./style.css";
import App from "./App.vue";
import router from "./route/router.js";
import { useAuthStore } from "./store/auth/useAuthStore.js";

const bootstrap = async () => {
  const app = createApp(App);
  const pinia = createPinia();

  app.use(pinia);
  app.use(router);

  const authStore = useAuthStore(pinia);

  // 새로고침으로 메모리의 Access Token이 사라져도
  // Refresh Token 쿠키가 유효하면 로그인 상태를 복구한다.
  await authStore.reissue();

  await router.isReady();

  app.mount("#app");
};

bootstrap();
