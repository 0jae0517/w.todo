import { useEffect, useMemo, useState } from 'react'
import { STATUS_LABEL } from './components/Account'
import { NoticeBanner } from './components/Admin'
import Calendar, { type DayStat } from './components/Calendar'
import CategorySheet from './components/CategorySheet'
import DayList from './components/DayList'
import FriendStrip from './components/FriendStrip'
import FriendView from './components/FriendView'
import { FriendsSheet, OfficeTab, TemplatesTab, type FollowTab } from './components/Friends'
import { CheckIcon, CloudIcon, FriendsIcon, OfficeIcon, PersonIcon, PlusIcon, TableIcon, TemplateIcon, TimerIcon } from './components/Icons'
import Mascot, { ChalkFilter, type Mood } from './components/Mascot'
import Me from './components/Me'
import Pomodoro from './components/Pomodoro'
import { TemplateView } from './components/Templates'
import Timetable, { CourseSheet, DayClasses } from './components/Timetable'
import TodoSheet from './components/TodoSheet'
import { dayLabel, todayKey } from './date'
import { holidayName } from './holidays'
import { startNative } from './native'
import { useAnnouncement } from './admin'
import { useOfficePresence } from './office'
import { useMyReactions, type Profile } from './social'
import { useStore } from './store'
import { currentUserId, useSync } from './sync'
import { useTimetableOn } from './timetable'

type Tab = 'todos' | 'timetable' | 'timer' | 'office' | 'templates' | 'me'
type Panel = { kind: 'todo'; id: string } | { kind: 'course'; id: string } | { kind: 'categories' } | null

const TITLES: Record<Tab, string> = { todos: 'w.todo', timetable: '시간표', timer: '뽀모도로', office: '오피스', templates: '템플릿', me: '내 정보' }

export default function App() {
  const { categories, todos, courses } = useStore()
  // 시간표 is for university students: shown once turned on, or once there are classes
  const showTimetable = useTimetableOn() || courses.length > 0
  const { status } = useSync()
  const [tab, setTab] = useState<Tab>('todos')
  const [selected, setSelected] = useState(todayKey)
  const [mode, setMode] = useState<'week' | 'month'>('month')
  const [panel, setPanel] = useState<Panel>(null)
  const [friend, setFriend] = useState<Profile | null>(null)
  // the friends popup, opened from the todo screen, 내 정보 or the office
  const [friends, setFriends] = useState<{ tab?: FollowTab; friend?: Profile } | null>(null)
  // a shared template link: ?t=<id>
  const [templateId, setTemplateId] = useState(() => {
    const id = new URLSearchParams(location.search).get('t')
    if (id) history.replaceState(null, '', location.pathname)
    return id
  })
  useEffect(() => startNative(setTemplateId), [])
  useOfficePresence()
  const { notice, close: closeNotice } = useAnnouncement()

  const stats = useMemo(() => {
    const m = new Map<string, DayStat>()
    for (const t of todos) {
      const s = m.get(t.date) ?? { total: 0, left: 0 }
      s.total++
      if (!t.done) s.left++
      m.set(t.date, s)
    }
    return m
  }, [todos])

  const dayTodos = todos.filter((t) => t.date === selected)
  const reactions = useMyReactions(dayTodos.filter((t) => t.done).map((t) => t.id))
  const openTodo = panel?.kind === 'todo' ? todos.find((t) => t.id === panel.id) : undefined

  return (
    <div className="app">
      <ChalkFilter />
      <header className="top">
        <h1>{TITLES[tab]}</h1>
        <div className="top-actions">
          {tab === 'todos' && (
            <button className="icon-btn" onClick={() => setFriends({})} aria-label="친구" title="친구">
              <FriendsIcon />
            </button>
          )}
          {tab === 'todos' && !friend && (
            <button className="icon-btn" onClick={() => setPanel({ kind: 'categories' })} aria-label="카테고리 추가" title="카테고리 추가">
              <PlusIcon />
            </button>
          )}
          <button className="icon-btn sync-btn" onClick={() => setTab('me')} aria-label={STATUS_LABEL[status]} title={STATUS_LABEL[status]}>
            <CloudIcon />
            <span className={`dot s-${status}`} />
          </button>
        </div>
      </header>

      {tab === 'todos' && notice && <NoticeBanner notice={notice} onClose={closeNotice} />}
      {tab === 'todos' && <FriendStrip selected={friend} onSelect={setFriend} onFind={() => setFriends({})} />}
      {tab === 'todos' && friend && (
        <main>
          <FriendView key={friend.id} friend={friend} />
        </main>
      )}
      {tab === 'todos' && !friend && (
        <>
          <Calendar
            selected={selected}
            onSelect={setSelected}
            mode={mode}
            onModeChange={setMode}
            stats={stats}
          />
          <main>
            <h2 className="day-title">
            {dayLabel(selected)}
            {holidayName(selected) && <span className="holiday"> · {holidayName(selected)}</span>}
          </h2>
            <DayClasses date={selected} onOpen={(c) => setPanel({ kind: 'course', id: c.id })} />
            <DayList
              date={selected}
              categories={categories}
              todos={dayTodos}
              reactions={reactions}
              myId={currentUserId()}
              onOpenTodo={(id) => setPanel({ kind: 'todo', id })}
            />
            <DayMascot todos={dayTodos} isToday={selected === todayKey()} />
          </main>
        </>
      )}
      {tab === 'timetable' && <Timetable />}
      {tab === 'timer' && <Pomodoro todos={todos} />}
      {tab === 'office' && <OfficeTab onLogin={() => setTab('me')} onOpenFriend={(p) => setFriends({ friend: p })} />}
      {tab === 'templates' && <TemplatesTab />}
      {tab === 'me' && <Me todos={todos} categories={categories} onOpenFollows={(t) => setFriends({ tab: t })} />}

      <nav className="tabbar">
        <button className={tab === 'todos' ? 'on' : ''} onClick={() => setTab('todos')}>
          <CheckIcon />할 일
        </button>
        {showTimetable && (
          <button className={tab === 'timetable' ? 'on' : ''} onClick={() => setTab('timetable')}>
            <TableIcon />시간표
          </button>
        )}
        <button className={tab === 'timer' ? 'on' : ''} onClick={() => setTab('timer')}>
          <TimerIcon />타이머
        </button>
        <button className={tab === 'office' ? 'on' : ''} onClick={() => setTab('office')}>
          <OfficeIcon />오피스
        </button>
        <button className={tab === 'templates' ? 'on' : ''} onClick={() => setTab('templates')}>
          <TemplateIcon />템플릿
        </button>
        <button className={tab === 'me' ? 'on' : ''} onClick={() => setTab('me')}>
          <PersonIcon />내 정보
        </button>
      </nav>

      {openTodo && (
        <TodoSheet
          key={openTodo.id}
          todo={openTodo}
          categories={categories}
          reactions={reactions.get(openTodo.id) ?? []}
          onClose={() => setPanel(null)}
          onFocus={() => {
            setPanel(null)
            setTab('timer')
          }}
        />
      )}
      {friends && <FriendsSheet tab={friends.tab} friend={friends.friend} onClose={() => setFriends(null)} onLogin={() => setTab('me')} />}
      {templateId && <TemplateView id={templateId} onClose={() => setTemplateId(null)} />}
      {panel?.kind === 'course' && courses.some((c) => c.id === panel.id) && (
        <CourseSheet course={courses.find((c) => c.id === panel.id)} onClose={() => setPanel(null)} />
      )}
      {panel?.kind === 'categories' && <CategorySheet categories={categories} onClose={() => setPanel(null)} />}
    </div>
  )
}

/** 토도 under the day's list, cheering on what's left. */
function DayMascot({ todos, isToday }: { todos: { done: boolean }[]; isToday: boolean }) {
  const left = todos.filter((t) => !t.done).length
  const [mood, text]: [Mood, string] = !todos.length
    ? ['sleep', isToday ? '오늘은 할 일이 없어요' : '이 날은 할 일이 없어요']
    : !left
      ? ['happy', isToday ? '오늘 할 일 끝! 최고야' : '다 끝냈어!']
      : ['base', `${left}개 남았어!`]
  return (
    <div className="day-mascot">
      <span className="speech">{text}</span>
      <Mascot mood={mood} size={84} />
    </div>
  )
}
