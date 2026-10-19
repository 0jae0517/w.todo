# 할 일 (광고 없는 개인용 투두 앱)

Todomate 대신 쓰려고 만드는 웹 앱(PWA). 휴대폰 홈 화면에 추가하면 앱처럼 쓸 수 있고, Supabase를 연결하면 기기 간 동기화와 친구 기능이 켜집니다.

## 기능
- 주간/월간 달력, 날짜별 남은 할 일 수 표시 (다 끝내면 ✓)
- 카테고리(색상)별 할 일, 완료 체크, 오늘 하기/내일 하기/날짜 바꾸기, 카테고리 순서 변경
- 뽀모도로 타이머: 할 일에서 바로 시작, 끝나면 그 할 일에 집중 시간 기록 (🍅 25분)
- 팔로우/팔로워, 친구의 할 일 보기 (카테고리마다 🔒 나만 보기 가능)
- 친구가 완료한 일에 감정표현 (❤️ 👍 🎉 👏 🔥 😂 😢)
- 오프라인 우선: 로그인 없이도 이 기기에 저장, 로그인하면 자동 동기화 (실시간)
- 다크 모드

## 기술 구성
- React + TypeScript + Vite, PWA (manifest + service worker)
- Supabase: 이메일 링크 로그인, Postgres(행 단위 보안), Realtime
- 나중에 안드로이드/아이폰 앱을 만들 때도 같은 Supabase를 그대로 씀

## 실행
```bash
npm install
npm run dev        # 서버 없이 로컬 저장 모드로 실행
```

## 동기화 켜기 (Supabase)
1. https://supabase.com 에서 무료 프로젝트 생성
2. SQL Editor 에 `supabase/schema.sql` 전체를 붙여넣고 실행 (여러 번 실행해도 안전)
3. Project Settings > API 의 URL 과 anon key 를 `.env.local` 에 넣기 (`.env.example` 참고)
4. Authentication > URL Configuration 의 Site URL / Redirect URLs 에 앱 주소 추가 (예: `http://localhost:5173`, 배포 주소)

## 배포
`npm run build` 후 `dist/` 를 Vercel, Netlify, Cloudflare Pages 등에 올리면 됩니다. 환경 변수 두 개(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)를 배포 설정에 넣어 주세요.

## 구조
- `src/store.ts` 로컬 저장소 (localStorage), 변경 추적
- `src/sync.ts` Supabase 와 주고받기 (변경분 업로드, `synced_at` 이후 변경분 다운로드, 실시간 구독, 마지막 수정 우선)
- `src/pomodoro.ts` 타이머 (종료 시각 기준이라 새로고침해도 이어짐)
- `src/social.ts` 프로필, 팔로우, 감정표현
- `supabase/schema.sql` 테이블과 권한 규칙
