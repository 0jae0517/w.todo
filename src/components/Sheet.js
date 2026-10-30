import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
export default function Sheet({ title, onClose, children }) {
    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    return (_jsx("div", { className: "backdrop", onClick: onClose, children: _jsxs("div", { className: "sheet", role: "dialog", onClick: (e) => e.stopPropagation(), children: [_jsx("div", { className: "grabber" }), title && _jsx("h2", { className: "sheet-title", children: title }), children] }) }));
}
