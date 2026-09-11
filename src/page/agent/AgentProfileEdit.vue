<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import Header from "../../component/Header.vue";
import MyButton from "../../component/button/MyButton.vue";
import MyInput from "../../component/input/MyInput.vue";
import MyTextarea from "../../component/input/MyTextarea.vue";
import ProfileImagePicker from "../../component/input/ProfileImagePicker.vue";
import { useMemberStore } from "../../store/member/member.js";

const DAYS = [
  ["MONDAY", "월"], ["TUESDAY", "화"], ["WEDNESDAY", "수"],
  ["THURSDAY", "목"], ["FRIDAY", "금"], ["SATURDAY", "토"],
  ["SUNDAY", "일"],
];

const router = useRouter();
const memberStore = useMemberStore();
const loading = ref(true);
const errorMessage = ref("");
const selectedFile = ref(null);
const removeImage = ref(false);
const profile = ref({});
const form = reactive({
  intro: "",
  specialties: [],
  businessHours: DAYS.map(([dayOfWeek]) => ({
    dayOfWeek,
    openTime: "09:00",
    closeTime: "18:00",
    closed: dayOfWeek === "SUNDAY",
  })),
});

const canSubmit = computed(
  () =>
    form.intro.length <= 2000 &&
    form.specialties.every((item) => item.regionCode && item.regionName) &&
    form.businessHours.every(
      (item) =>
        item.closed ||
        (item.openTime && item.closeTime && item.openTime < item.closeTime),
    ),
);

const normalizeTime = (time) => (time ? String(time).slice(0, 5) : "");
const applyProfile = (data) => {
  profile.value = data;
  form.intro = data.intro || "";
  form.specialties = (data.specialties || []).map((item, index) => ({
    regionCode: item.regionCode || "",
    regionName: item.regionName || "",
    displayOrder: item.displayOrder ?? index,
  }));
  const hoursByDay = new Map(
    (data.businessHours || []).map((item) => [item.dayOfWeek, item]),
  );
  form.businessHours = DAYS.map(([dayOfWeek]) => {
    const hour = hoursByDay.get(dayOfWeek);
    return {
      dayOfWeek,
      openTime: normalizeTime(hour?.openTime) || "09:00",
      closeTime: normalizeTime(hour?.closeTime) || "18:00",
      closed: hour?.closed ?? dayOfWeek === "SUNDAY",
    };
  });
};

const loadProfile = async () => {
  try {
    const member = await memberStore.getMyProfile();
    if (member.role !== "AGENT" || !member.agent?.agentId) {
      router.replace("/mypage");
      return;
    }
    applyProfile(await memberStore.getAgentProfile(member.agent.agentId));
  } catch (error) {
    errorMessage.value =
      error?.response?.data?.message || "중개사 프로필을 불러오지 못했습니다.";
  } finally {
    loading.value = false;
  }
};

const addSpecialty = () => {
  form.specialties.push({
    regionCode: "",
    regionName: "",
    displayOrder: form.specialties.length,
  });
};

const removeSpecialty = (index) => {
  form.specialties.splice(index, 1);
};

const setFile = (file) => {
  selectedFile.value = file;
  removeImage.value = false;
};

const saveProfile = async () => {
  if (!canSubmit.value) return;
  errorMessage.value = "";
  try {
    let profileFileId;
    let profileImageAction = "KEEP";
    if (selectedFile.value) {
      const uploaded = await memberStore.uploadAgentProfileImage(selectedFile.value);
      profileFileId = String(uploaded.fileId);
      profileImageAction = "REPLACE";
    } else if (removeImage.value) {
      profileImageAction = "REMOVE";
    }

    const updated = await memberStore.updateAgentProfile(profile.value.agentId, {
      intro: form.intro.trim(),
      profileImageAction,
      ...(profileFileId ? { profileFileId } : {}),
      specialties: form.specialties.map((item, index) => ({
        regionCode: item.regionCode.trim(),
        regionName: item.regionName.trim(),
        displayOrder: index,
      })),
      businessHours: form.businessHours.map((item) => ({
        dayOfWeek: item.dayOfWeek,
        openTime: item.closed ? null : `${item.openTime}:00`,
        closeTime: item.closed ? null : `${item.closeTime}:00`,
        closed: item.closed,
      })),
    });
    selectedFile.value = null;
    removeImage.value = false;
    applyProfile(updated);
    router.push({
      path: `/agents/${updated.agentId}`,
      query: { updated: "true" },
    });
  } catch (error) {
    errorMessage.value =
      error?.response?.data?.message || "중개사 프로필을 저장하지 못했습니다.";
  }
};

onMounted(loadProfile);
</script>

<template>
  <section class="page">
    <Header title="중개사 프로필 수정" show-back back-to="/mypage" />
    <form class="page-content agent-edit" @submit.prevent="saveProfile">
      <p v-if="loading" class="text-muted">프로필을 불러오는 중입니다.</p>
      <template v-else>
        <header class="edit-heading">
          <h1>프로필 수정</h1>
          <p>고객에게 보이는 중개사 정보를 관리해 주세요.</p>
        </header>

        <ProfileImagePicker
          :current-url="profile.profileImageUrl || ''"
          :removed="removeImage"
          :name="profile.representativeName || '중개사'"
          @update:file="setFile"
          @remove="removeImage = true"
        />

        <div class="locked-info">
          <strong>{{ profile.agencyName }}</strong>
          <span>{{ profile.address }}</span>
          <p>중개소명·등록번호·주소 등 인증 정보는 이 화면에서 변경할 수 없습니다.</p>
        </div>

        <MyTextarea
          v-model="form.intro"
          label="소개"
          :maxlength="2000"
          placeholder="고객에게 보여줄 전문 분야와 서비스 방식을 소개해 주세요."
        />

        <section class="edit-section">
          <div class="section-heading">
            <div><h2>전문 지역</h2><p>지역명과 행정 지역 코드를 입력해 주세요.</p></div>
            <button type="button" @click="addSpecialty">+ 추가</button>
          </div>
          <div v-if="form.specialties.length" class="specialty-list">
            <div
              v-for="(item, index) in form.specialties"
              :key="index"
              class="specialty-row"
            >
              <MyInput v-model="item.regionName" label="지역명" placeholder="예: 강남구 역삼동" />
              <MyInput v-model="item.regionCode" label="지역 코드" placeholder="예: 1168010100" />
              <button
                type="button"
                class="remove-button"
                aria-label="전문 지역 삭제"
                @click="removeSpecialty(index)"
              >
                ×
              </button>
            </div>
          </div>
          <p v-else class="empty-hint">등록된 전문 지역이 없습니다.</p>
        </section>

        <section class="edit-section">
          <div class="section-heading">
            <div><h2>영업 시간</h2><p>요일별 운영 시간과 휴무일을 설정해 주세요.</p></div>
          </div>
          <div class="hours-editor">
            <div
              v-for="(day, index) in DAYS"
              :key="day[0]"
              class="hour-row"
              :class="{ 'hour-row--closed': form.businessHours[index].closed }"
            >
              <strong>{{ day[1] }}</strong>
              <label class="closed-toggle">
                <input v-model="form.businessHours[index].closed" type="checkbox" />
                <span>{{ form.businessHours[index].closed ? "휴무" : "영업" }}</span>
              </label>
              <div v-if="!form.businessHours[index].closed" class="time-range">
                <input v-model="form.businessHours[index].openTime" type="time" />
                <span class="time-divider">–</span>
                <input v-model="form.businessHours[index].closeTime" type="time" />
              </div>
              <span v-else class="closed-message">정기 휴무일</span>
            </div>
          </div>
          <p v-if="!canSubmit" class="text-error form-error">
            영업 종료 시간은 시작 시간보다 늦어야 합니다.
          </p>
        </section>

        <p v-if="errorMessage" class="error-box">{{ errorMessage }}</p>
        <MyButton
          type="submit"
          size="large"
          block
          :disabled="!canSubmit"
          :loading="memberStore.savingProfile"
        >
          변경 내용 저장
        </MyButton>
      </template>
    </form>
  </section>
</template>

<style scoped>
.agent-edit {
  display: grid;
  gap: 30px;
  max-width: 720px;
  margin: 0 auto;
}

.edit-heading { display: grid; gap: 5px; }
.edit-heading h1 { font-size: 24px; }
.edit-heading p,
.section-heading p { color: var(--zipda-color-text-muted); font-size: 13px; }

.locked-info {
  display: grid;
  gap: 5px;
  padding: 16px;
  background: #f6f7f3;
  border: 1px solid var(--zipda-color-border);
  border-radius: 14px;
}
.locked-info span { color: var(--zipda-color-text-muted); font-size: 13px; }
.locked-info p {
  margin-top: 6px;
  color: var(--zipda-color-primary-active);
  font-size: 12px;
  line-height: 1.5;
}

.edit-section { display: grid; gap: 14px; }
.section-heading {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 14px;
}
.section-heading h2 { margin-bottom: 3px; font-size: 18px; }
.section-heading button,
.remove-button {
  color: var(--zipda-color-primary);
  background: transparent;
  border: 0;
  cursor: pointer;
  font-weight: 700;
}

.specialty-list { display: grid; gap: 12px; }
.specialty-row {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 14px 42px 14px 14px;
  background: #fafbf8;
  border: 1px solid var(--zipda-color-border);
  border-radius: 14px;
}
.remove-button {
  position: absolute;
  top: 8px;
  right: 10px;
  font-size: 22px;
}
.empty-hint {
  padding: 18px;
  color: var(--zipda-color-text-muted);
  text-align: center;
  background: #fafbf8;
  border-radius: 12px;
  font-size: 13px;
}

.hours-editor {
  overflow: hidden;
  border: 1px solid var(--zipda-color-border);
  border-radius: 16px;
}
.hour-row {
  display: grid;
  grid-template-columns: 28px 58px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  min-height: 58px;
  padding: 10px 14px;
  border-bottom: 1px solid #eceee9;
}
.hour-row:last-child { border-bottom: 0; }
.hour-row > strong {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  color: var(--zipda-color-primary-active);
  background: var(--zipda-color-primary-light);
  border-radius: 50%;
  font-size: 13px;
}
.hour-row:nth-last-child(-n + 2) > strong { color: var(--zipda-color-danger); }
.time-range {
  display: grid;
  grid-template-columns: minmax(92px, 1fr) 12px minmax(92px, 1fr);
  align-items: center;
  gap: 8px;
}
.time-range input[type="time"] {
  width: 100%;
  min-width: 0;
  padding: 8px;
  border: 1px solid var(--zipda-color-border);
  border-radius: 8px;
}
.closed-toggle { cursor: pointer; font-size: 12px; }
.closed-toggle input { margin-right: 4px; accent-color: var(--zipda-color-primary); }
.hour-row--closed { background: #fafaf8; }
.closed-message { color: var(--zipda-color-text-muted); font-size: 13px; }
.time-divider { text-align: center; }
.form-error { font-size: 12px; }

@media (max-width: 520px) {
  .specialty-row { grid-template-columns: 1fr; }
  .hour-row {
    grid-template-columns: 28px 58px 1fr;
    gap: 8px;
  }
  .time-range {
    grid-column: 1 / -1;
    grid-template-columns: 1fr 12px 1fr;
    padding-left: 36px;
  }
}
</style>
