<script setup>
import { computed, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Header from "../../component/Header.vue";
import ActionLink from "../../component/button/ActionLink.vue";
import MyButton from "../../component/button/MyButton.vue";
import MyInput from "../../component/input/MyInput.vue";
import memberMessage from "../../constants/memberMessage.js";
import { useAuthStore } from "../../store/auth/useAuthStore.js";
import signInValidator from "../../util/validator/member/signInValidator.js";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const email = ref("");
const requestSent = ref(false);
const requesting = ref(false);
const resetting = ref(false);
const errorMessage = ref("");
const form = reactive({
  newPassword: "",
  newPasswordCheck: "",
});

const passwordPattern = /^[0-9A-Za-z!@#$]{8,20}$/;
const token = computed(() => {
  const queryToken = route.query.token;
  if (Array.isArray(queryToken)) return String(queryToken[0] || "").trim();
  return typeof queryToken === "string" ? queryToken.trim() : "";
});
const isResetMode = computed(() => Boolean(token.value));
const passwordError = computed(() => {
  if (!form.newPassword || passwordPattern.test(form.newPassword)) return "";
  return "영문, 숫자, !@#$만 사용하여 8~20자로 입력해 주세요.";
});
const passwordCheckError = computed(() => {
  if (!form.newPasswordCheck || form.newPassword === form.newPasswordCheck) {
    return "";
  }
  return "새 비밀번호가 일치하지 않습니다.";
});
const canReset = computed(
  () =>
    token.value &&
    passwordPattern.test(form.newPassword) &&
    form.newPassword === form.newPasswordCheck &&
    !resetting.value,
);

const requestReset = async () => {
  if (requesting.value) return;

  const validationMessage = signInValidator.email(email.value);
  if (validationMessage) {
    errorMessage.value = validationMessage;
    return;
  }

  requesting.value = true;
  errorMessage.value = "";
  try {
    await authStore.requestPasswordReset(email.value.trim());
    requestSent.value = true;
  } catch {
    errorMessage.value = memberMessage.getMemberMessage(
      "PASSWORD_RESET_REQUEST_ERROR",
    );
  } finally {
    requesting.value = false;
  }
};

const resetPassword = async () => {
  if (!canReset.value) return;

  resetting.value = true;
  errorMessage.value = "";
  try {
    await authStore.resetPassword({
      token: token.value,
      newPassword: form.newPassword,
      newPasswordCheck: form.newPasswordCheck,
    });
    await router.replace({
      path: "/sign-in",
      query: { passwordReset: "true" },
    });
  } catch (error) {
    const code = String(error?.response?.data?.code || "");
    errorMessage.value = ["E69", "E70"].includes(code)
      ? memberMessage.getMemberMessage("PASSWORD_RESET_LINK_ERROR")
      : memberMessage.getMemberMessage("PASSWORD_RESET_ERROR");
  } finally {
    resetting.value = false;
  }
};
</script>

<template>
  <section class="page password-reset-page">
    <Header title="비밀번호 재설정" show-back back-to="/sign-in" />

    <div class="page-content password-reset-content">
      <template v-if="isResetMode">
        <header class="password-reset-heading">
          <span class="password-reset-icon" aria-hidden="true">✓</span>
          <div>
            <h1 class="page-title">새 비밀번호를 입력해 주세요</h1>
            <p class="page-description">
              안전한 서비스 이용을 위해 이전과 다른 비밀번호를 사용해 주세요.
            </p>
          </div>
        </header>

        <form class="form password-reset-form" @submit.prevent="resetPassword">
          <div class="field-group">
            <MyInput
              v-model="form.newPassword"
              label="새 비밀번호"
              type="password"
              autocomplete="new-password"
              placeholder="영문, 숫자, 특수문자 8~20자"
              required
              :error-message="passwordError"
            />
            <MyInput
              v-model="form.newPasswordCheck"
              label="새 비밀번호 확인"
              type="password"
              autocomplete="new-password"
              placeholder="새 비밀번호를 다시 입력해 주세요"
              required
              :error-message="passwordCheckError"
            />
          </div>

          <p v-if="errorMessage" class="error-box" role="alert">
            {{ errorMessage }}
          </p>

          <MyButton
            type="submit"
            size="large"
            block
            :disabled="!canReset"
            :loading="resetting"
            loading-text="변경 중"
          >
            비밀번호 변경
          </MyButton>
        </form>
      </template>

      <template v-else>
        <header class="password-reset-heading">
          <span class="password-reset-icon" aria-hidden="true">✉</span>
          <div>
            <h1 class="page-title">비밀번호를 잊으셨나요?</h1>
            <p class="page-description">
              가입할 때 사용한 이메일로 비밀번호 재설정 링크를 보내드려요.
            </p>
          </div>
        </header>

        <div v-if="requestSent" class="password-reset-result">
          <div class="info-box" role="status">
            입력한 이메일로 재설정 링크를 보냈습니다. 계정 존재 여부와 관계없이
            동일하게 안내됩니다.
          </div>
          <p class="password-reset-guide">
            메일이 보이지 않으면 스팸함을 확인하거나 잠시 후 다시 요청해 주세요.
          </p>
          <MyButton
            type="button"
            variant="outline"
            block
            @click="requestSent = false"
          >
            다시 요청하기
          </MyButton>
        </div>

        <form
          v-else
          class="form password-reset-form"
          @submit.prevent="requestReset"
        >
          <MyInput
            v-model="email"
            label="이메일"
            name="email"
            type="email"
            autocomplete="email"
            inputmode="email"
            placeholder="example@email.com"
            required
          />

          <p v-if="errorMessage" class="error-box" role="alert">
            {{ errorMessage }}
          </p>

          <MyButton
            type="submit"
            size="large"
            block
            :loading="requesting"
            loading-text="메일 보내는 중"
          >
            재설정 링크 보내기
          </MyButton>
        </form>
      </template>

      <p class="password-reset-login">
        비밀번호가 기억나셨나요?
        <ActionLink to="/sign-in" variant="text" size="small">
          로그인
        </ActionLink>
      </p>
    </div>
  </section>
</template>

<style scoped>
.password-reset-page {
  display: flex;
  flex-direction: column;
}

.password-reset-content {
  display: flex;
  flex: 1;
  flex-direction: column;
  max-width: 520px;
  margin: 0 auto;
  padding-top: 48px;
}

.password-reset-heading {
  display: grid;
  justify-items: center;
  gap: 20px;
  text-align: center;
}

.password-reset-heading > div {
  display: grid;
  gap: 8px;
}

.password-reset-icon {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  color: var(--zipda-color-primary-active);
  background: var(--zipda-color-primary-light);
  border-radius: 50%;
  font-size: 24px;
  font-weight: 700;
}

.password-reset-form,
.password-reset-result {
  margin-top: 36px;
}

.password-reset-result {
  display: grid;
  gap: 16px;
}

.password-reset-guide {
  color: var(--zipda-color-text-muted);
  font-size: 12px;
  line-height: 1.6;
  text-align: center;
}

.password-reset-login {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin-top: auto;
  padding-top: 40px;
  color: var(--zipda-color-text-muted);
  font-size: 13px;
}

.password-reset-login :deep(.action-link) {
  min-height: auto;
  padding: 4px 0;
  color: var(--zipda-color-primary-active);
  font-weight: 700;
}

:deep(.my-button--large) {
  min-height: 52px;
  border-radius: var(--zipda-radius-large);
}
</style>

