# w.todo 안드로이드 앱 만들기

웹앱을 Capacitor로 감싼 안드로이드 앱이에요. 코드는 웹과 같고, `android/` 폴더가 안드로이드 프로젝트예요.

- 패키지 이름(앱 ID): `com.wtodo.app` (플레이스토어에 처음 올린 뒤에는 바꿀 수 없어요)
- 웹과 다른 점
  - 구글·카카오 로그인은 휴대폰 브라우저 창에서 진행한 뒤 앱으로 돌아와요.
  - 뽀모도로가 끝나면 앱을 꺼 둬도 알림이 와요.
  - 안드로이드 뒤로 가기 버튼을 누르면 열린 창부터 닫혀요.
  - 템플릿 공유 링크는 웹 주소(wtodo.net)로 만들어져요.

## 1. 한 번만 할 일: Supabase 설정

Supabase 대시보드 → **Authentication → URL Configuration → Redirect URLs**에 아래 주소를 추가해 주세요.

```
com.wtodo.app://**
```

이게 없으면 앱에서 구글·카카오 로그인 후 앱으로 돌아오지 못해요. 구글·카카오 개발자 콘솔은 바꿀 필요가 없어요.

## 2. 컴퓨터 준비

1. [Android Studio](https://developer.android.com/studio)를 설치해요. 처음 켤 때 나오는 기본 설치(SDK 포함)를 그대로 진행하면 돼요.
2. Node.js(20 이상)를 설치해요.
3. 저장소를 받고 패키지를 설치해요.

```bash
git clone https://github.com/0jae0517/w.todo.git
cd w.todo
npm install
```

4. 프로젝트 폴더에 `.env.local` 파일을 만들고 웹과 같은 값을 넣어요. 앱 안에 들어가는 값이라 꼭 필요해요.

```
VITE_SUPABASE_URL=https://aprhenfljolcaglrtwtp.supabase.co
VITE_SUPABASE_ANON_KEY=(Vercel에 넣은 것과 같은 키)
```

## 3. 휴대폰에서 실행해 보기

1. 휴대폰 **설정 → 휴대전화 정보 → 소프트웨어 정보**에서 빌드 번호를 7번 눌러 개발자 모드를 켜고, **개발자 옵션 → USB 디버깅**을 켜요.
2. 휴대폰을 USB로 연결하고 아래 명령을 실행해요. 웹을 빌드해서 안드로이드 프로젝트에 넣고 Android Studio를 열어 줘요.

```bash
npm run android
```

3. Android Studio 위쪽에서 내 휴대폰을 고르고 ▶(Run)을 누르면 설치돼요.

코드를 고친 뒤에는 `npm run android:sync`만 다시 실행하고 ▶를 누르면 돼요.

## 4. 플레이스토어에 올리기

1. [Google Play Console](https://play.google.com/console)에서 개발자 계정을 만들어요 (한 번 25달러, 신분 확인 필요).
2. **앱 만들기**: 이름 w.todo, 기본 언어 한국어, 앱, 무료.
3. Android Studio에서 **Build → Generate Signed App Bundle / APK → Android App Bundle**을 고르고, **Create new...**로 서명 키(.jks)를 만들어요.
   - **이 파일과 비밀번호는 절대 잃어버리면 안 돼요.** 클라우드 등 안전한 곳에 따로 백업해 두세요. 저장소에는 올라가지 않게 막아 두었어요.
   - release로 빌드하면 `android/app/release/app-release.aab`가 생겨요.
4. Play Console → **테스트 → 내부 테스트**에 .aab를 올리고 내 계정을 테스터로 넣어서 먼저 받아 봐요.
5. 정식 출시 전에 Play Console이 요구하는 것들
   - **개인 개발자 계정은 비공개 테스트에 테스터 12명 이상이 14일 동안 참여**해야 정식 출시를 신청할 수 있어요.
   - **개인정보처리방침 주소**: 계정과 할 일 데이터를 저장하므로 필요해요.
   - **계정 삭제 방법**: 앱 안에서 계정을 지울 수 있어야 하고, 웹에서 삭제를 요청할 수 있는 주소도 필요해요.
   - 데이터 보안 설문, 콘텐츠 등급 설문, 스토어 등록정보(설명, 스크린샷, 512px 아이콘 `public/icon-512.png`, 1024×500 그래픽 이미지).

## 업데이트 내보내기

웹(Vercel)과 달리 앱은 자동으로 바뀌지 않아요. 고친 내용을 앱에 반영하려면:

1. `android/app/build.gradle`의 `versionCode`를 1 올리고 `versionName`도 바꿔요 (예: 1 → 2, "1.0" → "1.1").
2. `npm run android:sync` 후 Android Studio에서 같은 서명 키로 App Bundle을 다시 만들어 Play Console에 올려요.
