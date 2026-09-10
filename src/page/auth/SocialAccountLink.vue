<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import Header from "../../component/Header.vue";
import MyButton from "../../component/button/MyButton.vue";
import MyInput from "../../component/input/MyInput.vue";
import { useAuthStore } from "../../store/auth/useAuthStore.js";

const router = useRouter();
const authStore = useAuthStore();
const context = ref(null);
const form = reactive({ password: "", agreed: false });
const loading = ref(true);
const submitting = ref(false);
const errorMessage = ref("");
const canSubmit = computed(() => form.password.length > 0 && form.agreed);

const readError = (error, fallback) =>
  error?.response?.data?.message || error?.response?.data?.data || fallback;

const loadContext = async () => {
  try {
    context.value = await authStore.getSocialSignupContext();
  } catch (error) {
    errorMessage.value = readError(
      error,
      "카카오 인증 정보가 만료되었습니다. 다시 로그인해 주세요.",
    );
  } finally {
    loading.value = false;
  }
};

const submitLink = async () => {
  if (!canSubmit.value || submitting.value) return;
  try {
    submitting.value = true;
    errorMessage.value = "";
    await authStore.linkSocialAccount(form);
    const success = await authStore.reissue();
    if (!success) throw new Error("토큰 발급 실패");
    await router.replace("/main");
  } catch (error) {
    errorMessage.value = readError(
      error,
      "기존 계정의 비밀번호를 확인해 주세요.",
    );
  } finally {
    submitting.value = false;
  }
};

onMounted(loadContext);
</script>

<template>
  <section class="page social-link-page">
    <Header title="계정 연결" show-back @click="router.push('/sign-in')" />
    <div class="page-content social-link-content">
      <header class="heading">
        <p>카카오 계정 연결</p>
        <h1 class="page-title">기존 ZIPDA 계정과<br />연결해 주세요</h1>
        <small>같은 이메일로 가입된 계정을 찾았어요.</small>
      </header>

      <p v-if="loading" class="info-box">계정 정보를 확인하고 있어요.</p>
      <form v-else-if="context" class="form" @submit.prevent="submitLink">
        <MyInput
          :model-value="context.email"
          label="카카오계정 이메일"
          type="email"
          readonly
        />
        <MyInput
          v-model="form.password"
          label="기존 ZIPDA 비밀번호"
          type="password"
          autocomplete="current-password"
          placeholder="비밀번호를 입력해 주세요"
          required
        />
        <label class="link-consent">
          <input v-model="form.agreed" type="checkbox" />
          <span>기존 ZIPDA 계정에 카카오 계정을 연결하는 데 동의합니다.</span>
        </label>
        <p v-if="errorMessage" class="text-error" role="alert">
          {{ errorMessage }}
        </p>
        <div class="bottom-action">
          <MyButton
            type="submit"
            block
            size="large"
            :disabled="!canSubmit"
            :loading="submitting"
            loading-text="연결 중"
          >
            계정 연결하고 로그인
          </MyButton>
        </div>
      </form>
      <div v-else class="error-state">
        <p class="error-box" role="alert">{{ errorMessage }}</p>
        <MyButton block @click="router.replace('/sign-in')">
          다시 로그인하기
        </MyButton>
      </div>
    </div>
  </section>
</template>

<style scoped>
.social-link-page {
  min-height: 100dvh;
}

.social-link-content {
  padding-top: 30px;
}

.heading {
  display: grid;
  gap: 7px;
  margin-bottom: 28px;
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

.link-consent {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px;
  background: var(--zipda-color-primary-light);
  border-radius: var(--zipda-radius-medium);
  font-size: 13px;
  line-height: 1.5;
  cursor: pointer;
}

.link-consent input {
  margin-top: 2px;
  accent-color: var(--zipda-color-primary);
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
</style>

