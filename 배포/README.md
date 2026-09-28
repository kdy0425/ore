# 오레노라멘 학습 앱 스토어 배포 안내

작성 기준일: 2026-09-28

## 준비된 설정

- Android 패키지명: `com.orenoramen.learning`
- iOS Bundle ID: `com.orenoramen.learning`
- 표시 버전: `1.0.0`
- EAS 빌드 번호: 원격 관리 및 자동 증가
- Android 프로덕션 결과물: AAB
- iOS 프로덕션 결과물: IPA
- Android 대상 API: Expo SDK 57 기본값인 API 36
- iOS 아이콘: 투명도 없는 1024×1024 PNG를 `assets/icon.png`에 연결
- iPad 네이티브 지원: 초기 출시에서는 비활성화. iPhone UI로 출시 후 별도 QA를 거쳐 활성화 권장

## 출시 전에 사람이 반드시 채워야 하는 항목

1. Apple Developer Program과 Google Play Console 개발자 계정을 준비한다.
2. `privacy-policy.html`, `account-deletion.html`의 대문자 `REPLACE_...` 값을 실제 운영자명, 공개 문의 이메일, 시행일로 바꾼다.
3. 두 HTML을 HTTPS 공개 주소에 배포하고 각 스토어에 URL을 입력한다.
4. 일반 직원 권한의 심사용 계정을 별도로 만든다. dev/최고관리자 계정은 심사 계정으로 제공하지 않는다.
5. 실기기에서 가입, 승인, 로그인, 학습, 시험, 비밀번호 찾기, 계정 삭제를 점검한다.
6. Supabase Auth에 운영용 Custom SMTP를 연결한다. 기본 SMTP는 직원 전체에게 복구 메일을 안정적으로 보낼 수 없다.
7. 각 스토어 콘솔에서 개인정보 설문 답변을 실제 운영 정책과 다시 대조한다.

## 프로덕션 빌드

```bash
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile production
npx eas-cli@latest build --platform ios --profile production
```

동시에 만들려면:

```bash
npx eas-cli@latest build --platform all --profile production
```

## 스토어 업로드

첫 업로드는 각 콘솔에 앱 레코드를 만든 뒤 진행한다.

```bash
npx eas-cli@latest submit --platform android --profile production --latest
npx eas-cli@latest submit --platform ios --profile production --latest
```

Android 제출 설정은 안전하게 `internal` 트랙의 `draft` 상태로 두었다. Play Console에서 내부 테스트 후 프로덕션으로 승격한다. iOS 제출은 App Store Connect/TestFlight에 업로드할 뿐 자동으로 App Review에 제출되지는 않는다.

## 권장 출시 순서

1. 개인정보처리방침/계정삭제 페이지 공개
2. Supabase Custom SMTP 설정
3. Android 내부 테스트 및 iOS TestFlight 테스트
4. 스크린샷 촬영 및 문구 최종 확인
5. 개인정보·연령등급·콘텐츠 설문 제출
6. 심사용 일반 직원 계정 입력
7. 단계적 출시
