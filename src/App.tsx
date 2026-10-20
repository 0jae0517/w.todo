import { useMemo, useState } from 'react'
import { STATUS_LABEL } from './components/Account'
import Calendar, { type DayStat } from './components/Calendar'
import CategorySheet from './components/CategorySheet'
import DayList from './components/DayList'
import FriendStrip from './components/FriendStrip'
import FriendView from './components/FriendView'
import Friends from './components/Friends'
import { CheckIcon, CloudIcon, FriendsIcon, PersonIcon, PlusIcon, TimerIcon } from './components/Icons'
import Me from './components/Me'
import Pomodoro from './components/Pomodoro'
import { TemplateView } from './components/Templates'
import TodoSheet from './components/TodoSheet'
import { dayLabel, todayKey } from './date'
import { holidayName } from './holidays'
import { useMyReactions, type Profile } from './social'
import { useStore } from './store'
import { currentUserId, useSync } from './sync'

type Tab = 'todos' | 'timer' | 'friends' | 'me'
type Panel = { kind: 'todo'; id: string } | { kind: 'categories' } | null

const TITLES: Record<Tab, string> = { todos: 'w.todo', timer: '뽀모도로', friends: '친구', me: '내 정보' }

export default function App() {
  const { categories, todos } = useStore()
  const { status } = useSync()
  const [tab, setTab] = useState<Tab>('todos')
  const [selected, setSelected] = useState(todayKey)
  const [mode, setMode] = useState<'week' | 'month'>('month')
  const [panel, setPanel] = useState<Panel>(null)
  const [friend, setFriend] = useState<Profile | null>(null)
  // a shared template link: ?t=<id>
  const [templateId, setTemplateId] = useState(() => {
    const id = new URLSearchParams(location.search).get('t')
    if (id) history.replaceState(null, '', location.pathname)
    return id
  })

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
      <header className="top">
        <h1>{TITLES[tab]}</h1>
        <div className="top-actions">
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

      {tab === 'todos' && <FriendStrip selected={friend} onSelect={setFriend} onFind={() => setTab('friends')} />}
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
            <DayList
              date={selected}
              categories={categories}
              todos={dayTodos}
              reactions={reactions}
              myId={currentUserId()}
              onOpenTodo={(id) => setPanel({ kind: 'todo', id })}
            />
          </main>
        </>
      )}
      {tab === 'timer' && <Pomodoro todos={todos} />}
      {tab === 'friends' && <Friends onLogin={() => setTab('me')} />}
      {tab === 'me' && <Me todos={todos} categories={categories} />}

      <nav className="tabbar">
        <button className={tab === 'todos' ? 'on' : ''} onClick={() => setTab('todos')}>
          <CheckIcon />할 일
        </button>
        <button className={tab === 'timer' ? 'on' : ''} onClick={() => setTab('timer')}>
          <TimerIcon />타이머
        </button>
        <button className={tab === 'friends' ? 'on' : ''} onClick={() => setTab('friends')}>
          <FriendsIcon />친구
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
      {templateId && <TemplateView id={templateId} onClose={() => setTemplateId(null)} />}
      {panel?.kind === 'categories' && <CategorySheet categories={categories} onClose={() => setPanel(null)} />}
    </div>
  )
}
