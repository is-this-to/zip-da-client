<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Header from "../../component/Header.vue";
import { useAuthStore } from "../../store/auth/useAuthStore.js";
import { useMemberStore } from "../../store/member/member.js";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const memberStore = useMemberStore();
const loadError = ref("");

const member = computed(
  () => memberStore.memberProfile || authStore.userInfo || {},
);
const displayName = computed(
  () => member.value.name || member.value.nickname || "회원",
);
const role = computed(() => member.value.role || authStore.role || "USER");
const isAgent = computed(() => role.value === "AGENT");
const agentId = computed(() => member.value.agent?.agentId);
const applicationSubmitted = computed(
  () => route.query.agentSubmitted === "true",
);

const loadProfile = async () => {
  try {
    await memberStore.getMyProfile();
  } catch (error) {
    loadError.value =
      error?.response?.data?.message || "프로필 정보를 불러오지 못했습니다.";
  }
};

const openAgentApplication = () => {
  if (isAgent.value) {
    router.push("/mypage/agent-profile");
    return;
  }
  router.push("/mypage/agent-application/documents");
};

onMounted(loadProfile);
</script>

<template>
  <section class="page my-page">
    <Header title="마이페이지" show-back back-to="/main" />
    <div class="page-content my-page__content">
      <p v-if="loadError" class="error-box">{{ loadError }}</p>

      <section class="profile" aria-label="내 프로필">
        <button
          type="button"
          class="profile__image-button"
          aria-label="프로필 수정으로 이동"
          @click="router.push('/mypage/profile')"
        >
          <img
            v-if="member.profileImageUrl"
            :src="member.profileImageUrl"
            alt=""
            referrerpolicy="no-referrer"
          />
          <span v-else>{{ displayName.slice(0, 1) }}</span>
          <i aria-hidden="true">✎</i>
        </button>
        <div class="profile__identity">
          <p><strong>{{ displayName }}</strong><span>{{ role }}</span></p>
          <small>{{ member.email }}</small>
        </div>
      </section>

      <p v-if="applicationSubmitted" class="info-box" role="status">
        중개사 전환 신청이 제출되었습니다. 심사 결과는 마이페이지에서 확인할 수
        있어요.
      </p>

      <button type="button" class="agent-card" @click="openAgentApplication">
        <span>
          <strong>중개사 인증</strong>
          <small v-if="isAgent">{{ member.agent?.agencyName || "인증된 중개사" }}</small>
          <small v-else>신뢰할 수 있는 파트너가 되어보세요.</small>
        </span>
        <i aria-hidden="true">›</i>
      </button>

      <nav class="my-menu" aria-label="내 정보 메뉴">
        <button type="button" @click="router.push('/mypage/profile')">
          <span aria-hidden="true">♙</span><strong>프로필 수정</strong><i>›</i>
        </button>
        <button type="button" @click="router.push('/mypage/password')">
          <span aria-hidden="true">▣</span><strong>비밀번호 변경</strong><i>›</i>
        </button>
        <template v-if="isAgent && agentId">
          <button type="button" @click="router.push('/mypage/agent-profile')">
            <span aria-hidden="true">⌂</span><strong>중개사 프로필 수정</strong><i>›</i>
          </button>
          <button type="button" @click="router.push(`/agents/${agentId}`)">
            <span aria-hidden="true">◎</span><strong>내 공개 프로필 보기</strong><i>›</i>
          </button>
        </template>
      </nav>
    </div>
  </section>
</template>

<style scoped>
.my-page__content {
  display: grid;
  align-content: start;
  gap: 20px;
  max-width: 560px;
  margin: 0 auto;
}

.profile {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 8px 0;
}

.profile__image-button {
  position: relative;
  display: grid;
  place-items: center;
  width: 92px;
  height: 92px;
  color: var(--zipda-color-primary-active);
  background: var(--zipda-color-primary-light);
  border: 1px solid var(--zipda-color-border);
  border-radius: 50%;
  cursor: pointer;
  font-size: 30px;
  font-weight: 700;
}

.profile__image-button img {
  width: 100%;
  height: 100%;
  border-radius: inherit;
  object-fit: cover;
}

.profile__image-button i {
  position: absolute;
  right: 0;
  bottom: 1px;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  color: white;
  background: var(--zipda-color-primary);
  border: 3px solid white;
  border-radius: 50%;
  font-size: 12px;
  font-style: normal;
}

.profile__identity {
  display: grid;
  justify-items: center;
  gap: 3px;
}

.profile__identity p {
  display: flex;
  align-items: center;
  gap: 9px;
}

.profile__identity strong { font-size: 22px; }
.profile__identity span {
  padding: 2px 7px;
  color: var(--zipda-color-primary);
  background: #eff5e7;
  border-radius: 999px;
  font-size: 10px;
}
.profile__identity small { color: var(--zipda-color-text-muted); }

.agent-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 104px;
  padding: 20px;
  color: var(--zipda-color-primary-active);
  text-align: left;
  background: #e8f3d8;
  border: 0;
  border-radius: 22px;
  cursor: pointer;
}

.agent-card > span { display: grid; gap: 5px; }
.agent-card strong { font-size: 18px; }
.agent-card small { color: #71815e; font-size: 12px; }
.agent-card i {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  background: white;
  border-radius: 50%;
  font-size: 25px;
  font-style: normal;
}

.my-menu {
  display: grid;
  padding: 4px 0;
  background: var(--zipda-color-white);
  border: 1px solid #eceee9;
  border-radius: 18px;
  box-shadow: 0 8px 24px rgb(32 33 31 / 5%);
}

.my-menu button {
  display: grid;
  grid-template-columns: 28px 1fr auto;
  align-items: center;
  min-height: 56px;
  padding: 0 16px;
  color: var(--zipda-color-text);
  text-align: left;
  background: transparent;
  border: 0;
  border-bottom: 1px solid #f0f1ed;
  cursor: pointer;
}

.my-menu button:last-child { border-bottom: 0; }
.my-menu button span { color: var(--zipda-color-primary); font-size: 18px; }
.my-menu button strong { font-size: 14px; }
.my-menu button i {
  color: var(--zipda-color-tertiary, #b5c99a);
  font-size: 20px;
  font-style: normal;
}
</style>
