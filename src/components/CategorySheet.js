import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { listFollowers } from '../social';
import { PALETTE, addCategory, deleteCategory, setVisibility, updateCategory } from '../store';
import { useSync } from '../sync';
import { FriendsIcon, LockIcon, PersonIcon, PlusIcon, ShareIcon, TrashIcon } from './Icons';
import Sheet from './Sheet';
import { TemplateMaker } from './Templates';
export default function CategorySheet({ categories, onClose }) {
    const [name, setName] = useState('');
    const [picking, setPicking] = useState(null);
    const [visFor, setVisFor] = useState(null);
    const [sharing, setSharing] = useState(null);
    const add = () => {
        if (name.trim())
            addCategory(name.trim());
        setName('');
    };
    // shown in place of this sheet; a sheet inside a sheet gets clipped
    if (sharing)
        return _jsx(TemplateMaker, { category: sharing, onClose: () => setSharing(null) });
    return (_jsxs(Sheet, { title: "\uCE74\uD14C\uACE0\uB9AC \uAD00\uB9AC", onClose: onClose, children: [_jsx("p", { className: "sheet-sub", children: "\uC21C\uC11C\uB294 \uD560 \uC77C \uD654\uBA74\uC5D0\uC11C \uCE74\uD14C\uACE0\uB9AC \uC774\uB984\uC744 \uAE38\uAC8C \uB20C\uB7EC \uB04C\uBA74 \uBC14\uB00C\uC5B4\uC694." }), _jsx("ul", { className: "cat-list", children: categories.map((c) => (_jsxs("li", { children: [_jsxs("div", { className: "cat-row", children: [_jsx("button", { className: "swatch", style: { background: c.color }, onClick: () => setPicking(picking === c.id ? null : c.id), "aria-label": "\uC0C9 \uBC14\uAFB8\uAE30" }), _jsx("input", { defaultValue: c.name, onBlur: (e) => {
                                        const v = e.target.value.trim();
                                        if (v && v !== c.name)
                                            updateCategory(c.id, { name: v });
                                    } }), _jsx("button", { className: "icon-btn", onClick: () => setSharing(c), "aria-label": "\uD15C\uD50C\uB9BF\uC73C\uB85C \uACF5\uC720", title: "\uD15C\uD50C\uB9BF\uC73C\uB85C \uACF5\uC720", children: _jsx(ShareIcon, {}) }), _jsx("button", { className: "icon-btn", onClick: () => confirm(`'${c.name}' 카테고리와 그 안의 할 일을 모두 삭제할까요?`) && deleteCategory(c.id), "aria-label": "\uC0AD\uC81C", title: "\uC0AD\uC81C", children: _jsx(TrashIcon, {}) })] }), _jsxs("button", { className: `vis-chip ${visFor === c.id ? 'open' : ''}`, onClick: () => setVisFor(visFor === c.id ? null : c.id), "aria-expanded": visFor === c.id, children: [VIS[c.visibility].icon, VIS[c.visibility].label, _jsx("svg", { className: "chev", viewBox: "0 0 16 16", "aria-hidden": "true", children: _jsx("path", { d: "M4 6l4 4 4-4", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }) })] }), visFor === c.id && _jsx(VisibilityPanel, { category: c }), picking === c.id && (_jsx("div", { className: "palette", children: PALETTE.map((p) => (_jsx("button", { className: `swatch ${p === c.color ? 'on' : ''}`, style: { background: p }, onClick: () => {
                                    updateCategory(c.id, { color: p });
                                    setPicking(null);
                                }, "aria-label": p }, p))) }))] }, c.id))) }), _jsxs("div", { className: "cat-add", children: [_jsx("input", { autoFocus: true, placeholder: "\uC0C8 \uCE74\uD14C\uACE0\uB9AC \uCD94\uAC00", value: name, onChange: (e) => setName(e.target.value), onKeyDown: (e) => e.key === 'Enter' && !e.nativeEvent.isComposing && add() }), _jsx("button", { className: "primary icon-add", onClick: add, "aria-label": "\uCE74\uD14C\uACE0\uB9AC \uCD94\uAC00", title: "\uCE74\uD14C\uACE0\uB9AC \uCD94\uAC00", disabled: !name.trim(), children: _jsx(PlusIcon, {}) })] })] }));
}
const VIS = {
    followers: { icon: _jsx(FriendsIcon, {}), label: '팔로워 공개' },
    selected: { icon: _jsx(PersonIcon, {}), label: '일부 공개' },
    private: { icon: _jsx(LockIcon, {}), label: '나만 보기' },
};
function VisibilityPanel({ category }) {
    const { session } = useSync();
    const [followers, setFollowers] = useState(null);
    const selected = category.visibility === 'selected';
    useEffect(() => {
        if (!selected || !session)
            return;
        listFollowers().then(setFollowers).catch(() => setFollowers([]));
    }, [selected, session]);
    const toggle = (id) => {
        const ids = category.allowed_ids.includes(id) ? category.allowed_ids.filter((x) => x !== id) : [...category.allowed_ids, id];
        setVisibility(category.id, 'selected', ids);
    };
    return (_jsxs("div", { className: "vis-panel", children: [_jsx("div", { className: "vis-options", children: Object.keys(VIS).map((v) => (_jsxs("button", { className: category.visibility === v ? 'on' : '', onClick: () => setVisibility(category.id, v), children: [VIS[v].icon, " ", VIS[v].label] }, v))) }), selected &&
                (!session ? (_jsx("p", { className: "sheet-sub", children: "\uB85C\uADF8\uC778\uD558\uBA74 \uBCFC \uC218 \uC788\uB294 \uD314\uB85C\uC6CC\uB97C \uACE0\uB97C \uC218 \uC788\uC5B4\uC694." })) : followers === null ? (_jsx("p", { className: "sheet-sub", children: "\uD314\uB85C\uC6CC \uBD88\uB7EC\uC624\uB294 \uC911\u2026" })) : followers.length === 0 ? (_jsx("p", { className: "sheet-sub", children: "\uC544\uC9C1 \uD314\uB85C\uC6CC\uAC00 \uC5C6\uC5B4\uC694. \uD314\uB85C\uC6CC\uAC00 \uC0DD\uAE30\uBA74 \uC5EC\uAE30\uC11C \uACE0\uB97C \uC218 \uC788\uC5B4\uC694." })) : (_jsxs(_Fragment, { children: [_jsx("p", { className: "sheet-sub", children: "\uCCB4\uD06C\uD55C \uD314\uB85C\uC6CC\uB9CC \uC774 \uCE74\uD14C\uACE0\uB9AC\uB97C \uBCFC \uC218 \uC788\uC5B4\uC694." }), _jsx("ul", { className: "pick-list", children: followers.map((f) => (_jsx("li", { children: _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: category.allowed_ids.includes(f.id), onChange: () => toggle(f.id) }), f.name || f.username, " ", _jsxs("span", { className: "handle", children: ["@", f.username] })] }) }, f.id))) })] })))] }));
}
