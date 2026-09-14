<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import Header from "../../component/Header.vue";
import MyButton from "../../component/button/MyButton.vue";
import MyInput from "../../component/input/MyInput.vue";
import ProfileImagePicker from "../../component/input/ProfileImagePicker.vue";
import memberMessage from "../../constants/memberMessage.js";
import { useMemberStore } from "../../store/member/member.js";

const router = useRouter();
const memberStore = useMemberStore();
const form = reactive({ nickname: "", phone: "", name: "" });
const initialForm = reactive({ nickname: "", phone: "", name: "" });
const nicknameCheck = reactive({
  checkedValue: "",
  available: false,
  message: "",
});
const selectedFile = ref(null);
const removeImage = ref(false);
const checkingNickname = ref(false);
const errorMessage = ref("");
const successMessage = ref("");

const profile = computed(() => memberStore.memberProfile || {});
const validName = computed(() => {
  const name = form.name.trim();
  return name.length >= 2 && name.length <= 50;
});
const validNickname = computed(() =>
  /^[가-힣A-Za-z0-9_]{2,10}$/.test(form.nickname.trim()),
);
const validPhone = computed(() => /^01[016789]\d{7,8}$/.test(form.phone));
const nameChanged = computed(() => form.name.trim() !== initialForm.name);
const nicknameChanged = computed(
  () => form.nickname.trim() !== initialForm.nickname,
);
const phoneChanged = computed(() => form.phone !== initialForm.phone);
const imageChanged = computed(
  () =>
    Boolean(selectedFile.value) ||
    (removeImage.value &&
      Boolean(profile.value.profileFileId || profile.value.profileImageUrl)),
);
const hasChanges = computed(
  () =>
    nameChanged.value ||
    nicknameChanged.value ||
    phoneChanged.value ||
    imageChanged.value,
);
const nicknameChecked = computed(
  () =>
    !nicknameChanged.value ||
    (nicknameCheck.available &&
      nicknameCheck.checkedValue === form.nickname.trim()),
);
const canCheckNickname = computed(
  () =>
    nicknameChanged.value && validNickname.value && !checkingNickname.value,
);
const canSubmit = computed(
  () =>
    validName.value &&
    validNickname.value &&
    validPhone.value &&
    hasChanges.value &&
    nicknameChecked.value &&
    !checkingNickname.value &&
    !memberStore.savingProfile,
);

const applyProfile = (data) => {
  const values = {
    name: data.name || "",
    nickname: data.nickname || "",
    phone: (data.phone || "").replace(/-/g, ""),
  };
  Object.assign(form, values);
  Object.assign(initialForm, values);
  Object.assign(nicknameCheck, {
    checkedValue: "",
    available: false,
    message: "",
  });
};

const loadProfile = async () => {
  try {
    applyProfile(await memberStore.getMyProfile());
  } catch {
    errorMessage.value = memberMessage.getMemberMessage("PROFILE_LOAD_ERROR");
  }
};

const setFile = (file) => {
  selectedFile.value = file;
  removeImage.value = false;
  successMessage.value = "";
};

const removeCurrentImage = () => {
  selectedFile.value = null;
  removeImage.value = true;
  successMessage.value = "";
};

const handleFieldChange = () => {
  successMessage.value = "";
};

const handleNicknameChange = () => {
  Object.assign(nicknameCheck, {
    checkedValue: "",
    available: false,
    message: "",
  });
  handleFieldChange();
};

const checkNickname = async () => {
  if (!canCheckNickname.value) return;

  checkingNickname.value = true;
  errorMessage.value = "";
  const nickname = form.nickname.trim();
  try {
    const result = await memberStore.checkNicknameDuplicate(nickname);
    nicknameCheck.checkedValue = nickname;
    nicknameCheck.available = result.available === true;
    nicknameCheck.message = nicknameCheck.available
      ? "사용할 수 있는 닉네임입니다."
      : "이미 사용 중인 닉네임입니다.";
  } catch {
    nicknameCheck.checkedValue = "";
    nicknameCheck.available = false;
    nicknameCheck.message = memberMessage.getMemberMessage(
      "DUPLICATE_CHECK_ERROR",
    );
  } finally {
    checkingNickname.value = false;
  }
};

const saveProfile = async () => {
  if (!canSubmit.value) return;
  errorMessage.value = "";
  successMessage.value = "";
  try {
    let profileFileId;
    let profileImageAction = "KEEP";
    if (selectedFile.value) {
      const uploaded = await memberStore.uploadMyProfileImage(
        selectedFile.value,
      );
      profileFileId = String(uploaded.fileId);
      profileImageAction = "REPLACE";
    } else if (removeImage.value) {
      profileImageAction = "REMOVE";
    }

    const request = { profileImageAction };
    if (nameChanged.value) request.name = form.name.trim();
    if (nicknameChanged.value) request.nickname = form.nickname.trim();
    if (phoneChanged.value) request.phone = form.phone;
    if (profileFileId) request.profileFileId = profileFileId;

    const updated = await memberStore.updateMyProfile(request);
    selectedFile.value = null;
    removeImage.value = false;
    applyProfile(updated);
    successMessage.value = "프로필이 변경되었습니다.";
  } catch {
    errorMessage.value = memberMessage.getMemberMessage("PROFILE_SAVE_ERROR");
  }
};

onMounted(loadProfile);
</script>

<template>
  <section class="page">
    <Header title="프로필 수정" show-back back-to="/mypage" />
    <form class="page-content profile-form" @submit.prevent="saveProfile">
      <ProfileImagePicker
        :current-url="profile.profileImageUrl || ''"
        :removed="removeImage"
        :name="profile.name || profile.nickname || '회원'"
        @update:file="setFile"
        @remove="removeCurrentImage"
      />

      <section class="field-group">
        <MyInput
          v-model="form.name"
          label="이름"
          :maxlength="50"
          autocomplete="name"
          placeholder="2~50자의 이름"
          :error-message="
            form.name && !validName ? '이름을 2~50자로 입력해 주세요.' : ''
          "
          @update:model-value="handleFieldChange"
        />
        <MyInput
          v-model="form.nickname"
          label="닉네임"
          :maxlength="10"
          placeholder="2~10자의 닉네임"
          :error-message="
            form.nickname && !validNickname
              ? '한글, 영문, 숫자, 밑줄로 2~10자 입력해 주세요.'
              : ''
          "
          :helper-text="
            nicknameChanged && !nicknameCheck.message
              ? '변경한 닉네임은 중복 확인이 필요합니다.'
              : ''
          "
          @update:model-value="handleNicknameChange"
        >
          <template #trailing>
            <button
              type="button"
              class="nickname-check-button"
              :disabled="!canCheckNickname"
              @click="checkNickname"
            >
              {{ checkingNickname ? "확인 중" : "중복 확인" }}
            </button>
          </template>
        </MyInput>
        <p
          v-if="nicknameCheck.message"
          class="field-message"
          :class="
            nicknameCheck.available
              ? 'field-message--success'
              : 'field-message--error'
          "
          role="status"
        >
          {{ nicknameCheck.message }}
        </p>
        <MyInput
          v-model="form.phone"
          label="휴대폰 번호"
          inputmode="numeric"
          :maxlength="11"
          placeholder="01012345678"
          :error-message="
            form.phone && !validPhone
              ? '휴대폰 번호를 숫자만 입력해 주세요.'
              : ''
          "
          helper-text="현재는 별도 휴대폰 인증 없이 변경됩니다."
          @update:model-value="handleFieldChange"
        />
      </section>

      <p v-if="errorMessage" class="error-box">{{ errorMessage }}</p>
      <p v-if="successMessage" class="info-box" role="status">
        {{ successMessage }}
      </p>

      <div class="form-actions">
        <MyButton
          type="submit"
          size="large"
          block
          :disabled="!canSubmit"
          :loading="memberStore.savingProfile"
        >
          저장하기
        </MyButton>
      </div>
    </form>
  </section>
</template>

<style scoped>
.profile-form {
  display: grid;
  gap: 30px;
  max-width: 560px;
  margin: 0 auto;
  padding-top: 38px;
}

.form-actions {
  margin-top: 16px;
}

.nickname-check-button {
  flex: 0 0 auto;
  margin-left: 10px;
  padding: 4px 2px;
  color: var(--zipda-color-primary);
  background: transparent;
  border: 0;
  border-radius: 4px;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
}

.nickname-check-button:disabled {
  color: var(--zipda-color-text-muted);
  cursor: not-allowed;
  opacity: 0.55;
}

.nickname-check-button:focus-visible {
  outline: 2px solid var(--zipda-color-primary);
  outline-offset: 2px;
}

.field-message {
  margin-top: -6px;
  font-size: 12px;
  line-height: 1.5;
}

.field-message--success {
  color: var(--zipda-color-primary-active);
}

.field-message--error {
  color: var(--zipda-color-danger);
}
</style>
