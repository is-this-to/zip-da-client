<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import Header from "../../component/Header.vue";
import { useMemberStore } from "../../store/member/member.js";

const DAY_LABELS = {
  MONDAY: "월요일", TUESDAY: "화요일", WEDNESDAY: "수요일",
  THURSDAY: "목요일", FRIDAY: "금요일", SATURDAY: "토요일", SUNDAY: "일요일",
};

const route = useRoute();
const memberStore = useMemberStore();
const profile = ref(null);
const errorMessage = ref("");
const updated = computed(() => route.query.updated === "true");

const formatTime = (value) => String(value || "").slice(0, 5);
const loadProfile = async () => {
  try {
    profile.value = await memberStore.getAgentProfile(route.params.agentId);
  } catch (error) {
    errorMessage.value =
      error?.response?.data?.message || "중개사 프로필을 불러오지 못했습니다.";
  }
};

onMounted(loadProfile);
</script>

<template>
  <section class="page">
    <Header title="중개사 프로필" show-back />
    <div class="page-content public-profile">
      <p v-if="errorMessage" class="error-box">{{ errorMessage }}</p>
      <p v-else-if="!profile" class="text-muted">프로필을 불러오는 중입니다.</p>
      <template v-else>
        <p v-if="updated" class="info-box">중개사 프로필이 저장되었습니다.</p>
        <header class="hero">
          <img v-if="profile.profileImageUrl" :src="profile.profileImageUrl" alt="" />
          <span v-else>{{ (profile.representativeName || "중").slice(0, 1) }}</span>
          <div>
            <h1>{{ profile.representativeName }} 중개사</h1>
            <p>{{ profile.agencyName }}</p>
          </div>
        </header>

        <dl class="contact-card">
          <div><dt>전화</dt><dd>{{ profile.phone || "등록된 정보 없음" }}</dd></div>
          <div><dt>주소</dt><dd>{{ profile.address || "등록된 정보 없음" }}</dd></div>
        </dl>

        <section class="profile-section">
          <h2>소개</h2>
          <p class="intro">{{ profile.intro || "등록된 소개가 없습니다." }}</p>
        </section>

        <section class="profile-section">
          <h2>전문 지역</h2>
          <div v-if="profile.specialties?.length" class="specialty-chips">
            <span v-for="item in profile.specialties" :key="item.regionCode">
              ⌂ {{ item.regionName }}
            </span>
          </div>
          <p v-else class="empty-text">등록된 전문 지역이 없습니다.</p>
        </section>

        <section class="profile-section">
          <h2>영업 시간</h2>
          <div class="hours-card">
            <div v-for="item in profile.businessHours" :key="item.dayOfWeek">
              <strong :class="{ weekend: ['SATURDAY', 'SUNDAY'].includes(item.dayOfWeek) }">
                {{ DAY_LABELS[item.dayOfWeek] }}
              </strong>
              <span v-if="item.closed" class="closed">휴무</span>
              <span v-else>{{ formatTime(item.openTime) }} – {{ formatTime(item.closeTime) }}</span>
            </div>
          </div>
        </section>
      </template>
    </div>
  </section>
</template>

<style scoped>
.public-profile {
  display: grid;
  gap: 30px;
  max-width: 640px;
  margin: 0 auto;
}

.hero {
  display: grid;
  justify-items: center;
  gap: 14px;
  padding: 18px 0 8px;
  text-align: center;
}
.hero > img,
.hero > span {
  display: grid;
  place-items: center;
  width: 112px;
  height: 112px;
  color: var(--zipda-color-primary-active);
  background: var(--zipda-color-primary-light);
  border: 2px solid white;
  border-radius: 50%;
  box-shadow: 0 7px 22px rgb(32 33 31 / 14%);
  object-fit: cover;
  font-size: 36px;
  font-weight: 700;
}
.hero div { display: grid; gap: 5px; }
.hero h1 { font-size: 24px; }
.hero p { color: var(--zipda-color-text-muted); font-size: 14px; }

.contact-card {
  display: grid;
  overflow: hidden;
  background: #f8f9f5;
  border: 1px solid var(--zipda-color-border);
  border-radius: 16px;
}
.contact-card div {
  display: grid;
  grid-template-columns: 60px 1fr;
  gap: 14px;
  padding: 14px 16px;
  border-bottom: 1px solid #e8eae4;
}
.contact-card div:last-child { border-bottom: 0; }
.contact-card dt { color: var(--zipda-color-text-muted); font-size: 13px; }
.contact-card dd { margin: 0; font-size: 13px; line-height: 1.5; }

.profile-section { display: grid; gap: 12px; }
.profile-section h2 { font-size: 18px; }
.intro {
  padding: 18px;
  white-space: pre-wrap;
  background: #fbfbf8;
  border: 1px solid var(--zipda-color-border);
  border-radius: 14px;
  font-size: 14px;
  line-height: 1.7;
}

.specialty-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.specialty-chips span {
  padding: 8px 12px;
  color: var(--zipda-color-primary-active);
  background: #eaf3dd;
  border: 1px solid #d5e4c2;
  border-radius: 999px;
  font-size: 12px;
}
.empty-text { color: var(--zipda-color-text-muted); font-size: 13px; }

.hours-card {
  display: grid;
  overflow: hidden;
  border: 1px solid var(--zipda-color-border);
  border-radius: 16px;
}
.hours-card div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 46px;
  padding: 0 16px;
  border-bottom: 1px solid #eceee9;
  font-size: 13px;
}
.hours-card div:last-child { border-bottom: 0; }
.hours-card strong { min-width: 54px; }
.hours-card .weekend,
.hours-card .closed { color: var(--zipda-color-danger); }
</style>
