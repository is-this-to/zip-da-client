<!-- 임호탁 파트 (매물 등록·내 매물 관리 프론트엔드 구현 및 연동 문서) -->

# 매물 등록·내 매물 관리 프론트엔드

## 목적과 범위

임호탁 담당 프론트 범위인 내 매물 목록, 매물 등록·수정, 수정용 상세 조회,
거래 상태 변경, 소프트 삭제, 검증 신청과 공통 오류 처리를 구현한다. 주소·Region·단지·지도는
김민수 담당이며 옵션·파일·이미지는 장수린 담당이므로 해당 입력과 업로드를 별도로 구현하지 않는다.

## 화면

| 경로 | 역할 | 권한 |
| --- | --- | --- |
| `/my-properties` | 내 매물 cursor 목록과 관리 액션 | USER, AGENT |
| `/properties/new` | 등록 1단계 주체, 2단계 핵심 정보, 5단계 확인·동의 | USER, AGENT |
| `/properties/:propertyId/edit` | 수정용 상세 조회와 핵심 정보 수정 | 소유자·허용된 관리자 |
| `/properties/:propertyId/verification/:mode` | owner, tenant, reverification 신청 | USER, AGENT |

각 매물 관리 페이지는 기존 인증 store를 초기화한 뒤 접근 권한을 확인한다. 인증되지 않은 사용자는
기존 로그인 화면으로 이동하고, 허용되지 않은 역할에는 매물 화면 안에서 권한 오류를 표시한다.

등록 화면은 임호탁 담당인 1·2·5단계를 한 route 안에서 순서대로 진행한다. 2단계를 마친 뒤
다른 담당자가 제공하는 3단계 주소·단지와 4단계 옵션·사진 결과가 연결되어야 5단계로 이동한다.
개인 매물이 생성되면 등록 주체에 따라 소유자 또는 임차인 검증 화면으로 이동한다.

## API 계약

모든 API는 기존 `myAxios`를 사용하므로 브라우저가 가진 Authorization 토큰과 쿠키 정책을
그대로 적용한다. 프론트는 `X-User-Id`, `X-User-Role`을 만들지 않는다.

| 기능 | 요청 |
| --- | --- |
| 내 매물 | `GET /api/property/me?size=20&cursor=...` |
| 수정용 상세 | `GET /api/property/properties/{propertyId}/edit` |
| 등록 | `POST /api/property/properties`, `Idempotency-Key` |
| 수정 | `PATCH /api/property/properties/{propertyId}`, `If-Match`와 본문 version |
| 거래 상태 | `PATCH /api/property/properties/{propertyId}/transaction-status` |
| 삭제 | `DELETE /api/property/properties/{propertyId}`, JSON 본문과 204 응답 |
| 소유자 검증 | `POST /api/property/properties/{propertyId}/verifications/owner` |
| 임차인 검증 | `POST /api/property/properties/{propertyId}/verifications/tenant` |
| 재검증 | `POST /api/property/properties/{propertyId}/reverification` |

응답은 `{ code, message, data, traceId }` 형식으로 처리한다. propertyId, regionId,
apartmentComplexId, fileId와 propertyFileId는 문자열로 유지한다. cursor는 해석하거나 재구성하지
않고 서버 응답을 다음 요청에 그대로 전달한다.

## 동시성 및 멱등성

등록 요청은 본문의 SHA-256 fingerprint와 `Idempotency-Key`를 sessionStorage에 함께 보관한다.
정확 주소를 포함한 요청 원문은 브라우저 저장소에 기록하지 않는다. 동일한 본문을 재시도하면 같은
키를 사용하고, 본문이 바뀌면 새 키를 만든다. 성공한 뒤에는 저장한 키를 제거한다.

수정·상태 변경·삭제·검증은 마지막 조회 version을 본문에 넣고 같은 값을 따옴표로 감싼
`If-Match` 헤더로 전송한다. 409 충돌 시 자동 덮어쓰기하지 않으며 목록 또는 수정용 상세를 다시
불러오는 선택을 제공한다.

## 다른 담당 모듈 연결 계약

등록 페이지가 최종 제출을 활성화하려면 `usePropertyManagementStore().setRegistrationIntegration()`에
다음 값을 전달해야 한다.

```js
{
  regionId: "AUTO_INCREMENT BIGINT를 숫자 문자열로 전달",
  apartmentComplexId: "AUTO_INCREMENT BIGINT를 숫자 문자열 또는 null로 전달",
  address: {
    roadAddress: "서버에 제출할 정확 주소",
    jibunAddress: "서버에 제출할 정확 주소",
    legalDongCode: "10자리 코드",
    longitude: 127.0,
    latitude: 37.0,
  },
  fileIds: ["문자열 TSID"],
  options: [{ optionCode: "...", optionValue: "..." }],
}
```

정확 주소와 좌표는 공개 화면, URL, 로그에 출력하지 않고 등록 요청에만 사용한다.
regionId와 apartmentComplexId는 Property 운영 DB에서 AUTO_INCREMENT BIGINT로 생성하지만,
JavaScript number로 변환하지 않고 API 경계에서 숫자 문자열로 유지한다. propertyId, fileId와
propertyFileId는 애플리케이션에서 생성한 TSID 문자열로 유지한다.

검증 페이지에 통합된 `PropertyVerificationFileUploader`는 `VERIFICATION` 용도로
업로드 세션 생성 → 스토리지 PUT → 완료 API 호출을 수행하고, 완료된 문자열 파일 ID만 반환한다.
페이지는 `createVerificationEvidence()`로 이를 변환해 `setVerificationEvidence()`에 전달한다.

```js
[
  {
    propertyFileId: "문자열 TSID",
    evidenceType: "REGISTRY_DOCUMENT",
    sortOrder: 0,
  },
]
```

이 연결값이 없으면 등록 및 검증 제출 버튼은 비활성화된다. 임시 입력이나 내부 objectKey로
우회하지 않는다.

### 검증 증빙 연결

| 검증 모드 | 등록 주체 | 기본 증빙 유형 |
| --- | --- | --- |
| owner | 소유자 | REGISTRY_DOCUMENT |
| tenant | 임차인 | OWNERSHIP_CONTRACT |
| reverification | DIRECT_OWNER | REGISTRY_DOCUMENT |
| reverification | DIRECT_TENANT | OWNERSHIP_CONTRACT |
| reverification | AGENT_BROKERAGE | BROKERAGE_REGISTRATION |

유형 결정은 `resolveVerificationEvidenceType()`에서 관리한다. 파일 추가·삭제·재정렬 시
현재 배열 순서로 `sortOrder`를 0부터 다시 부여한다. 신청에는 매물 정보, 허용된 검증 모드,
`hasVerificationEvidenceData()`를 통과한 증빙, 동의 체크가 모두 필요하다.

화면 진입·이탈, 매물 ID 또는 검증 모드 변경, 제출 성공 시 증빙과 동의를 초기화한다.
업로더도 새로 생성해 이전 파일 목록을 재사용하지 않는다. 제출 중 추가 클릭은 차단하며,
이전 화면의 요청이 늦게 완료돼도 새 화면의 증빙을 지우거나 목록으로 이동시키지 않는다.
실패 시 기존 store의 오류 메시지와 traceId 표시를 유지한다.

## 복구 범위

현재 복구 API는 CS_ADMIN 또는 SUPER_ADMIN 전용이고, 내 매물 목록은 소프트 삭제된 매물을
반환하지 않는다. 현재 프론트 요구 화면에는 관리자용 삭제 목록이 없으므로 일반 사용자 화면에
복구 액션을 노출하지 않는다. 관리자 삭제 목록 계약과 화면이 추가되면
`POST /api/property/properties/{propertyId}/restore`를 version과 If-Match로 연결해야 한다.

## 오류 UX

- 401: 로그인 필요 안내 및 로그인 경로 이동
- 403: 권한 없음
- 404: 삭제되었거나 접근할 수 없는 매물
- 409: version 또는 멱등성 충돌 안내, 자동 덮어쓰기 금지
- 429: 잠시 후 재시도
- 500, 503, 네트워크 오류: 입력을 유지하고 재시도
- traceId: 오류가 있을 때 문의 코드로만 표시
- `data`의 `fieldErrors`: 필드명과 메시지를 등록·수정 입력에 연결

publicationStatus, transactionStatus, verificationStatus는 목록과 수정 화면에서 각각 별도 배지로
표시한다.

## 검증

```text
node --test test/propertyManagementPolicy.test.js
node --test test/propertyRegistrationLocationStore.test.js
node --test test/propertyVerificationPage.test.js
npm run build
git diff --check
```

Node 내장 테스트는 문자열 ID, If-Match, 등록 멱등성 키 재사용·재발급, 409 분류와 가격 조합을
검증한다. 주소·단지·사진·옵션·검증 증빙은 팀원 모듈이 반환할 계약 형태의 fixture를 사용해
최종 등록 및 검증 요청에 각 ID와 완료값이 문자열로 그대로 포함되는지 확인한다.

검증 페이지 테스트는 실제 Vue setup과 Pinia store를 실행하고 HTTP 전송을 테스트 응답으로
대체한다. 제출 조건, 중복 요청 차단, 성공·실패 처리, 매물·모드 변경 및 이탈 시 초기화를
검증한다. 실제 스토리지 업로드와 운영 서버 연결은 이 테스트 범위에 포함하지 않는다.

주소 연동 store 테스트는 새 주소 검증 시 이전 Region·단지 상태를 즉시 폐기하고, 늦게 도착한
이전 응답을 무시하며, Region과 단지 ID를 문자열로 유지하는지 검증한다.

## 현재 통합 제한

- 등록용 주소 검색과 단지 선택 컴포넌트는 연결되어 있으며 카카오 주소 검색 응답까지 확인했다.
- 로컬 Property DB에는 Region 53,387건과 Region Boundary 82,052건이 적재되어 있다. Gateway의
  Region 검색·상세 API에서 `regionId="4065"`와 중심점·경계 geometry·bounds 반환을 확인했다.
- 옵션 목록 API는 네 매물 유형에서 `200 SUCCESS`를 반환하며 확정된 15개 옵션의 조회·선택 상태
  복원·등록 요청 반영을 팀원 통합 환경에서 확인했다.
- 이미지 업로드는 세션 생성 → presigned PUT → complete → 문자열 `fileIds` 등록 요청 흐름과 실제
  매물 생성까지 확인했다. 배열 첫 번째 ID는 대표 이미지이고 배열 순서는 이미지 순서로 사용한다.
- 주소 검증과 아파트 단지 조회 API는 최신 Property `dev`에 반영되어 있다. 서울·대구 기준데이터가
  있는 주소로 1~5단계 등록 E2E를 수행할 수 있다.
- 검증 증빙 업로더와 owner·tenant·reverification 요청 연결은 구현되어 있지만, 실제 스토리지 업로드
  후 발급된 `propertyFileId[]`로 검증 신청이 성공하는 서버 E2E는 아직 최종 확인하지 못했다.
- 매물 생성 응답이 성공한 뒤 검증·수정 화면 이동에 실패하면 등록 완료 상태를 유지하고 재등록을
  막는다. 사용자는 다음 화면 이동을 다시 시도하거나 내 매물에서 생성 결과를 확인할 수 있다.
- Property 서버 `.env`가 원격 운영 DB를 가리키는 환경에서는 등록·수정·삭제 E2E를 실행하지 않는다.
  쓰기 테스트는 개인 Local DB 연결을 확인한 뒤 수행한다.
- 검증 증빙 업로더는 완료된 파일 ID의 추가·삭제를 지원하지만 수동 순서 변경 UI는 없다.
  순서 변경이 화면 요구사항이면 파일 담당 컴포넌트 계약을 먼저 확정해야 한다.
- 수정용 상세 응답은 주소와 옵션을 반환하지 않아 해당 영역을 기존 값으로 채울 수 없다.
- 내 매물 API는 상태 필터 파라미터 없이 cursor와 size만 받는다.

위 계약이 준비되기 전까지 담당 외 입력을 경쟁 구현하지 않으며, 해당 화면은 연결 필요 상태를
명시하고 제출을 차단한다.
