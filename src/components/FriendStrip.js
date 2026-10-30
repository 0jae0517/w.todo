import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { listFollowing, useMyProfile } from '../social';
import { useSync } from '../sync';
const initial = (p) => (p.name || p.username).slice(0, 1).toUpperCase();
/** Row of avatars above the calendar: me, then everyone I follow (like Todomate). */
export default function FriendStrip({ selected, onSelect, onFind }) {
    const { session } = useSync();
    const { profile } = useMyProfile();
    const [following, setFollowing] = useState([]);
    useEffect(() => {
        if (!session)
            return setFollowing([]);
        listFollowing().then(setFollowing).catch(() => { });
    }, [session]);
    if (!session || !profile)
        return null;
    return (_jsxs("div", { className: "friend-strip", children: [_jsxs("button", { className: `strip-item ${selected ? '' : 'on'}`, onClick: () => onSelect(null), children: [_jsx("span", { className: "avatar", children: initial(profile) }), _jsx("span", { className: "strip-name", children: "\uB098" })] }), following.map((p) => (_jsxs("button", { className: `strip-item ${selected?.id === p.id ? 'on' : ''}`, onClick: () => onSelect(p), children: [_jsx("span", { className: "avatar", children: initial(p) }), _jsx("span", { className: "strip-name", children: p.name || p.username })] }, p.id))), _jsxs("button", { className: "strip-item", onClick: onFind, "aria-label": "\uCE5C\uAD6C \uCC3E\uAE30", children: [_jsx("span", { className: "avatar add", children: "+" }), _jsx("span", { className: "strip-name", children: "\uCE5C\uAD6C \uCC3E\uAE30" })] })] }));
}
