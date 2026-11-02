# 인증과 접근 제어

> **보안 적용 사항**
>
> - Access Token의 Pinia 메모리 보관 → 토큰 장기 잔존·노출 위험 축소
> - SCG의 JWT 서명·만료 검증 → 위·변조 및 만료 토큰 차단
> - Member·Property의 최종 권한 검증 → 권한 없는 기능·타인 데이터 접근 방지

## 1. 인증

1. **인증 정보 저장**

   - 이메일·비밀번호 입력 → Member 로그인 요청
   - 로그인 성공 → Access Token·사용자 정보를 Pinia Auth Store의 메모리에 보관
   - Refresh Token → Member 서비스가 `HttpOnly` 쿠키로 설정

2. **인증 복원**

   - 최초 화면 이동 → `withCredentials`를 적용한 재발급 요청
   - 재발급 성공 → 새로운 Access Token·사용자 정보를 Auth Store에 저장

3. **인증된 API 요청**

   - 요청 전 → Access Token 만료 시점 확인
   - 만료 2분 전 → 토큰 재발급
   - 사용 가능한 Access Token → `Authorization` 헤더에 추가

4. **중복 재발급 방지**

   - 여러 요청의 재발급이 겹치면 → 하나의 재발급 작업 공유

5. **인증 종료**

   - 로그아웃 또는 재발급 실패 → Client 인증 상태 초기화

## 2. 라우트 접근 제어

- **로그인 확인**: `requiresAuth` 화면에 비로그인 사용자가 접근하면 `/sign-in`으로 이동
- **역할 확인**: `roles`에 허용되지 않은 사용자가 접근하면 `/errors`로 이동

## 3. Frontend와 Backend 인증 책임

```text
[Frontend — 사용자 브라우저]
zip-da-client
  → Access Token 보관·전달
  → Router Guard를 통한 화면 접근 제어

              │ HTTP 요청
              ▼

[Backend — 서버 영역]
zip-da-scg
  → JWT 서명·만료 검증
  → 검증한 사용자 정보를 내부 헤더로 전달

              ▼

zip-da-member / zip-da-property
  → 회원 상태·역할 확인
  → 기능별 권한·데이터 소유권 검증
```

- **Frontend**: `zip-da-client`만 해당
- **Backend**: SCG·Member·Property 서비스
- **Client 역할 확인**: 화면 접근을 위한 처리이며 서버 인증·인가를 대신하지 않음
- **내부 인증 헤더**: `X-User-Id`, `X-User-Type`, `X-User-Role`은 Client가 생성하지 않는 Backend 전달 정보

