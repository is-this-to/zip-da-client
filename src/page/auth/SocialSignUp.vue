<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import Header from "../../component/Header.vue";
import MyButton from "../../component/button/MyButton.vue";
import MyInput from "../../component/input/MyInput.vue";
import { useAuthStore } from "../../store/auth/useAuthStore.js";

const router = useRouter();
const authStore = useAuthStore();
const step = ref(1);
const context = ref(null);
const terms = ref([]);
const agreed = reactive({});
const selectedTerm = ref(null);
const loading = ref(true);
const checkingNickname = ref(false);
const submitting = ref(false);
const pageError = ref("");
const formError = ref("");
const nicknameCheck = reactive({ value: "", available: false, message: "" });
const form = reactive({ nickname: "", name: "", phone: "" });

const requiredTermsAgreed = computed(() =>
  terms.value
    .filter((term) => term.isRequired)
    .every((term) => agreed[term.termId]),
);
const allTermsAgreed = computed(
  () =>
    terms.value.length > 0 && terms.value.every((term) => agreed[term.termId]),
);
const nicknameAvailable = computed(
  () => nicknameCheck.available && nicknameCheck.value === form.nickname.trim(),
);
const normalizedPhone = computed(() => form.phone.replace(/\D/g, ""));
const formReady = computed(
  () =>
    form.name.trim().length >= 2 &&
    /^[가-힣a-zA-Z0-9_]{2,10}$/.test(form.nickname.trim()) &&
    nicknameAvailable.value &&
    /^01[016789]\d{7,8}$/.test(normalizedPhone.value),
);

const readError = (error, fallback) =>
  error?.response?.data?.message || error?.response?.data?.data || fallback;

const loadPage = async () => {
  try {
    const [signupContext, activeTerms] = await Promise.all([
      authStore.getSocialSignupContext(),
      authStore.getTerms(),
    ]);
    context.value = signupContext;
    form.nickname = signupContext.nickname || "";
    terms.value = activeTerms;
    activeTerms.forEach((term) => {
      agreed[term.termId] = false;
    });
  } catch (error) {
    pageError.value = readError(
      error,
      "카카오 회원가입 정보를 불러오지 못했습니다. 다시 로그인해 주세요.",
    );
  } finally {
    loading.value = false;
  }
};

const toggleAllTerms = () => {
  const nextValue = !allTermsAgreed.value;
  terms.value.forEach((term) => {
    agreed[term.termId] = nextValue;
  });
};

const resetNicknameCheck = () => {
  nicknameCheck.available = false;
  nicknameCheck.value = "";
  nicknameCheck.message = "";
};

const checkNickname = async () => {
  const nickname = form.nickname.trim();
  if (!/^[가-힣a-zA-Z0-9_]{2,10}$/.test(nickname)) {
    nicknameCheck.message =
      "닉네임은 한글, 영문, 숫자, 밑줄 2~10자로 입력해 주세요.";
    return;
  }
  try {
    checkingNickname.value = true;
    const result = await authStore.checkDuplicate("NICKNAME", nickname);
    nicknameCheck.available = result.available === true;
    nicknameCheck.value = nickname;
    nicknameCheck.message = result.available
      ? "사용할 수 있는 닉네임입니다."
      : "이미 사용 중인 닉네임입니다.";
  } catch (error) {
    nicknameCheck.message = readError(
      error,
      "닉네임 중복 확인에 실패했습니다.",
    );
  } finally {
    checkingNickname.value = false;
  }
};

const submitSignup = async () => {
  if (!formReady.value || submitting.value) {
    formError.value = "닉네임 중복 확인과 필수 정보를 모두 입력해 주세요.";
    return;
  }
  try {
    submitting.value = true;
    formError.value = "";
    await authStore.socialRegistration({
      name: form.name.trim(),
      nickname: form.nickname.trim(),
      phone: normalizedPhone.value,
      termsAgreements: terms.value.map((term) => ({
        termsId: term.termId,
        version: term.termVersion,
        agreed: agreed[term.termId] === true,
      })),
    });
    const success = await authStore.reissue();
    if (!success) throw new Error("가입 후 토큰 발급 실패");
    await router.replace("/main");
  } catch (error) {
    formError.value = readError(error, "카카오 회원가입에 실패했습니다.");
  } finally {
    submitting.value = false;
  }
};

const goBack = () => {
  if (step.value === 1) router.push("/sign-in");
  else step.value = 1;
};

onMounted(loadPage);
</script>

<template>
  <section class="page social-sign-up-page">
    <Header title="카카오 회원가입" show-back @click="goBack" />
    <div class="progress">
      <span
        v-for="number in 2"
        :key="number"
        :class="{ active: number <= step }"
      ></span>
      <small>{{ step }}/2 단계</small>
    </div>

    <div class="page-content social-sign-up-content">
      <p v-if="loading" class="info-box">가입 정보를 불러오고 있어요.</p>
      <div v-else-if="pageError" class="error-state">
        <p class="error-box" role="alert">{{ pageError }}</p>
        <MyButton block @click="authStore.startKakaoLogin()">
          카카오 로그인 다시 하기
        </MyButton>
      </div>

      <template v-else>
        <header class="heading">
          <p>{{ step === 1 ? "약관 동의" : "추가 정보 입력" }}</p>
          <h1 v-if="step === 1" class="page-title">
            ZIPDA 이용을 위해<br />동의해 주세요
          </h1>
          <h1 v-else class="page-title">
            가입에 필요한 정보를<br />확인해 주세요
          </h1>
          <small v-if="step === 2">
            카카오 이메일은 인증 없이 그대로 사용됩니다.
          </small>
        </header>

        <section v-if="step === 1" class="step-content">
          <div class="terms">
            <button
              type="button"
              class="all-agree"
              :class="{ checked: allTermsAgreed }"
              @click="toggleAllTerms"
            >
              <i>✓</i> 전체 동의하기
            </button>
            <label v-for="term in terms" :key="term.termId" class="term">
              <input v-model="agreed[term.termId]" type="checkbox" />
              <i>✓</i>
              <span>
                [{{ term.isRequired ? "필수" : "선택" }}] {{ term.title }}
              </span>
              <button type="button" @click.prevent="selectedTerm = term">
                ›
              </button>
            </label>
          </div>
          <div class="bottom-action">
            <MyButton
              block
              size="large"
              :disabled="!requiredTermsAgreed"
              @click="step = 2"
            >
              동의하고 계속하기
            </MyButton>
          </div>
        </section>

        <form v-else class="form step-content" @submit.prevent="submitSignup">
          <div class="social-profile">
            <img
              v-if="context.profileImageUrl"
              :src="context.profileImageUrl"
              alt="카카오 프로필"
              referrerpolicy="no-referrer"
            />
            <span v-else aria-hidden="true">♙</span>
            <p>
              {{
                context.profileImageUrl
                  ? "카카오 프로필 사진"
                  : "프로필 사진 미동의"
              }}
            </p>
          </div>
          <MyInput
            :model-value="context.email"
            label="카카오계정 이메일"
            type="email"
            readonly
          />
          <div class="with-button">
            <MyInput
              v-model="form.nickname"
              label="닉네임"
              maxlength="10"
              required
              @update:model-value="resetNicknameCheck"
            />
            <MyButton
              type="button"
              size="small"
              variant="secondary"
              :loading="checkingNickname"
              @click="checkNickname"
            >
              중복 확인
            </MyButton>
          </div>
          <p
            v-if="nicknameCheck.message"
            :class="nicknameCheck.available ? 'text-success' : 'text-error'"
          >
            {{ nicknameCheck.message }}
          </p>
          <MyInput
            v-model="form.name"
            label="이름"
            placeholder="홍길동"
            required
          />
          <MyInput
            v-model="form.phone"
            label="휴대전화 번호"
            placeholder="01012345678"
            inputmode="tel"
            maxlength="11"
            required
          />
          <p v-if="formError" class="text-error" role="alert">
            {{ formError }}
          </p>
          <div class="bottom-action">
            <MyButton
              type="submit"
              block
              size="large"
              :disabled="!formReady"
              :loading="submitting"
              loading-text="가입 처리 중"
            >
              가입 완료
            </MyButton>
          </div>
        </form>
      </template>
    </div>

    <div
      v-if="selectedTerm"
      class="modal-backdrop"
      @click.self="selectedTerm = null"
    >
      <section class="modal" role="dialog" aria-modal="true">
        <header>
          <h2>{{ selectedTerm.title }}</h2>
          <MyButton variant="text" size="small" @click="selectedTerm = null">
            닫기
          </MyButton>
        </header>
        <p>{{ selectedTerm.content }}</p>
      </section>
    </div>
  </section>
</template>

<style scoped>
.social-sign-up-page {
  min-height: 100dvh;
}

.progress {
  display: grid;
  grid-template-columns: repeat(2, 1fr) auto;
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
}

.social-sign-up-content {
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
  align-items: end;
  gap: 8px;
}

.text-success {
  color: var(--zipda-color-primary-active);
  font-size: 12px;
}

.text-error {
  font-size: 12px;
  line-height: 1.5;
}

.social-profile {
  display: grid;
  justify-items: center;
  gap: 8px;
  color: var(--zipda-color-text-muted);
  font-size: 12px;
}

.social-profile img,
.social-profile > span {
  display: grid;
  place-items: center;
  width: 88px;
  height: 88px;
  object-fit: cover;
  color: var(--zipda-color-primary);
  background: var(--zipda-color-primary-light);
  border-radius: 50%;
  font-size: 30px;
}

.bottom-action {
  position: sticky;
  bottom: 0;
  margin: 20px calc(var(--zipda-page-padding) * -1) -40px;
  padding: 12px var(--zipda-page-padding)
    calc(12px + env(safe-area-inset-bottom));
  background: linear-gradient(to bottom, transparent, #fff 18%);
}

.error-state {
  display: grid;
  gap: 16px;
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
  align-items: center;
  justify-content: space-between;
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
</style>

