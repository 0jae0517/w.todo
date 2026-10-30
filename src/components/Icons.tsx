const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', viewBox: '0 0 24 24' } as const

export const CheckIcon = () => (
  <svg {...base}><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M8.5 12.5l2.5 2.5 4.5-5" /></svg>
)
export const TimerIcon = () => (
  <svg {...base}><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M9.5 2.5h5" /></svg>
)
export const FriendsIcon = () => (
  <svg {...base}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" /><path d="M16 4.8a3.3 3.3 0 010 6.4M18 14.8c2 .6 3.2 2.4 3.5 5.2" /></svg>
)
export const TagIcon = () => (
  <svg {...base}><path d="M3 12V4a1 1 0 011-1h8l9 9-9 9z" /><circle cx="8" cy="8" r="1.5" /></svg>
)
export const CloudIcon = () => (
  <svg {...base}><path d="M7 18h10.5a4 4 0 00.6-7.95A6 6 0 006.3 9.1 4.5 4.5 0 007 18z" /></svg>
)
export const PersonIcon = () => (
  <svg {...base}><circle cx="12" cy="8" r="4" /><path d="M4 21c.8-4.2 4-6.5 8-6.5s7.2 2.3 8 6.5" /></svg>
)
export const TableIcon = () => (
  <svg {...base}><rect x="3.5" y="4" width="17" height="16" rx="3" /><path d="M3.5 9h17M9 9v11M14.5 9v11" /></svg>
)
export const PlusIcon = () => (
  <svg {...base}><path d="M12 5v14M5 12h14" /></svg>
)
export const LockIcon = () => (
  <svg {...base}><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8 10.5V8a4 4 0 018 0v2.5" /></svg>
)
export const ShareIcon = () => (
  <svg {...base}><path d="M12 15V3.5M7.5 8L12 3.5 16.5 8" /><path d="M5 12.5V18a2 2 0 002 2h10a2 2 0 002-2v-5.5" /></svg>
)
export const TrashIcon = () => (
  <svg {...base}><path d="M4 6.5h16M9.5 6.5V4.5h5v2M6.5 6.5l.8 12.2a2 2 0 002 1.8h5.4a2 2 0 002-1.8l.8-12.2M10 10.5v6M14 10.5v6" /></svg>
)
export const RepeatIcon = () => (
  <svg {...base}><path d="M17 3.5l3 3-3 3" /><path d="M4 11.5v-1a4 4 0 014-4h12M7 20.5l-3-3 3-3" /><path d="M20 12.5v1a4 4 0 01-4 4H4" /></svg>
)
export const GlobeIcon = () => (
  <svg {...base}><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.4 2.4 3.5 5.2 3.5 8.5s-1.1 6.1-3.5 8.5c-2.4-2.4-3.5-5.2-3.5-8.5s1.1-6.1 3.5-8.5z" /></svg>
)
export const LinkIcon = () => (
  <svg {...base}><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" /></svg>
)
export const PencilIcon = () => (
  <svg {...base}><path d="M4 20h4L19 9a2.8 2.8 0 00-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></svg>
)
export const CloseIcon = () => (
  <svg {...base}><path d="M6 6l12 12M18 6L6 18" /></svg>
)
/** Pomodoro (focus time) mark. */
export const TomatoIcon = () => (
  <svg {...base} className="i-tomato"><path d="M12 7.5c-4.7 0-8 2.8-8 6.4S7.3 20.5 12 20.5s8-3 8-6.6-3.3-6.4-8-6.4z" /><path d="M12 7.5V4.5M12 7.5L9 5.5M12 7.5l3-2M12 7.5l-3.5 1.5M12 7.5l3.5 1.5" /></svg>
)
export const SmilePlusIcon = () => (
  <svg {...base}><circle cx="11" cy="12.5" r="7.5" /><path d="M8.2 14.2c.7 1 1.7 1.5 2.8 1.5s2.1-.5 2.8-1.5M8.5 10.5h.01M13.5 10.5h.01M19 2.5v4M17 4.5h4" /></svg>
)
export const SparkleIcon = () => (
  <svg {...base}><path d="M12 3.5l1.8 5 5 1.8-5 1.8-1.8 5-1.8-5-5-1.8 5-1.8zM18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" /></svg>
)
export const CheckMarkIcon = () => (
  <svg {...base} strokeWidth={3}><path d="M5.5 12.5l4 4 9-9" /></svg>
)
export const MoreIcon = () => (
  <svg {...base}><path d="M6 12h.01M12 12h.01M18 12h.01" strokeWidth={3} /></svg>
)
export const ChevronLeftIcon = () => (
  <svg {...base}><path d="M15 5l-7 7 7 7" /></svg>
)
export const ChevronRightIcon = () => (
  <svg {...base}><path d="M9 5l7 7-7 7" /></svg>
)
export const ChevronDownIcon = () => (
  <svg {...base}><path d="M6 9l6 6 6-6" /></svg>
)
export const ResetIcon = () => (
  <svg {...base}><path d="M4 12a8 8 0 108-8 8.5 8.5 0 00-6 2.5L4 8.5" /><path d="M4 4v4.5h4.5" /></svg>
)
export const SkipIcon = () => (
  <svg {...base}><path d="M5.5 5.5l9 6.5-9 6.5z" /><path d="M18.5 5.5v13" /></svg>
)
export const OfficeIcon = () => (
  <svg {...base}><path d="M3 20h18M5 20v-8h14v8" /><rect x="8" y="5" width="8" height="5" rx="1" /><path d="M12 10v2" /></svg>
)
export const TemplateIcon = () => (
  <svg {...base}><rect x="7" y="3.5" width="13" height="13" rx="3" /><path d="M17 20.5H7a3 3 0 01-3-3v-10" /></svg>
)
