<script setup>
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import dayjs from "dayjs";

import Header from "../../component/Header.vue";
import MyButton from "../../component/button/MyButton.vue";
import {
  PROPERTY_REPORT_REASON_LABELS,
  PROPERTY_REPORT_STATUS_LABELS,
} from "../../constant/report/propertyReport.js";
import { usePropertyReportStore } from "../../store/report/usePropertyReportStore.js";

const router = useRouter();
const store = usePropertyReportStore();

const reasonLabel = (reasonCode) =>
  PROPERTY_REPORT_REASON_LABELS[reasonCode] ?? reasonCode ?? "기타";

const statusLabel = (status) =>
  PROPERTY_REPORT_STATUS_LABELS[status] ?? status ?? "-";

const formatDate = (createdAt) => {
  if (!createdAt) return "-";

  return dayjs(createdAt).format("YYYY.MM.DD");
};

const loadReports = async () => {
  store.reset();

  try {
    await store.fetchReports();
  } catch {
    // store.error에서 화면 처리
  }
};

const loadMore = async () => {
  try {
    await store.fetchNextPage();
  } catch {
    // store.error에서 화면 처리
  }
};

const openProperty = (propertyId) => {
  if (propertyId == null) return;

  router.push(`/properties/${propertyId}`);
};

onMounted(loadReports);
</script>

<template>
  <section class="page report-list-page">
    <Header
      title="신고 내역"
      show-back
      back-to="/mypage"
    />

    <div class="page-content report-list-content">
      <header class="report-list-heading">
        <h1>내 신고 내역</h1>
        <p>
          신고한 매물과 처리 상태를 확인할 수 있어요.
        </p>
      </header>

      <!-- 로딩 -->
      <p
        v-if="store.isLoading && !store.items.length"
        class="report-state"
        aria-live="polite"
      >
        신고 내역을 불러오는 중입니다.
      </p>

      <!-- 오류 -->
      <div
        v-else-if="store.error && !store.items.length"
        class="error-box"
        role="alert"
      >
        <strong>신고 내역을 불러오지 못했습니다.</strong>
        <p>잠시 후 다시 시도해 주세요.</p>

        <MyButton
          size="small"
          variant="outline"
          @click="loadReports"
        >
          다시 시도
        </MyButton>
      </div>

      <!-- 신고 목록 -->
      <div
        v-else-if="store.items.length"
        class="report-list"
      >
        <article
          v-for="item in store.items"
          :key="item.reportId"
          class="report-card"
        >
          <div class="report-card__top">
            <span
              class="report-card__status"
              :data-status="item.status"
            >
              {{ statusLabel(item.status) }}
            </span>

            <time :datetime="item.createdAt">
              {{ formatDate(item.createdAt) }}
            </time>
          </div>

          <div class="report-card__body">
            <strong class="report-card__reason">
              {{ reasonLabel(item.reasonCode) }} 신고
            </strong>

            <p class="report-card__property">
              신고한 매물 #{{ item.propertyId }}
            </p>

            <dl class="report-card__meta">
              <div>
                <dt>신고 번호</dt>
                <dd>#{{ item.reportId }}</dd>
              </div>

              <div>
                <dt>처리 상태</dt>
                <dd>{{ statusLabel(item.status) }}</dd>
              </div>
            </dl>
          </div>

          <button
            type="button"
            class="report-card__property-link"
            @click="openProperty(item.propertyId)"
          >
            신고한 매물 보기
            <span aria-hidden="true">›</span>
          </button>
        </article>

        <MyButton
          v-if="store.hasNext"
          block
          variant="outline"
          :loading="store.isLoading"
          @click="loadMore"
        >
          더 보기
        </MyButton>
      </div>

      <!-- 빈 목록 -->
      <div
        v-else
        class="empty-state"
      >
        <span
          class="empty-state__icon"
          aria-hidden="true"
        >
          !
        </span>

        <strong>신고 내역이 없습니다.</strong>

        <p>
          신고한 매물이 생기면 처리 상태를 여기에서 확인할 수 있어요.
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.report-list-content {
  display: grid;
  gap: 20px;
  max-width: 560px;
  margin: 0 auto;
}

.report-list-heading {
  display: grid;
  gap: 6px;
}

.report-list-heading h1 {
  font-size: 22px;
}

.report-list-heading p {
  color: var(--zipda-color-text-muted);
  font-size: 13px;
}

.report-list {
  display: grid;
  gap: 14px;
}

.report-card {
  overflow: hidden;
  background: var(--zipda-color-white);
  border: 1px solid #e9ece5;
  border-radius: 18px;
  box-shadow: 0 8px 24px rgb(32 33 31 / 5%);
}

.report-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px 0;
}

.report-card__top time {
  color: var(--zipda-color-text-muted);
  font-size: 12px;
}

.report-card__status {
  padding: 5px 9px;
  color: #647351;
  background: #edf4e4;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}

.report-card__status[data-status="IN_REVIEW"],
.report-card__status[data-status="TRIAGED"] {
  color: #7a6935;
  background: #faf3db;
}

.report-card__status[data-status="ACTIONED"],
.report-card__status[data-status="CLOSED"] {
  color: #526b50;
  background: #e8f2e6;
}

.report-card__status[data-status="REJECTED"] {
  color: #8c5555;
  background: #f8eaea;
}

.report-card__body {
  display: grid;
  gap: 8px;
  padding: 18px;
}

.report-card__reason {
  font-size: 17px;
}

.report-card__property {
  color: var(--zipda-color-text-muted);
  font-size: 13px;
}

.report-card__meta {
  display: grid;
  gap: 7px;
  margin-top: 6px;
}

.report-card__meta div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.report-card__meta dt {
  color: var(--zipda-color-text-muted);
  font-size: 12px;
}

.report-card__meta dd {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
}

.report-card__property-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 48px;
  padding: 0 18px;
  color: var(--zipda-color-primary-active);
  text-align: left;
  background: #f8faf5;
  border: 0;
  border-top: 1px solid #edf0e9;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.report-card__property-link span {
  font-size: 20px;
}

.report-state {
  padding: 40px 0;
  color: var(--zipda-color-text-muted);
  text-align: center;
}

.error-box {
  display: grid;
  gap: 8px;
}

.empty-state {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 56px 20px;
  color: var(--zipda-color-text-muted);
  text-align: center;
}

.empty-state strong {
  color: var(--zipda-color-text);
}

.empty-state p {
  max-width: 280px;
  font-size: 13px;
  line-height: 1.5;
}

.empty-state__icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  margin-bottom: 4px;
  color: var(--zipda-color-primary);
  background: #eef5e6;
  border-radius: 50%;
  font-size: 20px;
  font-weight: 700;
}
</style>