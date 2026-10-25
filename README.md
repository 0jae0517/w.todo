# w.todo

친구와 할 일을 공유하고, 다른 사람의 루틴을 가져오고, 나에게 맞는 집중 시간을 찾는 할 일 앱

- **친구와 할 일 공유**: 서로의 오늘 할 일을 보고, 완료한 일에 감정표현으로 응원
- **루틴 가져오기**: 다른 사람이 공유한 실용적인 루틴을 템플릿으로 받아 내 할 일에 바로 추가
- **나에게 맞는 집중 시간 찾기**: 뽀모도로 기록으로 내가 언제, 얼마나 잘 집중하는지 확인
- 휴대폰·컴퓨터 어디서든 같은 할 일 (실시간 동기화, 홈 화면에 추가하는 웹 앱)
- 배포 주소: https://w-todo-seven.vercel.app

<p>
  <img src="docs/screenshots/friend.png" width="240" alt="친구 할 일 보기">
  <img src="docs/screenshots/template-view.png" width="240" alt="루틴 템플릿">
  <img src="docs/screenshots/me-focus.png" width="240" alt="집중 패턴">
</p>

## 주요 기능

### 1. 친구와 할 일 공유
- 화면 위쪽 친구 목록: 이름을 누르면 그 친구의 달력과 오늘 할 일 보기
- 친구가 완료한 일에 감정표현 (❤️ 👍 🎉 👏 🔥 😂 😢, 1인 1개)
- 승인제 팔로우: 요청을 수락한 사람만 내 할 일을 볼 수 있음
- 카테고리마다 공개 범위 선택: 팔로워 공개 / 일부 공개(선택한 팔로워만) / 나만 보기

| 친구 할 일 보기 |
|---|
| <img src="docs/screenshots/friend.png" width="260"> |

### 2. 다른 사람의 루틴 가져오기 (템플릿)
- 내 카테고리의 할 일·반복 루틴을 템플릿으로 묶어 공유 (노션 템플릿처럼)
- 템플릿 둘러보기·검색, 많이 쓰인 순으로 정렬
- "내 할 일에 추가" 한 번으로 반복 요일·시간까지 그대로 적용
- 목록에 공개하거나 링크로만 공유, 링크는 로그인 없이도 미리보기 가능

| 템플릿 목록 | 템플릿 상세 |
|---|---|
| <img src="docs/screenshots/templates.png" width="260"> | <img src="docs/screenshots/template-view.png" width="260"> |

### 3. 나에게 맞는 집중 시간 찾기
- 할 일에서 바로 뽀모도로 시작, 끝나면 집중 시간이 그 할 일에 누적 (🍅 25분)
- 집중 패턴: 요일×시간대별로 언제 가장 많이 집중했는지 표시 (예: "일요일 오후 12시~3시에 가장 많이 집중했어요")
- 가장 오래 집중한 일, 카테고리별 집중 시간
- 집중 / 짧은 휴식 / 긴 휴식 시간 직접 설정, 새로고침해도 타이머 유지

| 뽀모도로 | 집중 패턴 |
|---|---|
| <img src="docs/screenshots/timer.png" width="260"> | <img src="docs/screenshots/me-focus.png" width="260"> |

### 4. 할 일 관리
- 월간 달력이 첫 화면, 오른쪽 `주 | 월` 버튼으로 주간 보기 전환
- 날짜마다 남은 할 일 수 표시 (다 끝내면 체크)
- 한국 공휴일 표시: 일요일·공휴일 빨강, 토요일 파랑
- 카테고리별 색상, 카테고리 이름을 길게 눌러 끌면 순서 변경
- 카테고리 안의 할 일도 길게 눌러 끌면 순서 변경 (시간을 정하면 시간 순서 자리로 먼저 들어감)
- 카테고리 접기: 접으면 `완료/전체` 개수만 표시 (예: 1/2)
- 완료한 일은 줄긋기
- 할 일마다 시간 지정 (다이얼식 선택기)
- 반복 할 일: 매일·평일·주말·요일 선택, 목록에 반복 요일 표시 (예: 평일, 월·수·금)
- 반복 할 일의 제목·시간을 바꾸면 이후 반복분에도 반영
- 내일 하기 / 날짜 바꾸기

| 카테고리 접기 | 할 일 상세 |
|---|---|
| <img src="docs/screenshots/fold.png" width="260"> | <img src="docs/screenshots/todo-sheet.png" width="260"> |

### 5. 대학생 시간표
- 내 정보 → "대학생 시간표"를 켜면 시간표 탭이 생김 (에브리타임처럼 주간 표)
- 수업 이름, 강의실, 색상, 요일·시간 여러 개 입력 (예: 월·수 9:00~10:15)
- 학기 기간 동안 매주 그날 수업이 할 일 화면 맨 위에 자동으로 표시, 공휴일엔 빠짐
- 개강·종강일은 시간표 위쪽 학기 이름을 눌러 수정
- 시간표는 나만 보기 (친구에게 공개되지 않음)

| 시간표 | 할 일 화면의 수업 |
|---|---|
| <img src="docs/screenshots/timetable.png" width="260"> | <img src="docs/screenshots/timetable-day.png" width="260"> |

### 6. 기록 (내 정보)
- 요약: 완료한 일, 이번 주 달성률, 총 집중 시간, 연속 달성일, 최근 7일
- 잔디: 활동 히트맵 (3달씩 보이고 옆으로 넘겨 1년까지), 카테고리별로 보기
- 집중: 요일×시간대별 집중 패턴, 가장 오래 집중한 일
- 회고: 지난달·이번 달·올해 회고 카드, 이미지로 저장·공유

| 요약 | 잔디 | 집중 | 회고 |
|---|---|---|---|
| <img src="docs/screenshots/me-summary.png" width="190"> | <img src="docs/screenshots/me-grass.png" width="190"> | <img src="docs/screenshots/me-focus.png" width="190"> | <img src="docs/screenshots/me-recap.png" width="190"> |

### 7. 테마
- 기본 테마 (시스템 다크 모드 자동 지원), 대표 색 `#5E6AD2`
- 아이콘은 모두 SVG 선 아이콘 (어떤 휴대폰에서도 같은 모양)
- 칠판 테마: 남색 칠판 배경, 손글씨 폰트, 분필 질감의 캐릭터 "토도"
  - 토도가 남은 할 일 수를 말풍선으로 알려 줌 (할 일 없음: 잠, 다 끝냄: 만세)
  - 뽀모도로 중엔 머리띠를 두르고 집중
- 테마는 기기마다 따로 저장

| 칠판 테마 | 칠판 테마 뽀모도로 |
|---|---|
| <img src="docs/screenshots/chalk-home.png" width="260"> | <img src="docs/screenshots/chalk-timer.png" width="260"> |

### 8. 계정·동기화
- 로그인 없이도 이 기기에 저장 (오프라인 우선)
- 로그인 방법: 이메일 링크, 이메일+비밀번호, 구글, 카카오
- 로그인하면 기기 간 자동 동기화 (실시간, 마지막 수정 우선)
- 로그아웃 시 동기화를 마친 뒤 기기에 남은 데이터 삭제

## 기술 구성
- 프론트엔드: React 19, TypeScript, Vite, PWA (manifest + service worker)
- 백엔드: Supabase
  - 인증, Postgres, Realtime
  - 모든 테이블에 행 단위 보안(RLS) 적용
- 외부 UI·달력 라이브러리 없이 직접 구현

## 실행
```bash
npm install
npm run dev        # Supabase 설정이 없으면 로컬 저장 모드로 실행
npm run build      # 타입 검사 + 빌드 (dist/)
```

## Supabase 설정
1. https://supabase.com 에서 프로젝트 생성
2. SQL Editor에 `supabase/schema.sql` 전체를 붙여넣고 실행
   - 여러 번 실행해도 안전, 스키마가 바뀌면 전체 재실행
3. `.env.example`을 참고해 `.env.local` 작성
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
4. Authentication → URL Configuration의 Redirect URLs에 앱 주소 추가
   - 예: `http://localhost:5173`, 배포 주소
- 소셜 로그인 설정: [docs/social-login.md](docs/social-login.md)

## 배포
- Vercel에 GitHub 저장소 연결 → `main`에 푸시하면 자동 배포
- 배포 설정에 환경 변수 두 개 (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) 추가

## 폴더 구조
```
src/
  store.ts       로컬 저장소 (localStorage), 변경 추적, 반복 할 일 생성
  sync.ts        Supabase 동기화 (변경분 업로드/다운로드, 실시간 구독), 로그인·로그아웃
  social.ts      프로필, 팔로우 요청·수락, 감정표현
  templates.ts   템플릿 만들기·공유·적용
  pomodoro.ts    타이머 (종료 시각 기준)
  theme.ts       테마 (기본 / 칠판)
  timetable.ts   대학생 시간표 (학기 기간, 날짜별 수업)
  holidays.ts    한국 공휴일
  viewport.ts    아이폰 키보드가 올라올 때 아래 창 위치 맞추기
  components/    화면 컴포넌트 (달력, 할 일 목록, 잔디, 회고 카드, 캐릭터 등)
supabase/schema.sql  테이블, 권한 규칙(RLS), 함수
docs/                설정 안내서, 스크린샷
```

## 앞으로 할 일
- 친구와 시간표 공유, 공강 시간 보기
- 개인정보처리방침 페이지, 앱 안에서 계정 삭제
