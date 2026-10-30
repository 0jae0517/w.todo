import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useState } from 'react';
import { EMOJIS } from '../social';
import { CloseIcon, SmilePlusIcon } from './Icons';
export default function ReactionBar({ list, myId, onPick }) {
    const [open, setOpen] = useState(false);
    const groups = new Map();
    for (const r of list)
        groups.set(r.emoji, [...(groups.get(r.emoji) ?? []), r]);
    const mine = list.find((r) => r.user_id === myId)?.emoji ?? null;
    if (!groups.size && !onPick)
        return null;
    return (_jsxs("div", { className: "reactions", children: [[...groups].map(([emoji, rs]) => (_jsxs("button", { className: `chip ${emoji === mine ? 'mine' : ''}`, title: rs.map((r) => r.profile?.name || r.profile?.username || '').join(', '), onClick: () => onPick?.(emoji === mine ? null : emoji), disabled: !onPick, children: [emoji, " ", rs.length] }, emoji))), onPick && (_jsx("button", { className: "chip add", onClick: () => setOpen(!open), "aria-label": "\uAC10\uC815\uD45C\uD604", children: open ? _jsx(CloseIcon, {}) : _jsx(SmilePlusIcon, {}) })), open && onPick && (_jsx("div", { className: "picker", children: EMOJIS.map((e) => (_jsx("button", { className: e === mine ? 'mine' : '', onClick: () => {
                        onPick(e === mine ? null : e);
                        setOpen(false);
                    }, children: e }, e))) }))] }));
}
