<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import Header from "../../component/Header.vue";
import MyButton from "../../component/button/MyButton.vue";
import MyInput from "../../component/input/MyInput.vue";
import ProfileImagePicker from "../../component/input/ProfileImagePicker.vue";
import { useMemberStore } from "../../store/member/member.js";

const router = useRouter();
const memberStore = useMemberStore();
const form = reactive({ nickname: "", phone: "" });
const selectedFile = ref(null);
const removeImage = ref(false);
const errorMessage = ref("");
const successMessage = ref("");

const profile = computed(() => memberStore.memberProfile || {});
const validNickname = computed(() =>
  /^[가-힣A-Za-z0-9_]{2,10}$/.test(form.nickname.trim()),
);
const validPhone = computed(() => /^01[016789]\d{7,8}$/.test(form.phone));
const canSubmit = computed(
  () => validNickname.value && validPhone.value && !memberStore.savingProfile,
);

const applyProfile = (data) => {
  form.nickname = data.nickname || "";
  form.phone = (data.phone || "").replace(/-/g, "");
};

const loadProfile = async () => {
  try {
    applyProfile(await memberStore.getMyProfile());
  } catch (error) {
    errorMessage.value =
      error?.response?.data?.message || "프로필 정보를 불러오지 못했습니다.";
  }
};

const setFile = (file) => {
  selectedFile.value = file;
  removeImage.value = false;
};

const saveProfile = async () => {
  if (!canSubmit.value) return;
  errorMessage.value = "";
  successMessage.value = "";
  try {
    let profileFileId;
    let profileImageAction = "KEEP";
    if (selectedFile.value) {
      const uploaded = await memberStore.uploadMyProfileImage(selectedFile.value);
      profileFileId = String(uploaded.fileId);
      profileImageAction = "REPLACE";
    } else if (removeImage.value) {
      profileImageAction = "REMOVE";
    }

    const updated = await memberStore.updateMyProfile({
      nickname: form.nickname.trim(),
      phone: form.phone,
      profileImageAction,
      ...(profileFileId ? { profileFileId } : {}),
    });
    selectedFile.value = null;
    removeImage.value = false;
    applyProfile(updated);
    successMessage.value = "프로필이 변경되었습니다.";
  } catch (error) {
    errorMessage.value =
      error?.response?.data?.message || "프로필을 저장하지 못했습니다.";
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
        @remove="removeImage = true"
      />

      <section class="field-group">
        <MyInput
          v-model="form.nickname"
          label="닉네임"
          :maxlength="10"
          required
          placeholder="2~10자의 닉네임"
          :error-message="
            form.nickname && !validNickname
              ? '한글, 영문, 숫자, 밑줄로 2~10자 입력해 주세요.'
              : ''
          "
          helper-text="중복 여부는 저장할 때 안전하게 확인합니다."
        />
        <MyInput
          v-model="form.phone"
          label="휴대폰 번호"
          inputmode="numeric"
          :maxlength="11"
          required
          placeholder="01012345678"
          :error-message="
            form.phone && !validPhone ? '휴대폰 번호를 숫자만 입력해 주세요.' : ''
          "
          helper-text="현재는 별도 휴대폰 인증 없이 변경됩니다."
        />
      </section>

      <p v-if="errorMessage" class="error-box">{{ errorMessage }}</p>
      <p v-if="successMessage" class="info-box" role="status">{{ successMessage }}</p>

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

.form-actions { margin-top: 16px; }
</style>
