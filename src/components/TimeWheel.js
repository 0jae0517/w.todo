import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
const ITEM = 40;
const AMPM = ['오전', '오후'];
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
/** iOS-style scroll wheels for 오전/오후 · hour · minute (5-minute steps). */
export default function TimeWheel({ value, onDone, onClear, clearLabel = '시간 없음', }) {
    const [h, m] = (value ?? '09:00').split(':').map(Number);
    const [ampm, setAmpm] = useState(h < 12 ? 0 : 1);
    const [hour, setHour] = useState((h % 12 || 12) - 1);
    const [minute, setMinute] = useState(Math.min(11, Math.round(m / 5)));
    const done = () => {
        const h24 = ((hour + 1) % 12) + (ampm ? 12 : 0);
        onDone(`${String(h24).padStart(2, '0')}:${MINUTES[minute]}`);
    };
    return (_jsxs("div", { className: "wheel-box", children: [_jsxs("div", { className: "wheels", children: [_jsx("div", { className: "wheel-band" }), _jsx(Wheel, { items: AMPM, index: ampm, onChange: setAmpm }), _jsx(Wheel, { items: HOURS, index: hour, onChange: setHour }), _jsx(Wheel, { items: MINUTES, index: minute, onChange: setMinute })] }), _jsxs("div", { className: "actions", children: [_jsx("button", { onClick: onClear, children: clearLabel }), _jsx("button", { className: "primary", onClick: done, children: "\uD655\uC778" })] })] }));
}
function Wheel({ items, index, onChange }) {
    const ref = useRef(null);
    const timer = useRef(undefined);
    useEffect(() => {
        ref.current?.scrollTo({ top: index * ITEM });
        // only on mount: afterwards the scroll position is the source of truth
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return (_jsx("div", { ref: ref, className: "wheel", onScroll: (e) => {
            const el = e.currentTarget;
            clearTimeout(timer.current);
            timer.current = setTimeout(() => {
                const i = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / ITEM)));
                if (i !== index)
                    onChange(i);
            }, 80);
        }, children: items.map((label, i) => (_jsx("div", { className: `wheel-item ${i === index ? 'on' : ''}`, onClick: () => ref.current?.scrollTo({ top: i * ITEM, behavior: 'smooth' }), children: label }, label))) }));
}
