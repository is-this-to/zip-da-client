<script setup>
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import signInValidator from "../../util/validator/member/signInValidator.js";
import { useAuthStore } from "../../store/auth/useAuthStore.js";
import { useMyErrorStore } from "../../store/error/useMyErrorStore.js";

import Header from "../../component/Header.vue";
import ActionLink from "../../component/button/ActionLink.vue";
import MyButton from "../../component/button/MyButton.vue";
import MyInput from "../../component/input/MyInput.vue";

const router = useRouter();
const authStore = useAuthStore();
const myErrorStore = useMyErrorStore();

const signInForm = reactive({
  email: "",
  password: "",
});
const isSubmitting = ref(false);
const errorMessage = ref("");
const isKakaoRedirecting = ref(false);

const submitLogin = async () => {
  if (isSubmitting.value) return;

  const emailValResult = signInValidator.email(signInForm.email);
  const passwordValResult = signInValidator.password(signInForm.password);

  if (!emailValResult && !passwordValResult) {
    try {
      isSubmitting.value = true;
      errorMessage.value = "";
      await authStore.login(signInForm);

      router.replace("/main");
    } catch (error) {
      if (myErrorStore.redirectErrorPage(error)) return;
      errorMessage.value = "이메일 또는 비밀번호를 확인해 주세요.";
    } finally {
      isSubmitting.value = false;
    }
  } else {
    const validationMessages = [emailValResult, passwordValResult].filter(
      Boolean,
    );
    errorMessage.value = validationMessages.join("\n");
  }
};

const redirectSignUp = () => {
  router.push("/sign-up");
};

const startKakaoLogin = () => {
  if (isKakaoRedirecting.value) return;
  isKakaoRedirecting.value = true;
  authStore.startKakaoLogin();
};
</script>

<template>
  <section class="page sign-in-page">
    <Header title="ZIPDA" show-back />

    <div class="page-content sign-in-content">
      <header class="sign-in-heading">
        <h1 class="page-title">로그인</h1>
        <p class="page-description">다시 만나서 반가워요!</p>
      </header>

      <form class="form sign-in-form" @submit.prevent="submitLogin">
        <div class="field-group sign-in-fields">
          <MyInput
            v-model="signInForm.email"
            name="email"
            type="email"
            placeholder="이메일 주소"
            autocomplete="email"
            inputmode="email"
            required
          />

          <MyInput
            v-model="signInForm.password"
            name="password"
            type="password"
            placeholder="비밀번호"
            autocomplete="current-password"
            required
          />
        </div>

        <p v-if="errorMessage" class="sign-in-error text-error" role="alert">
          {{ errorMessage }}
        </p>

        <div class="sign-in-reset">
          <ActionLink to="/password-reset" variant="text" size="small">
            비밀번호 재설정
          </ActionLink>
        </div>

        <MyButton
          type="submit"
          size="large"
          block
          :loading="isSubmitting"
          loading-text="로그인 중"
        >
          로그인
        </MyButton>
      </form>

      <!-- <div class="sign-in-divider" aria-hidden="true">
        <span>또는</span>
      </div> -->

      <!-- <MyButton
        type="button"
        variant="kakao"
        size="large"
        block
        :loading="isKakaoRedirecting"
        loading-text="카카오로 이동 중"
        @click="startKakaoLogin"
      >
        <template #leading>
          <img
            class="sign-in-kakao-icon"
            src="/icon/sign-in-kakao.svg?v=20260907"
            alt=""
            aria-hidden="true"
          />
        </template>
        카카오로 계속하기
      </MyButton> -->

      <p class="sign-in-sign-up">
        <span>계정이 없으신가요?</span>
        <ActionLink to="/sign-up" variant="text" size="small">
          회원가입
        </ActionLink>
      </p>
    </div>
  </section>
</template>

<style scoped>
.sign-in-page {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}

.sign-in-content {
  display: flex;
  flex: 1;
  flex-direction: column;
  padding-top: 60px;
}

.sign-in-heading {
  display: grid;
  justify-items: center;
  gap: 8px;
  text-align: center;
}

.sign-in-heading .page-title {
  font-weight: 500;
  line-height: 30px;
}

.sign-in-heading .page-description {
  color: #45483e;
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
}

.sign-in-form {
  gap: 0;
  margin-top: 32px;
}

.sign-in-fields {
  gap: 16px;
}

.sign-in-error {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-line;
}

.sign-in-reset {
  display: flex;
  justify-content: flex-end;
  padding-top: 4px;
}

.sign-in-divider {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 40px 0 20px;
  color: #c5c8ba;
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
  letter-spacing: 0.02em;
}

.sign-in-divider::before,
.sign-in-divider::after {
  flex: 1;
  height: 1px;
  background: #dde5d4;
  content: "";
}

.sign-in-kakao-icon {
  width: 24px;
  height: 24px;
  object-fit: contain;
}

.sign-in-sign-up {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin-top: auto;
  padding: 32px 0 16px;
  color: #45483e;
  font-size: 13px;
  font-weight: 500;
  line-height: 24px;
}

:deep(.app-header) {
  height: 56px;
  padding: 0 16px;
  background: #faf9f4;
  border-bottom-color: #dde5d4;
}

:deep(.app-header__title) {
  color: var(--zipda-color-subtle-text);
  font-size: 28px;
  line-height: 34px;
  letter-spacing: -0.01em;
}

:deep(.my-input__control) {
  min-height: 50px;
  padding: 0 17px;
  border-color: #dde5d4;
  border-radius: var(--zipda-radius-large);
}

:deep(.my-input__field) {
  font-size: 15px;
  font-weight: 500;
}

:deep(.my-input__field::placeholder) {
  color: #c5c8ba;
}

.sign-in-reset :deep(.action-link) {
  min-height: auto;
  padding: 4px 0;
  color: #546343;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.02em;
}

:deep(.my-button--large) {
  min-height: 52px;
  border-radius: var(--zipda-radius-large);
  font-size: 18px;
  font-weight: 500;
}

.sign-in-form :deep(.my-button--primary) {
  margin-top: 16px;
  box-shadow: 0 8px 12px rgb(113 131 85 / 12%);
}

.sign-in-sign-up :deep(.action-link) {
  min-height: auto;
  padding: 0;
  color: var(--zipda-color-subtle-text);
  font-size: 18px;
  font-weight: 500;
}
</style>
