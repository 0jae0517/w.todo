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
