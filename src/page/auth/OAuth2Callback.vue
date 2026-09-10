<script setup>
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Header from "../../component/Header.vue";
import MyButton from "../../component/button/MyButton.vue";
import { useAuthStore } from "../../store/auth/useAuthStore.js";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const errorMessage = ref("");

const completeOAuth = async () => {
  if (route.query.code) {
    errorMessage.value = String(
      route.query.message || "카카오 로그인에 실패했습니다.",
    );
    return;
  }

  try {
    if (route.query.flow === "login") {
      const success = await authStore.reissue();
      if (!success) throw new Error("토큰 발급 실패");
      await router.replace("/main");
      return;
    }
    if (route.query.flow === "signup") {
      await router.replace("/social-sign-up");
      return;
    }
    if (route.query.flow === "link") {
      await router.replace("/social-account-link");
      return;
    }
    throw new Error("알 수 없는 카카오 로그인 응답");
  } catch {
    errorMessage.value =
      "로그인 상태를 확인하지 못했습니다. 다시 시도해 주세요.";
  }
};

onMounted(completeOAuth);
</script>

<template>
  <section class="page oauth-callback-page">
    <Header title="카카오 로그인" />
    <div class="page-content callback-content">
      <template v-if="errorMessage">
        <span class="status-icon status-icon--error" aria-hidden="true">!</span>
        <h1 class="page-title">로그인을 완료하지 못했어요</h1>
        <p class="error-box" role="alert">{{ errorMessage }}</p>
        <MyButton block size="large" @click="router.replace('/sign-in')">
          로그인으로 돌아가기
        </MyButton>
      </template>
      <template v-else>
        <span class="status-icon" aria-hidden="true"></span>
        <h1 class="page-title">카카오 계정을 확인하고 있어요</h1>
        <p class="page-description">잠시만 기다려 주세요.</p>
      </template>
    </div>
  </section>
</template>

<style scoped>
.oauth-callback-page {
  display: flex;
  min-height: 100dvh;
  flex-direction: column;
}

.callback-content {
  display: grid;
  flex: 1;
  align-content: center;
  justify-items: center;
  gap: 18px;
  text-align: center;
}

.status-icon {
  width: 54px;
  height: 54px;
  border: 5px solid var(--zipda-color-primary-light);
  border-top-color: var(--zipda-color-primary);
  border-radius: 50%;
  animation: spin 800ms linear infinite;
}

.status-icon--error {
  display: grid;
  place-items: center;
  color: var(--zipda-color-danger);
  background: var(--zipda-color-danger-light);
  border: 0;
  font-size: 26px;
  font-weight: 800;
  animation: none;
}

.error-box {
  width: 100%;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .status-icon {
    animation: none;
  }
}
</style>

