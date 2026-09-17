<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../../store/auth/useAuthStore.js";
import Header from "../../component/Header.vue";
import MyButton from "../../component/button/MyButton.vue";
import MyInput from "../../component/input/MyInput.vue";
import MyFileInput from "../../component/input/MyFileInput.vue";
import memberMessage from "../../constant/member/memberMessage.js";
import { getApiErrorMessage } from "../../constant/error/apiErrorMessage.js";
import {
  email as emailRule,
  password as passwordRule,
} from "../../util/validator/rule/userAuthRule.js";

const router = useRouter();
const authStore = useAuthStore();
const step = ref(1);
const terms = ref([]);
const agreed = reactive({});
const selectedTerm = ref(null);
const termsError = ref("");
const submitting = ref(false);
const preview = ref("");
const formError = ref("");
const form = reactive({
  email: "",
  nickname: "",
  password: "",
  passwordCheck: "",
  name: "",
  phone: "",
  profile: null,
});
const checked = reactive({
  email: { value: "", available: false, message: "" },
  nickname: { value: "", available: false, message: "" },
});
const checking = ref("");
const verification = reactive({
  id: null,
  code: "",
  verified: false,
  sending: false,
  checking: false,
  message: "",
  resendNeeded: false,
});
const verificationRemainingSeconds = ref(0);
let verificationTimer = null;
const PROFILE_IMAGE_MAX_SIZE = 10 * 1024 * 1024;
const PROFILE_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
]);
const PROFILE_IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
]);

const requiredTermsAgreed = computed(() =>
  terms.value
    .filter((term) => term.isRequired)
    .every((term) => agreed[term.termId]),
);
const allTermsAgreed = computed(
  () =>
    terms.value.length > 0 && terms.value.every((term) => agreed[term.termId]),
);
const emailAvailable = computed(
  () => checked.email.available && checked.email.value === form.email,
);
const nicknameAvailable = computed(
  () => checked.nickname.available && checked.nickname.value === form.nickname,
);
const accountReady = computed(
  () =>
    form.email &&
    form.nickname &&
    form.password &&
    form.passwordCheck &&
    emailAvailable.value &&
    nicknameAvailable.value,
);
const phone = () => form.phone.replace(/\D/g, "");
const profileReady = computed(
  () => form.name.trim().length >= 2 && /^01[016789]\d{7,8}$/.test(phone()),
);
const signupReady = computed(() => profileReady.value && !submitting.value);
const verificationRemainingTime = computed(() => {
  const minutes = Math.floor(verificationRemainingSeconds.value / 60);
  const seconds = verificationRemainingSeconds.value % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
});
const stepName = computed(
  () =>
    ["약관 동의", "로그인 정보 입력", "이메일 인증", "기본 정보 입력"][
      step.value - 1
    ],
);

const clearVerificationTimer = () => {
  if (verificationTimer) {
    window.clearInterval(verificationTimer);
    verificationTimer = null;
  }
};

const startVerificationTimer = (expiresInSeconds) => {
  clearVerificationTimer();
  verificationRemainingSeconds.value = Number(expiresInSeconds) || 5 * 60;
  verificationTimer = window.setInterval(() => {
    verificationRemainingSeconds.value = Math.max(
      verificationRemainingSeconds.value - 1,
      0,
    );
    if (verificationRemainingSeconds.value === 0) {
      clearVerificationTimer();
      verification.verified = false;
      verification.resendNeeded = true;
      verification.message = "인증 시간이 만료되었어요. 새 인증번호를 요청해 주세요.";
    }
  }, 1000);
};
const clearProfile = () => {
  if (preview.value) {
    URL.revokeObjectURL(preview.value);
  }
  preview.value = "";
  form.profile = null;
};

const handleChangeProfile = (event) => {
  const file = event?.target?.files?.[0];
  if (!file) {
    clearProfile();
    return;
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const validType = PROFILE_IMAGE_TYPES.has(file.type.toLowerCase());
  const validExtension = PROFILE_IMAGE_EXTENSIONS.has(extension);

  if (!validType || !validExtension) {
    event.target.value = "";
    clearProfile();
    formError.value =
      "프로필 사진은 JPG, JPEG, PNG, GIF, WEBP 파일만 선택할 수 있습니다.";
    return;
  }

  if (file.size > PROFILE_IMAGE_MAX_SIZE) {
    event.target.value = "";
    clearProfile();
    formError.value = "프로필 사진은 10MB 이하만 선택할 수 있습니다.";
    return;
  }

  if (preview.value) URL.revokeObjectURL(preview.value);
  preview.value = URL.createObjectURL(file);
  form.profile = file;
  formError.value = "";
};

const loadTerms = async () => {
  try {
    terms.value = await authStore.getTerms();
    terms.value.forEach((term) => {
      agreed[term.termId] = false;
    });
  } catch (error) {
    termsError.value = getApiErrorMessage(
      error,
      memberMessage.getMemberMessage("TERMS_LOAD_ERROR"),
    );
  }
};

const toggleAllTerms = () =>
  terms.value.forEach((term) => {
    agreed[term.termId] = !allTermsAgreed.value;
  });
const resetCheck = (field) => {
  checked[field].available = false;
  checked[field].value = "";
  checked[field].message = "";
};

const checkDuplicate = async (field) => {
  const value = form[field].trim();
  const validation =
    field === "email"
      ? emailRule(value)
      : value.length < 2
        ? "닉네임은 2자 이상 입력해 주세요."
        : "";
  if (validation) {
    checked[field].message = validation;
    return;
  }
  try {
    checking.value = field;
    const result = await authStore.checkDuplicate(
      field === "email" ? "EMAIL" : "NICKNAME",
      value,
    );
    checked[field].available = result.available === true;
    checked[field].value = value;
    checked[field].message = result.available
      ? "사용할 수 있습니다."
      : "이미 사용 중인 정보입니다.";
  } catch (error) {
    checked[field].message = getApiErrorMessage(
      error,
      memberMessage.getMemberMessage("DUPLICATE_CHECK_ERROR"),
    );
  } finally {
    checking.value = "";
  }
};

const sendVerification = async () => {
  const passwordError = passwordRule(form.password);
  if (
    !accountReady.value ||
    passwordError ||
    form.password !== form.passwordCheck
  ) {
    formError.value =
      passwordError ||
      (form.password !== form.passwordCheck
        ? "비밀번호와 비밀번호 확인이 일치하지 않습니다."
        : "중복 확인을 포함한 모든 정보를 입력해 주세요.");
    return;
  }
  try {
    verification.sending = true;
    const result = await authStore.sendEmailVerification(form.email);
    Object.assign(verification, {
      id: result.verificationId,
      code: "",
      verified: false,
      message: "인증번호를 이메일로 보냈습니다.",
      resendNeeded: false,
    });
    verification.id = result.verificationId;
    formError.value = "";
    startVerificationTimer(result.expiresInSeconds);
    step.value = 3;
  } catch (error) {
    formError.value = getApiErrorMessage(
      error,
      memberMessage.getMemberMessage("EMAIL_CODE_SEND_ERROR"),
    );
  } finally {
    verification.sending = false;
  }
};

const resendVerification = async () => {
  try {
    verification.sending = true;
    const result = await authStore.sendEmailVerification(form.email);
    Object.assign(verification, {
      id: result.verificationId,
      code: "",
      verified: false,
      message: "새 인증번호를 이메일로 보냈습니다.",
      resendNeeded: false,
    });
    startVerificationTimer(result.expiresInSeconds);
  } catch (error) {
    verification.message = getApiErrorMessage(
      error,
      memberMessage.getMemberMessage("EMAIL_CODE_RESEND_ERROR"),
    );
  } finally {
    verification.sending = false;
  }
};

const verifyCode = async () => {
  if (!/^\d{6}$/.test(verification.code)) {
    verification.message = "6자리 인증번호를 입력해 주세요.";
    return;
  }
  try {
    verification.checking = true;
    const result = await authStore.verifyEmailVerification(
      verification.id,
      form.email,
      verification.code,
    );
    verification.verified = result.verified === true;
    verification.message = verification.verified
      ? "이메일 인증이 완료되었습니다."
      : "인증번호를 확인해 주세요.";
    if (verification.verified) {
      clearVerificationTimer();
    }
  } catch (error) {
    verification.message = getApiErrorMessage(
      error,
      memberMessage.getMemberMessage("EMAIL_CODE_VERIFY_ERROR"),
    );
    verification.resendNeeded = true;
  } finally {
    verification.checking = false;
  }
};

const signup = async () => {
  if (!profileReady.value || submitting.value) {
    formError.value = "이름과 올바른 휴대전화 번호를 입력해 주세요.";
    return;
  }
  try {
    submitting.value = true;

    await authStore.registration({
      email: form.email,
      verificationId: verification.id,
      password: form.password,
      passwordCheck: form.passwordCheck,
      name: form.name.trim(),
      nickname: form.nickname.trim(),
      phone: phone(),
      profileFileId: null,
      termsAgreements: terms.value.map((term) => ({
        termsId: term.termId,
        version: term.termVersion,
        agreed: agreed[term.termId] === true,
      })),
    }, form.profile);
    router.replace("/sign-in");
  } catch (error) {
    formError.value = getApiErrorMessage(
      error,
      memberMessage.getMemberMessage("SIGN_UP_ERROR"),
    );
  } finally {
    submitting.value = false;
  }
};

const goBack = () => {
  if (step.value === 1) {
    router.push("/sign-in");
    return;
  }
  if (step.value === 3) {
    clearVerificationTimer();
  }
  step.value--;
};
onMounted(loadTerms);
onBeforeUnmount(() => {
  clearVerificationTimer();
  if (preview.value) URL.revokeObjectURL(preview.value);
});
</script>

<template>
  <section class="page sign-up-page">
    <Header title="회원가입" show-back @back="goBack" />
    <div class="progress">
      <span
        v-for="number in 4"
        :key="number"
        :class="{ active: number <= step }"
      ></span
      ><small>{{ step }}/4 단계</small>
    </div>
    <div class="page-content sign-up-content">
      <header class="heading">
        <p>{{ stepName }}</p>
        <h1 class="page-title">
          <template v-if="step === 1"
            >ZIPDA 이용을 위해<br />동의해 주세요</template
          ><template v-else-if="step === 2"
            >로그인 정보를<br />입력해 주세요</template
          ><template v-else-if="step === 3"
            >인증번호를<br />입력해 주세요</template
          ><template v-else>기본 정보를 입력해 주세요</template>
        </h1>
        <small v-if="step === 3"
          >{{ form.email }}로 인증번호를 보냈어요.<br />
          인증번호는 5분 이내에 입력해 주세요. (남은 시간 {{ verificationRemainingTime }})</small
        ><small v-else-if="step === 4">프로필 사진은 선택 사항입니다.</small>
      </header>

      <section v-if="step === 1" class="step-content">
        <p v-if="termsError" class="text-error">{{ termsError }}</p>
        <div v-else class="terms">
          <button
            type="button"
            class="all-agree"
            :class="{ checked: allTermsAgreed }"
            @click="toggleAllTerms"
          >
            <i>✓</i> 전체 동의하기</button
          ><label v-for="term in terms" :key="term.termId" class="term"
            ><input v-model="agreed[term.termId]" type="checkbox" /><i>✓</i
            ><span
              >[{{ term.isRequired ? "필수" : "선택" }}] {{ term.title }}</span
            ><button
              type="button"
              @click.prevent="selectedTerm = term"
              class="termSpecButton"
            >
              ›
            </button></label
          >
        </div>
        <div class="bottom-action">
          <MyButton
            block
            size="large"
            :disabled="!requiredTermsAgreed"
            @click="step = 2"
            >동의하고 계속하기</MyButton
          >
        </div>
      </section>
      <form
        v-else-if="step === 2"
        class="form step-content"
        @submit.prevent="sendVerification"
      >
        <MyInput
          v-model="form.email"
          label="이메일"
          type="email"
          placeholder="example@gmail.com"
          required
          @update:model-value="resetCheck('email')"
        >
          <template #trailing>
            <button
              class="input-check-button"
              type="button"
              :disabled="checking === 'email'"
              @click="checkDuplicate('email')"
            >
              {{ checking === "email" ? "확인 중" : "중복 확인" }}
            </button>
          </template>
        </MyInput>
        <p
          v-if="checked.email.message"
          :class="checked.email.available ? 'text-success' : 'text-error'"
        >
          {{ checked.email.message }}
        </p>
        <MyInput
          v-model="form.nickname"
          label="닉네임"
          placeholder="닉네임 입력 (2~10자)"
          maxlength="10"
          required
          @update:model-value="resetCheck('nickname')"
        >
          <template #trailing>
            <button
              class="input-check-button"
              type="button"
              :disabled="checking === 'nickname'"
              @click="checkDuplicate('nickname')"
            >
              {{ checking === "nickname" ? "확인 중" : "중복 확인" }}
            </button>
          </template>
        </MyInput>
        <p
          v-if="checked.nickname.message"
          :class="checked.nickname.available ? 'text-success' : 'text-error'"
        >
          {{ checked.nickname.message }}
        </p>
        <MyInput
          v-model="form.password"
          label="비밀번호"
          type="password"
          placeholder="영문, 숫자, 특수문자 포함 8자 이상"
          required
        /><MyInput
          v-model="form.passwordCheck"
          label="비밀번호 확인"
          type="password"
          placeholder="비밀번호를 다시 입력해 주세요"
          required
        />
        <p v-if="formError" class="text-error">{{ formError }}</p>
        <div class="bottom-action">
          <MyButton
            type="submit"
            block
            size="large"
            :disabled="!accountReady"
            :loading="verification.sending"
            loading-text="보내는 중"
            >다음</MyButton
          >
        </div>
      </form>

      <section v-else-if="step === 3" class="form step-content">
        <MyInput
          v-model="verification.code"
          label="인증번호"
          placeholder="6자리 숫자"
          inputmode="numeric"
          maxlength="6"
          required
        >
          <template #trailing>
            <button
              class="input-check-button"
              type="button"
              :disabled="verification.checking"
              @click="verifyCode"
            >
              {{ verification.checking ? "확인 중" : "확인" }}
            </button>
          </template>
        </MyInput>
        <p
          v-if="verification.message"
          :class="verification.verified ? 'text-success' : 'text-error'"
        >
          {{ verification.message }}
        </p>
        <MyButton
          type="button"
          variant="text"
          size="small"
          :loading="verification.sending"
          @click="resendVerification"
          >{{
            verification.resendNeeded
              ? "새 인증번호 보내기"
              : "인증번호 다시 보내기"
          }}</MyButton
        >
        <div class="bottom-action">
          <MyButton
            block
            size="large"
            :disabled="!verification.verified"
            @click="step = 4"
            >다음</MyButton
          >
        </div>
      </section>

      <form v-else class="form step-content" @submit.prevent="signup">
        <div class="profile">
          <span class="profile-preview">
            <img
              v-if="preview"
              :src="preview"
              alt="선택한 프로필 사진 미리보기"
            />
            <span v-else aria-hidden="true">♙</span>
          </span>
          <MyFileInput
            v-model="form.profile"
            label="프로필 사진"
            button-text="이미지 선택"
            accept=".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp"
            :max-size="PROFILE_IMAGE_MAX_SIZE"
            :disabled="submitting"
            @change="handleChangeProfile"
            helper-text="선택 사항 · JPG, JPEG, PNG, GIF, WEBP · 최대 10MB"
          />
        </div>
        <MyInput
          v-model="form.name"
          label="이름"
          placeholder="홍길동"
          required
        /><MyInput
          v-model="form.phone"
          label="휴대전화 번호"
          placeholder="01012345678"
          inputmode="tel"
          maxlength="11"
          required
        />
        <p v-if="formError" class="text-error">{{ formError }}</p>
        <div class="bottom-action">
          <MyButton
            type="submit"
            block
            size="large"
            :disabled="!signupReady"
            :loading="submitting"
            loading-text="가입 처리 중"
            >가입 완료</MyButton
          >
        </div>
      </form>
    </div>
    <div
      v-if="selectedTerm"
      class="modal-backdrop"
      @click.self="selectedTerm = null"
    >
      <section class="modal" role="dialog" aria-modal="true">
        <header>
          <h2>{{ selectedTerm.title }}</h2>
          <MyButton
            variant="text"
            size="small"
            @click="selectedTerm = null"
            class="termSpecButton"
            >닫기</MyButton
          >
        </header>
        <p>{{ selectedTerm.content }}</p>
      </section>
    </div>
  </section>
</template>

<style scoped>
.termSpecButton {
  width: auto;
}

.sign-up-page {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}
.progress {
  display: grid;
  grid-template-columns: repeat(4, 1fr) auto;
  align-items: center;
  gap: 4px;
  padding: 14px 20px 0;
}
.progress span {
  height: 3px;
  background: var(--zipda-color-border);
  border-radius: 8px;
}
.progress .active {
  background: var(--zipda-color-primary);
}
.progress small {
  margin-left: 6px;
  color: var(--zipda-color-primary);
  font-size: 11px;
  white-space: nowrap;
}
.sign-up-content {
  display: flex;
  flex: 1;
  flex-direction: column;
  padding-top: 30px;
}
.heading {
  display: grid;
  gap: 7px;
}
.heading > p {
  color: var(--zipda-color-primary);
  font-size: 13px;
  font-weight: 700;
}
.heading small {
  color: var(--zipda-color-text-muted);
  font-size: 12px;
}
.step-content {
  margin-top: 28px;
}
.terms {
  display: grid;
  gap: 8px;
}
.all-agree,
.term {
  display: flex;
  align-items: center;
  min-height: 48px;
  border-radius: var(--zipda-radius-medium);
}
.all-agree {
  gap: 10px;
  padding: 0 14px;
  color: var(--zipda-color-primary-active);
  background: var(--zipda-color-primary-light);
  border: 0;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
.term {
  position: relative;
  gap: 10px;
  padding: 0 4px;
  cursor: pointer;
}
.term input {
  position: absolute;
  opacity: 0;
}
.terms i {
  display: grid;
  place-items: center;
  flex: 0 0 18px;
  width: 18px;
  height: 18px;
  color: transparent;
  background: #fff;
  border: 1px solid var(--zipda-color-border);
  border-radius: 5px;
  font-size: 12px;
  font-style: normal;
}
.checked i,
.term input:checked + i {
  color: #fff;
  background: var(--zipda-color-primary);
  border-color: var(--zipda-color-primary);
}
.term span {
  flex: 1;
  font-size: 13px;
}
.term button {
  width: 30px;
  color: var(--zipda-color-primary);
  background: transparent;
  border: 0;
  font-size: 24px;
  cursor: pointer;
}
.input-check-button {
  flex: 0 0 auto;
  margin-left: 10px;
  padding: 4px 2px;
  color: var(--zipda-color-text-muted);
  background: transparent;
  border: 0;
  border-radius: 4px;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
}
.input-check-button:hover:not(:disabled),
.input-check-button:focus-visible {
  color: var(--zipda-color-primary);
}
.input-check-button:focus-visible {
  outline: 2px solid var(--zipda-color-primary);
  outline-offset: 2px;
}
.input-check-button:disabled {
  cursor: wait;
  opacity: 0.5;
}
.text-success {
  color: var(--zipda-color-primary-active);
  font-size: 12px;
}
.text-error {
  font-size: 12px;
  line-height: 1.5;
}
.bottom-action {
  position: sticky;
  bottom: 0;
  margin: 0 calc(var(--zipda-page-padding) * -1) -40px;
  padding: 12px var(--zipda-page-padding)
    calc(12px + env(safe-area-inset-bottom));
  background: linear-gradient(to bottom, transparent, #fff 18%);
}
.profile {
  display: grid;
  justify-items: center;
  gap: 16px;
}
.profile > span {
  display: grid;
  place-items: center;
  width: 88px;
  height: 88px;
  color: var(--zipda-color-primary);
  background: var(--zipda-color-primary-light);
  border-radius: 50%;
  font-size: 30px;
}
.profile-preview {
  overflow: hidden;
}
.profile-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: end center;
  padding: 20px;
  background: rgb(0 0 0 / 35%);
}
.modal {
  width: min(100%, 520px);
  max-height: 70dvh;
  padding: 20px;
  overflow: auto;
  background: #fff;
  border-radius: var(--zipda-radius-large);
}
.modal header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.modal h2 {
  font-size: 18px;
}
.modal p {
  white-space: pre-wrap;
  font-size: 14px;
  line-height: 1.7;
}
:deep(.my-button--large) {
  min-height: 52px;
  border-radius: var(--zipda-radius-large);
}
@media (min-width: 768px) {
  .sign-up-content,
  .progress {
    width: 100%;
    max-width: 560px;
    margin-left: auto;
    margin-right: auto;
  }
}
</style>
ate>ate>ate>
