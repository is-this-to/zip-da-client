<script setup>
import { ref } from 'vue'

import Header from '../../component/Header.vue'
import ActionLink from '../../component/button/ActionLink.vue'
import IconButton from '../../component/button/IconButton.vue'
import MyButton from '../../component/button/MyButton.vue'
import MyFileInput from '../../component/input/MyFileInput.vue'
import MyInput from '../../component/input/MyInput.vue'

const isBookmarked = ref(false)
const isCreatingChat = ref(false)
const documentFile = ref(null)

// 실제 화면에서는 백엔드 업로드 정책 API 응답으로 교체한다.
const uploadPolicy = {
  accept: '',
  maxFileSize: null,
}

const businessNumber = ref('11680-2023-00123')
const phone = ref('02-0000-0000')
const location = ref('서울특별시 강남구')

const toggleBookmark = () => {
  isBookmarked.value = !isBookmarked.value
}

const startChat = async () => {
  if (isCreatingChat.value) return

  try {
    isCreatingChat.value = true
    // Community API 연결 위치:
    // POST /api/community/chats → 반환된 chatId로 채팅 화면 이동
    await Promise.resolve()
  } finally {
    isCreatingChat.value = false
  }
}
</script>

<template>
  <section class="page">
    <Header title="공통 컴포넌트 샘플" show-back back-to="/main" />

    <div class="page-content sample-sections">
      <section class="form-section">
        <h2 class="section-title">OCR 결과</h2>

        <MyFileInput
          v-model="documentFile"
          label="중개사 서류"
          :accept="uploadPolicy.accept"
          :max-size="uploadPolicy.maxFileSize"
          helper-text="허용 확장자와 최대 크기는 백엔드 정책을 적용합니다."
        />

        <div class="field-group">
          <MyInput v-model="businessNumber" label="사업자등록번호" disabled />
          <MyInput v-model="phone" label="전화번호" disabled />
          <MyInput v-model="location" label="위치" disabled />
        </div>
      </section>

      <section class="form-section">
        <h2 class="section-title">이동과 실행</h2>

        <ActionLink to="/main" variant="subtle" block>
          후기 더보기 →
        </ActionLink>

        <div class="form-actions form-actions--icon-primary">
          <IconButton
            icon="♡"
            :label="isBookmarked ? '찜 해제' : '찜하기'"
            :pressed="isBookmarked"
            @click="toggleBookmark"
          />

          <MyButton
            type="button"
            variant="primary"
            :loading="isCreatingChat"
            loading-text="채팅방 생성 중"
            @click="startChat"
          >
            상담문의
          </MyButton>
        </div>
      </section>

      <section class="form-section">
        <h2 class="section-title">버튼 배치</h2>

        <div class="action-stack">
          <div class="form-actions form-actions--step">
            <MyButton type="button" variant="outline">이전</MyButton>
            <MyButton type="button" variant="primary">다음 단계로</MyButton>
          </div>

          <ActionLink to="/main" variant="primary" block>
            보완하러 가기
          </ActionLink>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.sample-sections {
  display: grid;
  gap: 32px;
}
</style>
