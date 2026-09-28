# 오레노라멘 직원용 레시피 학습 앱

오레노라멘 직원이 레시피와 식자재 관리 내용을 반복 학습하고 시험으로 점검하는 모바일 앱입니다. React Native, Expo, TypeScript, Expo Router로 만들었으며 서버나 로그인 없이 기기 안에 학습 기록을 저장합니다.

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

## 품질 검사

```bash
npm run typecheck
npm run lint
npx expo-doctor
```

## 퀴즈 데이터

문제은행은 [`src/data/oreno_quiz_full.json`](src/data/oreno_quiz_full.json)에 있습니다. 화면에는 `answerSource`를 표시하지 않습니다.

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

## 문제 추가 방법

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

데이터 조회와 저장 로직을 화면에서 분리해 두어 향후 Supabase 저장소로 교체하기 쉽도록 구성했습니다.
