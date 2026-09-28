# 오레노라멘 학습 (직원용)

오레노라멘 직원이 레시피와 식자재 관리 내용을 반복 학습하고 시험으로 점검하는 모바일 앱입니다. React Native, Expo, TypeScript, Expo Router와 Supabase Auth/Postgres/Edge Functions로 구성되어 있습니다.

## 주요 기능

- JSON 문제은행에서 카테고리와 세부 카테고리를 자동 생성
- 정답을 맞힐 때까지 같은 문제를 반복하는 공부 모드
- 전체 랜덤, 카테고리별, 누적 오답 문제 시험
- 시험 중 1회 선택 잠금 및 종료 후 채점·카테고리별 결과·오답 상세 제공
- AsyncStorage 기반 누적 기록, 문제별 정답/오답/학습 횟수 저장
- 공부·시험 문제 화면의 실제 이용 시간을 날짜별로 저장하고 주간 캘린더로 표시
- 이전 주와 다음 주를 이동하며 학습한 날, 쉬어간 날, 일별 학습 시간 확인
- 자주 틀리는 문제 최대 10개와 바로 다시 공부하기
- 확인 팝업이 포함된 학습 기록 초기화
- 이메일·휴대폰 번호 기반 가입 신청, 관리자 승인 및 로그인 세션 유지
- 최고관리자·지점관리자의 허용 범위 내 직원 비밀번호 재설정
- dev 전용 레시피 JSON 전체 업로드(파일 선택 또는 텍스트 붙여넣기)
- 기간·카테고리·직원 레벨별 관리자 통계와 명시적인 오답률 집계 기준

## 개발 환경

- Node.js 22.13 이상(Expo SDK 57 요구 버전)
- npm
- Android: Android Studio 또는 Expo Go가 설치된 Android 기기
- iOS: Expo Go가 설치된 iPhone, 또는 네이티브 시뮬레이터 빌드용 macOS/Xcode

## 설치 및 실행

```bash
npm install
npm start
```

터미널에 표시되는 QR 코드를 Expo Go로 스캔하거나 아래 명령을 사용합니다.

### Android

```bash
npm run android
```

Android Studio 에뮬레이터가 실행 중이어야 합니다. 실제 기기는 `npm start` 후 QR 코드로 연결할 수 있습니다.

### iOS

```bash
npm run ios
```

iOS 시뮬레이터는 macOS와 Xcode가 필요합니다. Windows에서는 `npm start` 후 같은 네트워크의 iPhone에서 Expo Go로 QR 코드를 스캔하세요.

### 웹 미리보기

```bash
npm run web
```

## 직원 배포용 Android APK

Expo Go 없이 실행되는 설치 파일은 아래 명령으로 만듭니다. Expo 로그인은 빌드하는 관리자만 필요하며, APK를 설치하는 직원은 Expo 계정이 필요하지 않습니다.

```bash
npx eas-cli@latest build --platform android --profile preview
```

완료된 APK를 직원에게 전달하면 됩니다. 직원은 Android에서 파일을 내려받아 열고, 처음 한 번 브라우저 또는 파일 앱의 `출처를 알 수 없는 앱 설치` 권한을 허용한 뒤 설치합니다.

향후 업데이트도 같은 EAS 프로젝트와 서명 키로 빌드해야 기존 앱 위에 설치할 수 있습니다. `preview` 빌드는 Android `versionCode`를 자동으로 올립니다.

## App Store / Google Play 배포

양쪽 스토어용 EAS 프로덕션 설정, 등록 문구, 개인정보 설문 초안, 아이콘과 Google Play 피처 그래픽은 [`배포/README.md`](배포/README.md)에 정리되어 있습니다. 스토어 출시 전 공개 개인정보처리방침 URL, 계정 삭제 URL, 심사용 일반 직원 계정과 운영용 SMTP 설정이 필요합니다.

## 품질 검사

```bash
npm run typecheck
npm run lint
npx expo-doctor
```

## 퀴즈 데이터

앱 번들 기본 문제은행은 [`src/data/oreno_quiz_full.json`](src/data/oreno_quiz_full.json)에 있습니다. 운영 중에는 Supabase의 현재 레시피 버전을 우선 사용하고, 네트워크 장애 시 마지막 캐시 또는 앱 기본본으로 대체합니다. 화면에는 `answerSource`를 표시하지 않습니다.

문제 필드:

```json
{
  "id": "q_001",
  "categoryId": "tare",
  "subcategory": "빠이탄 타래",
  "question": "문제 내용",
  "options": ["보기 1", "보기 2", "보기 3", "보기 4"],
  "correctAnswer": 1,
  "correctValue": "보기 2",
  "explanation": "정답 해설",
  "answerSource": "operational"
}
```

`correctAnswer`는 0부터 시작합니다. 위 예시의 `1`은 두 번째 보기를 뜻합니다.

## 운영 레시피 전체 업데이트

레시피는 문제별로 따로 관리하지 않습니다. dev 계정으로 로그인한 뒤 **관리 → 레시피 데이터**에서 다음 중 하나를 사용합니다.

1. 완성된 JSON 파일 하나를 선택합니다.
2. JSON 전체 내용을 입력란에 붙여넣습니다.
3. **형식 확인**에서 카테고리 수와 문제 수를 확인합니다.
4. **전체 업데이트**를 누릅니다.

새 버전은 원격 DB에 저장되어 현재 버전으로 전환되고, 이전 버전은 이력으로 남습니다. 클라이언트와 DB 양쪽에서 5MB 제한, 중복 문제 ID, 카테고리 참조, 보기/정답 인덱스 등을 검사합니다. 이 작업은 `is_developer = true`인 단일 dev 계정만 실행할 수 있습니다.

## 기본 JSON 문제 추가 방법

1. `questions` 배열에 고유한 `id`를 가진 문제를 추가합니다.
2. `categoryId`는 `categories` 배열에 존재하는 ID를 사용합니다.
3. `correctAnswer`가 `options` 배열의 올바른 위치를 가리키는지 확인합니다.
4. `meta.totalQuestions`를 실제 문제 수에 맞게 수정합니다.
5. `npm run typecheck`와 앱 실행으로 데이터 로딩을 확인합니다.

## 카테고리 추가 방법

`categories` 배열에 아래처럼 새 항목을 추가한 뒤, 문제의 `categoryId`에 같은 ID를 사용합니다. 앱 메뉴와 통계 화면은 코드 변경 없이 자동으로 새 카테고리를 표시합니다.

```json
{
  "id": "new-category",
  "name": "새 카테고리",
  "description": "카테고리 설명"
}
```

세부 카테고리는 각 문제의 `subcategory` 값을 기준으로 자동 생성됩니다.

## 정답 수정 방법

레시피나 매장 운영 기준이 변경되면 다음 항목을 함께 수정하세요.

1. `options`에 변경된 정답이 존재하도록 보기를 수정합니다.
2. 정답 위치에 맞춰 `correctAnswer`를 수정합니다.
3. `correctValue`를 정답 문자열과 동일하게 수정합니다.
4. `explanation`에 직원이 기억해야 할 기준을 간결하게 작성합니다.
5. 문서에서 확인한 값은 `answerSource`를 `document`, 매장 운영 기준으로 정한 값은 `operational`로 기록합니다.

## 구조

```text
src/
  app/          Expo Router 화면
  components/   공통 UI 컴포넌트
  constants/    색상·간격 등 디자인 토큰
  data/         JSON 문제은행과 조회 저장소
  hooks/        기록 로딩 훅
  storage/      AsyncStorage 데이터 접근 계층
  types/        문제·기록 TypeScript 타입
  utils/        출제·채점·통계 유틸리티
```

데이터 조회와 저장 로직을 화면에서 분리하고, 로컬 학습 기록과 Supabase 동기화를 함께 사용합니다.

## Supabase 설정

로컬 개발에서는 Git에 포함되지 않는 `.env.local`에 아래 값을 설정합니다.

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

DB 비밀번호, secret key, `service_role` 키는 앱 환경변수에 넣지 않습니다. 배포 시에는 같은 두 공개 값을 EAS 환경변수로 설정합니다.

원격 DB 변경은 `supabase/migrations/`의 순서대로 적용합니다. 현재 마이그레이션은 지점·프로필·승인 RPC·학습/시험 기록·공지·비공개 Storage 정책을 구성합니다.

### Auth 대시보드 설정

Supabase Dashboard의 **Authentication → URL Configuration**에서 사용하는 환경에 맞춰 다음 redirect URL을 허용합니다.

- `oreno-learning://auth/login`
- `oreno-learning://auth/update-password`
- 개발/배포 웹 주소의 `/auth/login`
- 개발/배포 웹 주소의 `/auth/update-password`

Email + Password 로그인을 활성화합니다. 운영 환경에서는 이메일 확인 사용을 권장합니다.

### dev 계정과 최초 최고관리자

dev 계정은 최고관리자와 같은 관리 권한을 가지며, 레시피 전체 업데이트와 다른 회원의 최고관리자 지정/해제는 dev 계정만 수행할 수 있습니다. [`bootstrap-developer.sql`](supabase/bootstrap-developer.sql)은 이미 가입된 계정 하나를 dev로 지정할 때 사용합니다. `target_email`을 설정한 뒤 SQL Editor에서 한 번만 실행합니다.

일반 최고관리자는 다음 방식으로 최초 지정할 수 있습니다.

1. 앱의 가입 신청 화면에서 최초 관리자 계정을 일반 계정으로 가입합니다.
2. [bootstrap-super-admin.sql](supabase/bootstrap-super-admin.sql)의 `target_email` 값을 가입 이메일로 설정합니다.
3. Supabase SQL Editor에서 파일 내용을 실행합니다.
4. 로그아웃 후 다시 로그인해 관리 메뉴가 표시되는지 확인합니다.

가입 화면이나 `user_metadata`로 최고관리자를 지정하는 기능은 없습니다. 최고관리자 추가 지정은 별도의 검토된 관리자 절차로만 처리합니다.

### 직원 비밀번호 재설정

직원 상세 화면에서 새 비밀번호와 재확인을 입력합니다. 최고관리자는 일반 직원 계정, 지점관리자는 같은 지점의 하위 직원 계정을 재설정할 수 있고 dev는 dev 자신을 제외한 계정을 재설정할 수 있습니다. 실제 Auth 비밀번호 변경은 [`reset-employee-password`](supabase/functions/reset-employee-password/index.ts) Edge Function 내부에서만 `service_role`로 수행하며 앱에는 해당 비밀 키를 넣지 않습니다.

### 로그인 유지

Supabase 세션은 웹의 로컬 저장소 또는 모바일의 AsyncStorage에 저장되고 토큰을 자동 갱신합니다. 사용자가 직접 로그아웃하거나 세션이 서버에서 무효화되지 않는 한 앱을 다시 실행해도 로그인 상태를 복원합니다.

### 계정 삭제

스토어 정책에 맞춰 사용자는 **내 정보 → 계정 영구 삭제**에서 자신의 Auth 계정, 프로필, 학습·시험 기록, 작성 공지와 연관 이미지를 삭제할 수 있습니다. 삭제는 JWT를 검증하는 [`delete-account`](supabase/functions/delete-account/index.ts) Edge Function에서 수행하며 `service_role` 키는 앱에 노출하지 않습니다.

### 비밀번호 재설정 메일 운영 설정

앱은 Supabase Auth의 `resetPasswordForEmail`과 `updateUser`를 사용합니다. 운영 직원 전체에게 실제 메일을 보내려면 Supabase Dashboard의 **Authentication → Emails → SMTP Settings**에 별도 SMTP 제공자(Resend, AWS SES 등)를 연결해야 합니다. Supabase 기본 메일 서버는 개발용이며 프로젝트 팀 주소만 허용하고 발송량도 강하게 제한합니다. SMTP 연결 후 **Authentication → URL Configuration**에 앱의 `oreno-learning://auth/update-password` 주소도 허용해야 합니다.
