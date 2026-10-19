import { useMemo, useState } from 'react'
import AccountSheet, { STATUS_LABEL } from './components/AccountSheet'
import Calendar, { type DayStat } from './components/Calendar'
import CategorySheet from './components/CategorySheet'
import DayList from './components/DayList'
import Friends from './components/Friends'
import { CheckIcon, CloudIcon, FriendsIcon, TagIcon, TimerIcon } from './components/Icons'
import Pomodoro from './components/Pomodoro'
import TodoSheet from './components/TodoSheet'
import { dayLabel, todayKey } from './date'
import { useMyReactions } from './social'
import { useStore } from './store'
import { currentUserId, useSync } from './sync'

type Tab = 'todos' | 'timer' | 'friends'
type Panel = { kind: 'todo'; id: string } | { kind: 'categories' } | { kind: 'account' } | null

const TITLES: Record<Tab, string> = { todos: '할 일', timer: '뽀모도로', friends: '친구' }

export default function App() {
  const { categories, todos } = useStore()
  const { status } = useSync()
  const [tab, setTab] = useState<Tab>('todos')
  const [selected, setSelected] = useState(todayKey)
  const [mode, setMode] = useState<'week' | 'month'>(() => (localStorage.getItem('cal-mode') === 'month' ? 'month' : 'week'))
  const [panel, setPanel] = useState<Panel>(null)

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
          {tab === 'todos' && (
            <button className="icon-btn" onClick={() => setPanel({ kind: 'categories' })} aria-label="분류 관리">
              <TagIcon />
            </button>
          )}
          <button className="icon-btn sync-btn" onClick={() => setPanel({ kind: 'account' })} aria-label={STATUS_LABEL[status]} title={STATUS_LABEL[status]}>
            <CloudIcon />
            <span className={`dot s-${status}`} />
          </button>
        </div>
      </header>

      {tab === 'todos' && (
        <>
          <Calendar
            selected={selected}
            onSelect={setSelected}
            mode={mode}
            onModeChange={(m) => {
              setMode(m)
              localStorage.setItem('cal-mode', m)
            }}
            stats={stats}
          />
          <main>
            <h2 className="day-title">{dayLabel(selected)}</h2>
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
      {tab === 'friends' && <Friends onLogin={() => setPanel({ kind: 'account' })} />}

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
      {panel?.kind === 'categories' && <CategorySheet categories={categories} onClose={() => setPanel(null)} />}
      {panel?.kind === 'account' && <AccountSheet onClose={() => setPanel(null)} />}
    </div>
  )
}
