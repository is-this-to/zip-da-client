# 프론트엔드 아키텍처

## 1. 설계 원칙

라우트 단위 화면, 재사용 UI, 공유 상태와 API 요청을 역할별로 분리한 Vue 3 애플리케이션 구조이다.

```text
Router → Page
          ├─ Component
          ├─ Pinia Store
          └─ API Module
                 ↓
             Axios → SCG
```

- 라우트 단위 화면과 재사용 UI 분리
- 화면 간 공유 상태와 비동기 처리는 Pinia Store에서 관리
- 서버 요청은 공통 Axios 설정 사용
- 반복되는 지도·필터·입력 검증 로직은 유틸리티로 분리

일부 Store는 Axios를 직접 호출하고 일부 기능은 API Module을 사용한다. 단일 호출 구조로 고정하지 않고 현재 구현의 역할 분리를 기준으로 설명한다.

## 2. 디렉터리 구조

```text
src/
├─ api/        # Axios 설정과 기능별 API
├─ component/  # 재사용 UI
├─ constant/   # 역할·상태·오류 코드
├─ page/       # 라우트 단위 화면
├─ route/      # Vue Router와 접근 제어
├─ store/      # Pinia 상태와 비동기 처리
└─ util/       # 지도·필터·포맷·입력 검증
```

## 3. 라우팅과 접근 제어

사용자 Client의 주요 경로이다.

| 구분 | 주요 경로 | 접근 |
| --- | --- | --- |
| 홈·검색 | `/main`, `/properties/search` | 공개 |
| 매물 조회 | `/properties/:propertyId` | 공개 |
| 회원 인증 | `/sign-in`, `/sign-up`, `/password-reset` | 공개 |
| 마이페이지 | `/mypage`, `/mypage/profile`, `/mypage/password`, `/mypage/reports` | USER, AGENT |
| 매물 관리 | `/my-properties`, `/my-properties/:propertyId`, `/properties/new`, `/properties/:propertyId/edit` | USER, AGENT |
| 매물 검증 | `/properties/:propertyId/verification/:mode` | USER, AGENT |
| 중개사 전환 | `/mypage/agent-application/documents`, `/mypage/agent-application/ocr` | USER |
| 중개사 프로필 | `/mypage/agent-profile`, `/agents/:agentId` | 관리 AGENT / 조회 공개 |
| 관심 매물 | `/favorites` | USER, AGENT |
| 공통 오류 | `/errors` | 공개 |

`/properties`도 지도 검색 화면으로 연결되며 `/members/me`는 `/mypage`의 별칭이다.

Router Guard는 최초 이동 시 토큰 재발급을 시도한 뒤 `requiresAuth`와 `roles` 메타데이터로 로그인·역할 접근을 확인한다. 인증되지 않은 사용자는 로그인 화면으로, 허용되지 않은 역할은 오류 화면으로 이동한다.

## 4. 상태 관리와 API 요청 처리

### 4.1. Pinia 상태 관리

여러 화면에서 공유하거나 라우팅·API 요청과 함께 유지해야 하는 상태는 Pinia Store에서 관리한다. 한 화면에서만 사용하는 입력값과 패널 열림 여부 등의 UI 상태는 해당 Page 또는 Component에서 관리한다.

```text
인증 상태 → Router 접근 제어·Axios 인증 요청
검색 조건 → 지도 조회·매물 목록 조회
오류 상태 → 기능 화면·공통 오류 페이지
```

- 인증 Store: 로그인 상태, Access Token과 사용자 역할
- 검색 Store: 지도 영역, 검색 조건, 매물 결과와 로딩 상태
- 기능 Store: 관심 매물과 매물 관리 등 화면 간 공유 데이터
- 오류 Store: 공통 오류 페이지에 전달할 오류 정보

### 4.2. 공통 API 요청과 MSA 연동

백엔드 API 요청은 공통 Axios 인스턴스를 통해 하나의 SCG 주소로 전달된다. Client는 각 서비스의 주소를 직접 호출하지 않고 요청 경로로 대상 영역을 구분한다.

```text
Page 또는 Store → 공통 Axios → SCG
                              ├─ /api/member/**   → Member
                              └─ /api/property/** → Property
```

공통 Axios에는 SCG 기준 URL과 쿠키 전송 설정이 적용되며, 인증된 요청에는 Access Token을 추가한다. 로그인과 토큰 재발급 과정은 [인증과 접근 제어](./03-authentication-and-api-integration.md)에서 설명한다.

SCG에서 받은 공통 응답의 `data`는 각 Store 또는 API Module이 필요한 데이터로 꺼내 화면 상태에 반영한다.

### 4.3. 최신 검색 결과를 위한 요청 제어

사용자가 지도를 빠르게 이동하거나 필터를 연속으로 변경해도, 늦게 도착한 이전 응답이 최신 검색 결과를 덮어쓰지 않도록 제어한다.

```text
이전 조건 요청 ─────────→ 늦게 도착 → 무시
최신 조건 요청 ───→ 먼저 도착 → 화면 반영
```

- 지도 이동과 필터 변경이 잠시 멈춘 뒤 조회하여 불필요한 요청 감소
- 새 조회가 시작되면 실행 중인 이전 지도·목록 요청 취소
- 요청 순번과 검색 조건을 비교하여 오래된 응답 제외
- 최신 지도 영역과 필터에 해당하는 결과만 화면에 반영
- 사용자가 새 검색을 시작해 취소된 요청은 오류로 표시하지 않음

## 5. 모바일 우선(Mobile-first) 레이아웃

모바일 화면을 기본으로 구성하고, 넓은 화면에서는 지도·목록 분할과 콘텐츠 폭 확장 등 화면별 반응형 레이아웃을 적용한다.

- 모바일 앱 프레임과 하단 내비게이션
- Safe Area를 반영한 하단 여백
- 전체 화면 지역 선택·검색 필터
- 넓은 화면의 지도·목록 분할 배치

화면별 요구에 따라 서로 다른 breakpoint를 사용하므로 특정 화면 폭을 전체 레이아웃의 단일 기준으로 표현하지 않는다.

## 6. 오류 처리

API 오류는 요청 목적을 알고 있는 Store 또는 Page에서 처리한다. 알려진 오류 코드는 공통 또는 기능별 안내 문구로 변환하고, 정의되지 않은 오류는 해당 기능의 기본 메시지로 표시한다.

```text
API 요청 실패
  ├─ 취소된 요청 → 사용자 오류로 표시하지 않음
  ├─ 입력·업무 오류 → 입력 항목 또는 기능 화면에 안내
  ├─ 인증·권한 오류 → 로그인 또는 접근 권한 안내
  ├─ 조회·통신 오류 → 오류 메시지와 필요 시 다시 시도
  ├─ 충돌 오류 → 최신 정보 조회 또는 재요청 안내
  └─ 시스템 오류 → 공통 오류 페이지 또는 기능별 안내
```

알려진 API 오류 코드는 사용자 안내 문구로 변환한다. 오류 변환 방식은 공통 메시지, 회원 메시지와 매물 전용 오류 처리 등 기능에 따라 구분된다.

| 오류 구분 | 대표 사례 | 사용자 처리 |
| --- | --- | --- |
| 입력·업무 오류 | 잘못된 입력, 상태 변경 제한 | 입력 항목 또는 기능 화면에 안내 |
| 인증·권한 오류 | 미인증, 접근 권한 없음 | 로그인 또는 권한 안내 |
| 조회·통신 오류 | 검색 실패, 네트워크 오류 | 오류 메시지와 필요 시 다시 시도 |
| 충돌 오류 | 매물 버전 변경, 중복 요청 | 최신 정보 조회 또는 재요청 |
| 시스템 오류 | `E80`, `E99` | 공통 오류 페이지 또는 기능별 안내 |
| 취소된 요청 | `ERR_CANCELED` 등 | 화면에 오류를 표시하지 않음 |

`E80`, `E99`를 공통 오류로 전달한 화면에서는 Error Store의 상태를 감지해 `/errors`로 이동한다. 매물 관리처럼 기능별 오류 처리를 사용하는 화면에서는 오류 메시지와 다시 시도 기능을 현재 화면에 표시한다.

지역 검색 화면의 오류 처리 예시이다. 

```javascript
try {
  await regionStore.searchRegions(keyword)
} catch (error) {
  if (myErrorStore.redirectErrorPage(error)) return

  searchErrorMessage.value = getApiErrorMessage(
    error,
    '지역 검색 결과를 불러오지 못했습니다.',
  )
}
```

매물 목록은 조회 중, 결과 없음과 조회 실패를 구분하여 표시한다. 사용자는 기다려야 하는지, 검색 조건을 변경해야 하는지, 다시 시도해야 하는지 판단할 수 있다.
