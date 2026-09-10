<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../../store/auth/useAuthStore.js";
import { useFileStore } from "../../store/file/useFileStore.js";
import { useMyErrorStore } from "../../store/error/useMyErrorStore.js";
import Header from "../../component/Header.vue";
import MyButton from "../../component/button/MyButton.vue";
import MyInput from "../../component/input/MyInput.vue";
import {
  email as emailRule,
  password as passwordRule,
} from "../../util/validator/rule/userAuthRule.js";

const router = useRouter();
const authStore = useAuthStore();
const fileStore = useFileStore();
const myErrorStore = useMyErrorStore();
const step = ref(1);
const terms = ref([]);
const agreed = reactive({});
const selectedTerm = ref(null);
const termsError = ref("");
const submitting = ref(false);
const profileUploading = ref(false);
const preview = ref("");
const formError = ref("");
const form = reactive({
  email: "",
  nickname: "",
  password: "",
  passwordCheck: "",
  name: "",
  phone: "",
  profileFileId: null,
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
const stepName = computed(
  () =>
    ["약관 동의", "로그인 정보 입력", "이메일 인증", "기본 정보 입력"][
      step.value - 1
    ],
);
const errorMessage = (error, fallback) =>
  error?.response?.data?.data || error?.response?.data?.message || fallback;

const handleChangeProfile = async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  if (file.size > 10 * 1024 * 1024) {
    formError.value = "프로필 사진은 최대 10MB까지 업로드할 수 있습니다.";
    event.target.value = "";
    return;
  }

  if (preview.value) {
    URL.revokeObjectURL(preview.value);
    preview.value = "";
  }

  try {
    profileUploading.value = true;
    const uploadedFile = await fileStore.uploadProfile(file);
    form.profileFileId = uploadedFile.fileId;
    preview.value = URL.createObjectURL(file);
    formError.value = "";
  } catch (error) {
    form.profileFileId = null;
    event.target.value = "";
    if (myErrorStore.redirectErrorPage(error)) return;
    formError.value = errorMessage(
      error,
      "프로필 사진 업로드에 실패했습니다. 다시 시도해 주세요.",
    );
  } finally {
    profileUploading.value = false;
  }
};

const loadTerms = async () => {
  try {
    terms.value = await authStore.getTerms();
    terms.value.forEach((term) => {
      agreed[term.termId] = false;
    });
  } catch (error) {
    termsError.value = errorMessage(
      error,
      "약관을 불러오지 못했습니다. 다시 시도해 주세요.",
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
    checked[field].message = errorMessage(error, "중복 확인에 실패했습니다.");
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
    step.value = 3;
  } catch (error) {
    formError.value = errorMessage(error, "인증번호 전송에 실패했습니다.");
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
  } catch (error) {
    verification.message = errorMessage(
      error,
      "인증번호를 다시 보내지 못했습니다.",
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
  } catch (error) {
    verification.message = errorMessage(error, "인증번호를 확인해 주세요.");
    verification.resendNeeded = /5|횟수|attempt/i.test(verification.message);
  } finally {
    verification.checking = false;
  }
};

const signup = async () => {
  if (profileUploading.value) {
    formError.value = "프로필 사진 업로드가 끝날 때까지 기다려 주세요.";
    return;
  }
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
      profileFileId:
        form.profileFileId == null ? null : String(form.profileFileId),
      termsAgreements: terms.value.map((term) => ({
        termsId: term.termId,
        version: term.termVersion,
        agreed: agreed[term.termId] === true,
      })),
    });
    router.replace("/sign-in");
  } catch (error) {
    formError.value = errorMessage(
      error,
      "회원가입에 실패했습니다. 다시 시도해 주세요.",
    );
  } finally {
    submitting.value = false;
  }
};

const goBack = () =>
  step.value === 1 ? router.push("/sign-in") : step.value--;
onMounted(loadTerms);
onBeforeUnmount(() => {
  if (preview.value) URL.revokeObjectURL(preview.value);
});
</script>

<template>
  <section class="page sign-up-page">
    <Header title="회원가입" show-back @click="goBack" />
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
        <small v-if="step === 3">{{ form.email }}로 인증번호를 보냈어요.</small
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
        <div class="with-button">
          <MyInput
            v-model="form.email"
            label="이메일"
            type="email"
            placeholder="example@email.com"
            required
            @update:model-value="resetCheck('email')"
          />
          <MyButton
            type="button"
            size="small"
            variant="secondary"
            :loading="checking === 'email'"
            @click="checkDuplicate('email')"
            >중복 확인</MyButton
          >
        </div>
        <p
          v-if="checked.email.message"
          :class="checked.email.available ? 'text-success' : 'text-error'"
        >
          {{ checked.email.message }}
        </p>
        <div class="with-button">
          <MyInput
            v-model="form.nickname"
            label="닉네임"
            placeholder="닉네임 입력 (2~10자)"
            maxlength="10"
            required
            @update:model-value="resetCheck('nickname')"
          />
          <MyButton
            type="button"
            size="small"
            variant="secondary"
            :loading="checking === 'nickname'"
            @click="checkDuplicate('nickname')"
            >중복 확인</MyButton
          >
        </div>
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
        <div class="with-button">
          <MyInput
            v-model="verification.code"
            label="인증번호"
            placeholder="6자리 숫자"
            inputmode="numeric"
            maxlength="6"
            required
          />
          <MyButton
            type="button"
            size="small"
            :loading="verification.checking"
            @click="verifyCode"
            >확인</MyButton
          >
        </div>
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
          <label class="profile-file-label" for="profile-file"
            >프로필 사진</label
          >
          <input
            id="profile-file"
            type="file"
            accept="image/*"
            :disabled="profileUploading"
            @change="handleChangeProfile"
          />
          <small>{{
            profileUploading ? "업로드 중..." : "선택 사항 · 최대 10MB"
          }}</small>
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
            :disabled="!profileReady || profileUploading"
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
.with-button {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: end;
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
.profile-file-label {
  font-size: 14px;
  font-weight: 700;
}
.profile input[type="file"] {
  max-width: 100%;
}
.profile small {
  color: var(--zipda-color-text-muted);
  font-size: 12px;
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
  width: min(100%, 344px);
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
:deep(.app-header) {
  position: static;
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

