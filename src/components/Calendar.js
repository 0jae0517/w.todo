import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { holidayName } from '../holidays';
import { WEEKDAYS, addDays, addMonths, fromKey, monthGrid, monthLabel, todayKey, weekOf } from '../date';
import { CheckMarkIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons';
export default function Calendar({ selected, onSelect, mode, onModeChange, stats }) {
    const today = todayKey();
    const days = mode === 'week' ? weekOf(selected) : monthGrid(selected);
    const month = fromKey(selected).getMonth();
    const step = (dir) => onSelect(mode === 'week' ? addDays(selected, dir * 7) : addMonths(selected, dir));
    return (_jsxs("section", { className: "calendar", children: [_jsxs("div", { className: "cal-head", children: [_jsx("button", { className: "icon-btn", onClick: () => step(-1), "aria-label": "\uC774\uC804", children: _jsx(ChevronLeftIcon, {}) }), _jsx("span", { className: "cal-title", children: monthLabel(selected) }), _jsx("button", { className: "icon-btn", onClick: () => step(1), "aria-label": "\uB2E4\uC74C", children: _jsx(ChevronRightIcon, {}) }), _jsxs("span", { className: "cal-tools", children: [selected !== today && (_jsx("button", { className: "pill", onClick: () => onSelect(today), children: "\uC624\uB298" })), _jsxs("span", { className: "mode-seg", role: "group", "aria-label": "\uBCF4\uAE30", children: [_jsx("button", { className: mode === 'week' ? 'on' : '', onClick: () => onModeChange('week'), "aria-pressed": mode === 'week', children: "\uC8FC" }), _jsx("button", { className: mode === 'month' ? 'on' : '', onClick: () => onModeChange('month'), "aria-pressed": mode === 'month', children: "\uC6D4" })] })] })] }), _jsxs("div", { className: "cal-grid", children: [WEEKDAYS.map((w, i) => (_jsx("div", { className: `cal-wd ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}`, children: w }, w))), days.map((key) => {
                        const s = stats.get(key);
                        const d = fromKey(key);
                        const outside = mode === 'month' && d.getMonth() !== month;
                        const holiday = holidayName(key);
                        const dayColor = holiday || d.getDay() === 0 ? 'red' : d.getDay() === 6 ? 'blue' : '';
                        const cls = ['cal-day', outside && 'outside', key === selected && 'selected', key === today && 'today', dayColor]
                            .filter(Boolean)
                            .join(' ');
                        return (_jsxs("button", { className: cls, onClick: () => onSelect(key), "aria-label": holiday ? `${key} ${holiday}` : key, title: holiday, children: [_jsx("span", { className: `mark ${s?.total ? (s.left ? 'has-left' : 'all-done') : ''}`, children: s?.total ? s.left || _jsx(CheckMarkIcon, {}) : '' }), _jsx("span", { className: "num", children: d.getDate() })] }, key));
                    })] })] }));
}
