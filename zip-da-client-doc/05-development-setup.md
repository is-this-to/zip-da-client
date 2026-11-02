# 개발 환경 세팅

## 1. 개발 도구

| 필요 범위 | 도구 | 용도 |
| --- | --- | --- |
| 필수 | Node.js 24 | 개발 서버 실행과 정적 파일 생성 |
| 필수 | npm | 프로젝트 라이브러리 설치. Node.js 설치 시 함께 제공 |
| 선택 | Docker | 운영용 컨테이너 이미지를 로컬에서 확인할 때 사용 |


```bash
# 설치 여부와 버전 확인
node --version
npm --version

# 프로젝트 의존성 설치
npm ci

# 컨테이너 이미지를 확인하는 경우
docker --version
docker info
```

- Node.js는 `24`, npm은 오류 없이 버전이 출력되면 사용할 수 있는 상태이다. 
- `npm ci`는 저장소를 처음 받은 후 또는 `package-lock.json`이 변경된 후 프로젝트 루트에서 실행한다. 
- Docker를 사용하는 경우에는 버전과 실행 정보가 모두 출력되어야 한다.

## 2. 환경 변수

### 2.1. 로컬 개발

기본 설정에서는 프로젝트 루트의 `.env`에 로컬 실행 값을 설정한다.

```dotenv
VITE_KAKAO_MAP_APP_KEY=발급받은_JavaScript_키

# SCG를 직접 호출할 때만 설정
# VITE_API_BASE_URL=http://localhost:8080
```

- `VITE_KAKAO_MAP_APP_KEY`: 지도 화면에 사용하는 Kakao Maps JavaScript 키
- `VITE_API_BASE_URL`: SCG 기준 주소. 비워 두면 같은 출처의 `/api` 경로 사용

- `VITE_API_BASE_URL`을 비워 두면 개발 서버의 요청 전달 기능(Vite 프록시)이 `/api` 요청을 `http://localhost:8080`으로 전달한다. 
- `.env` 값을 변경한 경우 개발 서버를 다시 실행한다.
- `.env`는 Git에 커밋하지 않는다.
- `VITE_*` 값은 브라우저용 파일에 포함되는 공개 설정이므로 비밀번호나 토큰과 같은 비밀값을 사용하지 않는다.

### 2.2. 운영 빌드

운영에서는 Client와 SCG가 서로 다른 주소로 배포되므로 `VITE_API_BASE_URL`에 운영 SCG 주소를 적용한다.

| 변수 | 운영 설정 |
| --- | --- |
| `VITE_API_BASE_URL` | `https://zipda-be.meerkat.p-e.kr` |
| `VITE_KAKAO_MAP_APP_KEY` | 운영 Client 주소가 허용된 JavaScript 키 |

자동 배포 과정(GitHub Actions)은 `Dockerfile`을 사용해 운영용 컨테이너 이미지를 만든다.  
이 과정에서 Vue 소스를 브라우저용 정적 파일로 변환하며 `VITE_*` 값이 함께 포함된다.  
현재는 운영 API 주소와 Kakao Maps JavaScript 키가 정적 파일 생성 과정에 전달되지 않는다.  
운영값을 적용하려면 자동 배포에 저장한 값을 컨테이너 이미지를 만들 때 전달하도록 설정해야 한다.

## 3. 개발 단계별 확인

### 3.1. 개발 서버 실행

```bash
# 화면 또는 기능 개발을 시작할 때 실행
npm run dev
```

터미널에 로컬 접속 주소가 출력되고 `http://localhost:5173`에서 초기 화면이 표시되면 정상이다.

### 3.2. API 연동

API 기능을 개발할 때 SCG와 해당 하위 서비스를 실행한다.

```text
Client → SCG → Member / Property
```

| 개발 기능 | 필요한 서비스 | 용도 |
| --- | --- | --- |
| 로그인·회원 | SCG, Member | `/api/member/**` 요청 전달과 처리 |
| 지도·매물 | SCG, Property | `/api/property/**` 요청 전달과 처리 |

- [ ] 브라우저 개발자 도구의 Network에서 `/api` 요청 확인
- [ ] 연결 거부, 교차 출처 요청(CORS) 또는 Gateway 오류 없이 응답 수신
- [ ] 응답 결과가 데이터, 결과 없음 또는 기능별 오류 화면으로 구분되어 표시

전체 라우팅·인증·CORS 검증은 SCG 문서에서 다루며, 여기서는 Client가 API 응답을 받아 화면에 반영하는지만 확인한다.

### 3.3. 빌드

기능 작업을 마친 후 프론트엔드 소스가 정상적으로 빌드되는지 확인한다.

```bash
npm run build
```

빌드 오류 없이 완료되고 `dist/`가 생성되면 정상이다. 이 명령은 정적 파일을 생성하며 실제 배포는 수행하지 않는다.

## 4. 흔한 문제

| 증상 | 조치 |
| --- | --- |
| 패키지 설치 실패 | Node.js 24와 `package-lock.json` 상태 확인 후 `npm ci` 다시 실행 |
| 개발 서버 실행 실패 | 터미널 오류 또는 포트 충돌 해결 후 다시 실행 |
| 환경 변수 변경이 반영되지 않음 | `npm run dev` 다시 실행 |
| 지도가 표시되지 않음 | Kakao Maps JavaScript 키와 로컬 주소 `http://localhost:5173` 등록 후 개발 서버 다시 실행 |
| API 연결 실패 | `VITE_API_BASE_URL` 설정과 SCG `8080` 포트 실행 상태 확인 |
| 직접 호출 시 CORS 오류 | 로컬 프록시 사용 또는 SCG의 허용 출처에 로컬 Client 주소 등록 |
