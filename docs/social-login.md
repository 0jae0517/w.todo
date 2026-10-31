# 구글·카카오 로그인 설정

앱에는 버튼이 이미 들어가 있어요. 아래 설정을 마치면 버튼이 동작해요.
설정 전에 버튼을 누르면 "provider is not enabled" 같은 오류가 나요.

공통으로 쓰는 주소 (콜백 URL):

```
https://aprhenfljolcaglrtwtp.supabase.co/auth/v1/callback
```

이미 이메일로 가입한 계정과 같은 이메일의 구글 계정으로 로그인하면, Supabase가 같은 계정으로 묶어 줘서 할 일이 그대로 보여요.

---

## 1. 구글

1. https://console.cloud.google.com 에 접속해서 위쪽 프로젝트 선택 메뉴에서 **새 프로젝트**를 만들어요. 이름은 `w-todo` 정도면 돼요.
2. 왼쪽 메뉴 **API 및 서비스 → OAuth 동의 화면**(또는 Google Auth Platform → 브랜딩)으로 가요.
   - 앱 이름: `할 일`, 사용자 지원 이메일: 본인 이메일
   - 대상(User type): **외부**
   - 개발자 연락처: 본인 이메일 → 저장
   - **대상(Audience)** 화면에서 **앱 게시(Publish app)** 를 눌러 "프로덕션"으로 바꿔 주세요. 테스트 상태로 두면 등록한 테스트 사용자만 로그인돼요.
3. **사용자 인증 정보(클라이언트) → 사용자 인증 정보 만들기 → OAuth 클라이언트 ID**
   - 애플리케이션 유형: **웹 애플리케이션**
   - 승인된 자바스크립트 원본: `https://wtodo.net`, `https://w-todo-seven.vercel.app` (예전 주소도 계속 열리니 둘 다)
   - 승인된 리디렉션 URI: 위의 콜백 URL
   - 만들기 → **클라이언트 ID**와 **클라이언트 보안 비밀번호**를 복사해 둬요.
4. Supabase 대시보드 → **Authentication → Sign In / Providers → Google**
   - Enable 켜기
   - Client ID, Client Secret 붙여넣기 → Save

## 2. 카카오

1. https://developers.kakao.com 에 카카오 계정으로 로그인 → **내 애플리케이션 → 애플리케이션 추가하기**
   - 앱 이름: `할 일`, 회사명: 본인 이름 → 저장
2. 만든 앱 → **앱 키**에서 **REST API 키**를 복사해 둬요.
3. **플랫폼 → Web 플랫폼 등록** → 사이트 도메인에 `https://wtodo.net`, `https://w-todo-seven.vercel.app` 추가
4. **카카오 로그인** 메뉴
   - 활성화 설정: **ON**
   - Redirect URI 등록: 위의 콜백 URL
5. **카카오 로그인 → 보안** 메뉴에서 **Client Secret 코드 생성** → 활성화 상태 **사용함** → 코드 복사
6. **카카오 로그인 → 동의항목**
   - 닉네임, 프로필 사진: **선택 동의**
   - 카카오계정(이메일): **필수 동의**. 설정하려면 **앱 설정 → 비즈니스**에서 "개인 개발자 비즈 앱 전환"이 필요해요. 본인 인증만 하면 무료로 바꿀 수 있어요.
7. Supabase 대시보드 → **Authentication → Sign In / Providers → Kakao**
   - Enable 켜기
   - Client ID(REST API Key) 칸에 2번의 REST API 키
   - Client Secret 칸에 5번의 코드 → Save
   - 이메일 동의항목을 못 켰다면, 같은 화면의 **Allow users without an email** 을 켜 주세요.
8. 닉네임·사진을 정말 선택으로 보이게 하기 (2026-10-31 추가)
   Supabase 기본 카카오 로그인은 닉네임·사진·이메일을 항상 이름으로 요청해서, 카카오가 셋 다 **필수**로 보여 줘요. 그래서 앱이 카카오 로그인 화면을 직접 열고, `/api/kakao`(Vercel 함수)가 받은 코드를 ID 토큰으로 바꿔 Supabase에 넘겨요. 이러면 동의 화면이 6번 설정(필수/선택)을 그대로 따라요.
   - 카카오 디벨로퍼스 → **카카오 로그인 → 고급 → OpenID Connect 활성화**: **ON**
   - 카카오 디벨로퍼스 → **카카오 로그인 → Redirect URI**에 `https://wtodo.net/api/kakao`, `https://w-todo-seven.vercel.app/api/kakao` 추가 (기존 Supabase 콜백 URL은 그대로 둬요)
   - Vercel → 프로젝트 → **Settings → Environment Variables**에 추가 후 **Redeploy**
     - `VITE_KAKAO_REST_KEY` = 2번의 REST API 키
     - `KAKAO_CLIENT_SECRET` = 5번의 Client Secret 코드
   - `VITE_KAKAO_REST_KEY`가 없으면 앱은 예전처럼 Supabase 카카오 로그인을 써요.

## 3. 주소(도메인)를 바꿀 때

2026-10-25에 `wtodo.net`을 연결했어요. 예전 주소 `https://w-todo-seven.vercel.app`도 계속 열려요. 주소를 새로 추가하면 아래 세 곳에 모두 넣어야 로그인이 돼요.

1. Supabase → **Authentication → URL Configuration**
   - Site URL: `https://wtodo.net`
   - Redirect URLs: `https://wtodo.net`, `https://w-todo-seven.vercel.app` (예전 주소는 지우지 않기)
2. 구글 클라우드 콘솔 → OAuth 클라이언트 → **승인된 자바스크립트 원본**에 새 주소 추가
3. 카카오 디벨로퍼스 → **플랫폼 → Web → 사이트 도메인**에 새 주소 추가

콜백 URL(Supabase 주소)은 바뀌지 않으니 그대로 두면 돼요.

## 4. 확인

https://wtodo.net → 오른쪽 위 구름 아이콘 → **Google로 계속하기** / **카카오로 계속하기**
로그인 후 구름 아이콘 옆 점이 초록색이면 동기화되는 중이에요.

> 휴대폰에서는 카카오톡이나 Gmail 안에서 열지 말고 Chrome(또는 Safari)에서 직접 주소를 열어 주세요. 구글은 앱 안의 브라우저에서 로그인을 막아요.
