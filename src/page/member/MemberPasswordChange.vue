<script setup>
import { computed, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import Header from "../../component/Header.vue";
import MyButton from "../../component/button/MyButton.vue";
import MyInput from "../../component/input/MyInput.vue";
import { useAuthStore } from "../../store/auth/useAuthStore.js";
import { useMemberStore } from "../../store/member/member.js";

const router = useRouter();
const authStore = useAuthStore();
const memberStore = useMemberStore();
const verificationId = ref("");
const verificationCode = ref("");
const codeSent = ref(false);
const verified = ref(false);
const sending = ref(false);
const checking = ref(false);
const changing = ref(false);
const message = ref("");
const errorMessage = ref("");
const form = reactive({
  currentPassword: "",
  newPassword: "",
  newPasswordCheck: "",
});

const passwordPattern = /^[0-9A-Za-z!@#$]{8,20}$/;
const canVerify = computed(
  () => codeSent.value && /^\d{6}$/.test(verificationCode.value) && !checking.value,
);
const canChange = computed(
  () =>
    verified.value &&
    form.currentPassword &&
    passwordPattern.test(form.newPassword) &&
    form.newPassword === form.newPasswordCheck &&
    !changing.value,
);

const sendCode = async () => {
  sending.value = true;
  errorMessage.value = "";
  try {
    const result = await memberStore.sendPasswordVerification();
    verificationId.value = String(result.verificationId ?? result.id);
    verificationCode.value = "";
    verified.value = false;
    codeSent.value = true;
    message.value = "가입한 이메일로 인증번호를 보냈습니다.";
  } catch (error) {
    errorMessage.value =
      error?.response?.data?.message || "인증번호를 보내지 못했습니다.";
  } finally {
    sending.value = false;
  }
};

const verifyCode = async () => {
  if (!canVerify.value) return;
  checking.value = true;
  errorMessage.value = "";
  try {
    await memberStore.verifyPasswordCode(
      verificationId.value,
      verificationCode.value,
    );
    verified.value = true;
    message.value = "이메일 인증이 완료되었습니다.";
  } catch (error) {
    verified.value = false;
    errorMessage.value =
      error?.response?.data?.message || "인증번호가 올바르지 않습니다.";
  } finally {
    checking.value = false;
  }
};

const changePassword = async () => {
  if (!canChange.value) return;
  changing.value = true;
  errorMessage.value = "";
  try {
    await memberStore.changePassword({
      currentPassword: form.currentPassword,
      verificationId: verificationId.value,
      newPassword: form.newPassword,
      newPasswordCheck: form.newPasswordCheck,
    });
    authStore.clearAuthStore();
    await router.replace({ path: "/sign-in", query: { passwordChanged: "true" } });
  } catch (error) {
    errorMessage.value =
      error?.response?.data?.message || "비밀번호를 변경하지 못했습니다.";
  } finally {
    changing.value = false;
  }
};
</script>

<template>
  <section class="page">
    <Header title="비밀번호 변경" show-back back-to="/mypage" />
    <div class="page-content password-page">
      <section class="verification-card">
        <div>
          <strong>이메일 본인 확인</strong>
          <p>가입한 이메일로 받은 6자리 인증번호를 확인해 주세요.</p>
        </div>
        <MyButton
          variant="secondary"
          size="small"
          :loading="sending"
          @click="sendCode"
        >
          {{ codeSent ? "다시 보내기" : "인증번호 보내기" }}
        </MyButton>
      </section>

      <form v-if="codeSent && !verified" class="code-form" @submit.prevent="verifyCode">
        <MyInput
          v-model="verificationCode"
          label="인증번호"
          inputmode="numeric"
          maxlength="6"
          placeholder="6자리 숫자"
          required
        />
        <MyButton
          type="submit"
          variant="outline"
          :disabled="!canVerify"
          :loading="checking"
        >
          확인
        </MyButton>
      </form>

      <p v-if="message" class="info-box" role="status">{{ message }}</p>
      <p v-if="errorMessage" class="error-box">{{ errorMessage }}</p>

      <form v-if="verified" class="form" @submit.prevent="changePassword">
        <div class="verified-label"><span>✓</span> 이메일 인증 완료</div>
        <MyInput
          v-model="form.currentPassword"
          label="현재 비밀번호"
          type="password"
          autocomplete="current-password"
          required
          placeholder="현재 비밀번호"
        />
        <MyInput
          v-model="form.newPassword"
          label="새 비밀번호"
          type="password"
          autocomplete="new-password"
          required
          placeholder="영문, 숫자, 특수문자 8~20자"
          :error-message="
            form.newPassword && !passwordPattern.test(form.newPassword)
              ? '영문, 숫자, !@#$만 사용하여 8~20자로 입력해 주세요.'
              : ''
          "
        />
        <MyInput
          v-model="form.newPasswordCheck"
          label="새 비밀번호 확인"
          type="password"
          autocomplete="new-password"
          required
          placeholder="새 비밀번호를 다시 입력해 주세요"
          :error-message="
            form.newPasswordCheck && form.newPassword !== form.newPasswordCheck
              ? '새 비밀번호가 일치하지 않습니다.'
              : ''
          "
        />
        <MyButton
          type="submit"
          size="large"
          block
          :disabled="!canChange"
          :loading="changing"
        >
          변경 완료
        </MyButton>
      </form>
    </div>
  </section>
</template>

<style scoped>
.password-page {
  display: grid;
  align-content: start;
  gap: 20px;
  max-width: 560px;
  margin: 0 auto;
  padding-top: 36px;
}

.verification-card {
  display: grid;
  gap: 16px;
  padding: 20px;
  background: #f6f8f2;
  border: 1px solid var(--zipda-color-border);
  border-radius: 16px;
}

.verification-card div { display: grid; gap: 6px; }
.verification-card p {
  color: var(--zipda-color-text-muted);
  font-size: 13px;
  line-height: 1.5;
}

.code-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 10px;
}

.verified-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--zipda-color-primary-active);
  font-size: 13px;
  font-weight: 700;
}

.verified-label span {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  color: white;
  background: var(--zipda-color-primary);
  border-radius: 50%;
}
</style>
