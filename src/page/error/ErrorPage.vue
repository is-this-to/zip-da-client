<script setup>
import { computed } from "vue";
import { useRouter } from "vue-router";
import MyButton from "../../component/button/MyButton.vue";
import { useMyErrorStore } from "../../store/error/useMyErrorStore.js";

const router = useRouter();
const myErrorStore = useMyErrorStore();

const displayErrorCode = computed(
  () => myErrorStore.errorCode || "UNKNOWN_ERROR",
);

const displayErrorMessage = computed(
  () =>
    myErrorStore.errorMsg ||
    "요청을 처리하는 중 예기치 못한 문제가 발생했습니다.",
);

const redirectMain = () => {
  myErrorStore.clearErrorInfo();
  router.replace("/");
};
</script>

<template>
  <main class="error-page">
    <section class="error-container">
      <div class="error-symbol" aria-hidden="true">
        <span>!</span>
      </div>

      <p class="error-label">Something went wrong</p>
      <h1>페이지를 처리할 수 없습니다</h1>

      <p class="error-description">
        {{ displayErrorMessage }}
      </p>

      <div class="error-information">
        <span>에러 코드</span>
        <strong>{{ displayErrorCode }}</strong>
      </div>

      <p class="help-message">
        잠시 후 다시 시도하거나 메인 페이지로 이동해 주세요.
      </p>

      <MyButton
        size="middle"
        color="blue"
        content="메인 페이지로"
        class="main-button"
        @click="redirectMain"
      />
    </section>
  </main>
</template>

<style scoped>
.error-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  background:
    linear-gradient(135deg, rgba(0, 100, 255, 0.07), rgba(230, 231, 244, 0.35)),
    var(--personal-color-white);
}

.error-container {
  width: min(100%, 540px);
  padding: 48px 44px;
  border: 1px solid var(--personal-color-periwinkle);
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 18px 50px rgba(31, 31, 31, 0.08);
  text-align: center;
}

.brand {
  margin-bottom: 38px;
}

.brand a {
  color: var(--personal-color-blue);
  font-size: 24px;
  font-weight: 900;
  text-decoration: none;
  letter-spacing: 0;
}

.error-symbol {
  width: 72px;
  height: 72px;
  display: grid;
  place-items: center;
  margin: 0 auto 24px;
  border-radius: 50%;
  color: #ffffff;
  background: var(--personal-color-blue);
  box-shadow: 0 12px 28px rgba(0, 100, 255, 0.25);
}

.error-symbol span {
  font-size: 38px;
  font-weight: 800;
  line-height: 1;
}

.error-label {
  margin: 0 0 8px;
  color: var(--personal-color-blue);
  font-size: 14px;
  font-weight: 800;
}

h1 {
  margin: 0;
  color: var(--personal-color-black);
  font-size: 30px;
  line-height: 1.35;
  letter-spacing: 0;
}

.error-description {
  margin: 18px auto 28px;
  color: var(--personal-color-gray);
  font-size: 16px;
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.error-information {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 16px 18px;
  border-left: 4px solid var(--personal-color-blue);
  background: var(--personal-color-white);
  text-align: left;
}

.error-information span {
  flex-shrink: 0;
  color: var(--personal-color-gray);
  font-size: 14px;
  font-weight: 700;
}

.error-information strong {
  color: var(--personal-color-black);
  font-size: 14px;
  overflow-wrap: anywhere;
  text-align: right;
}

.help-message {
  margin: 22px 0;
  color: var(--personal-color-gray);
  font-size: 14px;
  line-height: 1.6;
}

.main-button {
  height: 58px;
  border: 0;
  border-radius: 18px;
  font-size: 18px;
  font-weight: 900;
  box-shadow: 0 16px 32px #0057e747;
  margin-top: 24px;
  width: 100%;
}

@media (max-width: 600px) {
  .error-page {
    align-items: flex-start;
    padding: 24px 16px;
  }

  .error-container {
    padding: 36px 22px;
  }

  h1 {
    font-size: 24px;
  }

  .error-information {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
  }

  .error-information strong {
    text-align: left;
  }
}
</style>
