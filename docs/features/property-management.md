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
  regionId: "문자열 TSID",
  apartmentComplexId: "문자열 TSID 또는 null",
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

검증 증빙 업로드 완료 후에는 `setVerificationEvidence()`에 다음 값을 전달한다.

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
npm run build
git diff --check
```

Node 내장 테스트는 문자열 TSID, If-Match, 등록 멱등성 키 재사용·재발급, 409 분류와 가격 조합을
검증한다. 주소·단지·사진·옵션·검증 증빙은 팀원 모듈이 반환할 계약 형태의 fixture를 사용해
최종 등록 및 검증 요청에 문자열 TSID와 완료값이 그대로 포함되는지 확인한다.

## 현재 통합 제한

- 등록용 정확 주소·단지 선택 컴포넌트가 현재 dev에 없다.
- 매물 옵션·이미지 및 검증 증빙 업로드 컴포넌트가 현재 dev에 없다.
- 수정용 상세 응답은 주소와 옵션을 반환하지 않아 해당 영역을 기존 값으로 채울 수 없다.
- 내 매물 API는 상태 필터 파라미터 없이 cursor와 size만 받는다.

위 계약이 준비되기 전까지 담당 외 입력을 경쟁 구현하지 않으며, 해당 화면은 연결 필요 상태를
명시하고 제출을 차단한다.
