<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Header from "../../component/Header.vue";
import ProfileImagePicker from "../../component/input/ProfileImagePicker.vue";
import HeartIcon from "../../component/icon/HeartIcon.vue";
import memberMessage from "../../constants/memberMessage.js";
import memberRoleCode from "../../constants/memberRoleCode.js";
import { useAuthStore } from "../../store/auth/useAuthStore.js";
import { useMemberStore } from "../../store/member/member.js";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const memberStore = useMemberStore();
const loadError = ref("");
const isLoggingOut = ref(false);

const member = computed(
  () => memberStore.memberProfile || authStore.userInfo || {},
);
const displayName = computed(
  () => member.value.name || member.value.nickname || "회원",
);
const role = computed(() => member.value.role || authStore.role || "USER");
const roleName = computed(() => memberRoleCode.getMemberRoleName(role.value));
const isAgent = computed(() => role.value === "AGENT");
const agentId = computed(() => member.value.agent?.agentId);
const applicationSubmitted = computed(
  () => route.query.agentSubmitted === "true",
);

const loadProfile = async () => {
  try {
    await memberStore.getMyProfile();
  } catch {
    loadError.value = memberMessage.getMemberMessage("PROFILE_LOAD_ERROR");
  }
};

const openAgentApplication = () => {
  if (isAgent.value) {
    router.push("/mypage/agent-profile");
    return;
  }
  router.push("/mypage/agent-application/documents");
};

const logout = async () => {
  if (isLoggingOut.value) return;

  isLoggingOut.value = true;
  try {
    await authStore.logout();
  } catch {
    // 로컬 인증 상태 초기화 유지
  } finally {
    memberStore.clearMemberState();
    router.replace("/sign-in");
  }
};

onMounted(loadProfile);
</script>

<template>
  <section class="page my-page">
    <Header title="마이페이지" show-back back-to="/main" />
    <div class="page-content my-page__content">
      <p v-if="loadError" class="error-box">{{ loadError }}</p>

      <section class="profile" aria-label="내 프로필">
        <ProfileImagePicker
          :current-url="member.profileImageUrl || ''"
          :name="displayName"
          preview-only
          compact
          @preview-click="router.push('/mypage/profile')"
        />
        <div class="profile__identity">
          <p><strong>{{ displayName }}</strong><span>{{ roleName }}</span></p>
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

      <div class="my-shortcuts" aria-label="바로가기">
        <div class="my-shortcuts__item">
          <HeartIcon />
          <span>찜 목록</span>
        </div>
        <div class="my-shortcuts__item">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3 11 12 4l9 7v9H3v-9Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M9 20v-6h6v6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span>매물 등록</span>
        </div>
        <div class="my-shortcuts__item">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7" />
            <path d="M12 11v5M12 8h.01" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
          </svg>
          <span>신고 내역</span>
        </div>
      </div>

      <nav class="my-menu" aria-label="내 정보 메뉴">
        <button type="button" @click="router.push('/mypage/profile')">
          <span aria-hidden="true">♙</span><strong>프로필 수정</strong><i>›</i>
        </button>
        <button type="button" @click="router.push('/mypage/password')">
          <span aria-hidden="true">▣</span><strong>비밀번호 변경</strong><i>›</i>
        </button>
        <div class="my-menu__row">
          <span aria-hidden="true">⌂</span><strong>내가 올린 매물</strong><i>›</i>
        </div>
        <template v-if="isAgent && agentId">
          <button type="button" @click="router.push('/mypage/agent-profile')">
            <span aria-hidden="true">⌂</span><strong>중개사 프로필 수정</strong><i>›</i>
          </button>
          <button type="button" @click="router.push(`/agents/${agentId}`)">
            <span aria-hidden="true">◎</span><strong>내 공개 프로필 보기</strong><i>›</i>
          </button>
        </template>
      </nav>

      <button
        type="button"
        class="my-page__logout"
        :disabled="isLoggingOut"
        @click="logout"
      >
        {{ isLoggingOut ? "로그아웃 중..." : "로그아웃" }}
      </button>
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

.my-shortcuts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  padding: 16px 8px;
  background: var(--zipda-color-white);
  border: 1px solid #eceee9;
  border-radius: 18px;
  box-shadow: 0 8px 24px rgb(32 33 31 / 5%);
}

.my-shortcuts__item {
  display: grid;
  justify-items: center;
  align-content: center;
  gap: 10px;
  min-height: 54px;
  color: var(--zipda-color-primary);
}

.my-shortcuts__item svg { width: 22px; height: 22px; }
.my-shortcuts__item span { color: var(--zipda-color-text); font-size: 12px; text-align: center; }

.my-menu {
  display: grid;
  padding: 4px 0;
  background: var(--zipda-color-white);
  border: 1px solid #eceee9;
  border-radius: 18px;
  box-shadow: 0 8px 24px rgb(32 33 31 / 5%);
}

.my-menu button,
.my-menu__row {
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

.my-menu button:last-child,
.my-menu__row:last-child { border-bottom: 0; }
.my-menu__row { cursor: default; }
.my-menu button span,
.my-menu__row span { color: var(--zipda-color-primary); font-size: 18px; }
.my-menu button strong,
.my-menu__row strong { font-size: 14px; }
.my-menu button i,
.my-menu__row i {
  color: var(--zipda-color-tertiary, #b5c99a);
  font-size: 20px;
  font-style: normal;
}

.my-page__logout {
  justify-self: center;
  padding: 8px 12px;
  color: var(--zipda-color-tertiary, #b5c99a);
  font-size: 12px;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.my-page__logout:disabled {
  cursor: wait;
  opacity: 0.7;
}
</style>
