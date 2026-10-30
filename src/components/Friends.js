import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { acceptRequest, follow, followingIds, listFollowers, listFollowing, listRequests, removeFollower, saveProfile, searchProfiles, unfollow, useMyProfile, } from '../social';
import { useSync } from '../sync';
import FriendView, { FOLLOW_LABEL } from './FriendView';
import Office from './Office';
import { TemplateGallery } from './Templates';
export default function Friends({ onLogin }) {
    const [view, setView] = useState('friends');
    // a friend tapped in the office opens on the 친구 page
    const [viewing, setViewing] = useState(null);
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "seg friends-seg", role: "tablist", children: [_jsx("button", { role: "tab", "aria-selected": view === 'friends', className: view === 'friends' ? 'on' : '', onClick: () => setView('friends'), children: "\uCE5C\uAD6C" }), _jsx("button", { role: "tab", "aria-selected": view === 'office', className: view === 'office' ? 'on' : '', onClick: () => setView('office'), children: "\uC624\uD53C\uC2A4" }), _jsx("button", { role: "tab", "aria-selected": view === 'templates', className: view === 'templates' ? 'on' : '', onClick: () => setView('templates'), children: "\uD15C\uD50C\uB9BF" })] }), view === 'friends' ? (_jsx(FriendsPanel, { onLogin: onLogin, viewing: viewing, setViewing: setViewing })) : view === 'office' ? (_jsx(FriendsPanel, { onLogin: onLogin, viewing: null, setViewing: setViewing, children: _jsx(Office, { onOpenFriend: (p) => {
                        setViewing(p);
                        setView('friends');
                    } }) })) : supabase ? _jsx(TemplateGallery, {}) : _jsx("p", { className: "empty", children: "\uB3D9\uAE30\uD654 \uC11C\uBC84\uAC00 \uC544\uC9C1 \uC5F0\uACB0\uB418\uC9C0 \uC54A\uC558\uC5B4\uC694." })] }));
}
/** Shows the friend list, or `children` instead, once signed in with a profile. */
function FriendsPanel({ onLogin, viewing, setViewing, children }) {
    const { session } = useSync();
    const { profile, reload } = useMyProfile();
    if (!supabase || !session) {
        return (_jsxs("div", { className: "friends-empty", children: [_jsx("p", { children: "\uD314\uB85C\uC6B0\uC640 \uAC10\uC815\uD45C\uD604\uC740 \uB85C\uADF8\uC778\uD558\uBA74 \uC4F8 \uC218 \uC788\uC5B4\uC694." }), supabase ? (_jsx("button", { className: "primary", onClick: onLogin, children: "\uB85C\uADF8\uC778" })) : (_jsx("p", { className: "sheet-sub", children: "\uB3D9\uAE30\uD654 \uC11C\uBC84\uAC00 \uC544\uC9C1 \uC5F0\uACB0\uB418\uC9C0 \uC54A\uC558\uC5B4\uC694." }))] }));
    }
    if (profile === undefined)
        return _jsx("p", { className: "empty", children: "\uBD88\uB7EC\uC624\uB294 \uC911\u2026" });
    if (profile === null)
        return _jsx(ProfileForm, { onSaved: reload });
    if (children)
        return children;
    if (viewing)
        return _jsx(FriendView, { friend: viewing, onBack: () => setViewing(null) });
    return _jsx(FriendHome, { me: profile, onOpen: setViewing, onEditProfile: reload });
}
export function ProfileForm({ onSaved, initial }) {
    const [username, setUsername] = useState(initial?.username ?? '');
    const [name, setName] = useState(initial?.name ?? '');
    const [err, setErr] = useState(null);
    const [busy, setBusy] = useState(false);
    return (_jsxs("form", { className: "login", onSubmit: async (e) => {
            e.preventDefault();
            setBusy(true);
            setErr(null);
            try {
                await saveProfile(username.trim().toLowerCase(), name.trim());
                onSaved();
            }
            catch (e) {
                setErr(e instanceof Error ? e.message : String(e));
            }
            finally {
                setBusy(false);
            }
        }, children: [_jsx("h2", { className: "sheet-title", children: initial ? '프로필 수정' : '프로필 만들기' }), _jsx("p", { className: "sheet-sub", children: "\uCE5C\uAD6C\uAC00 \uC544\uC774\uB514\uB85C \uB098\uB97C \uCC3E\uC544 \uD314\uB85C\uC6B0\uD560 \uC218 \uC788\uC5B4\uC694." }), _jsx("input", { required: true, placeholder: "\uC544\uC774\uB514 (\uC601\uBB38 \uC18C\uBB38\uC790, \uC22B\uC790, _ .)", value: username, pattern: "[a-zA-Z0-9_.]{3,20}", onChange: (e) => setUsername(e.target.value) }), _jsx("input", { placeholder: "\uC774\uB984 (\uC120\uD0DD)", value: name, onChange: (e) => setName(e.target.value) }), _jsx("button", { className: "primary", disabled: busy, children: "\uC800\uC7A5" }), err && _jsx("p", { className: "error", children: err })] }));
}
function FriendHome({ me, onOpen, onEditProfile }) {
    const [tab, setTab] = useState('following');
    const [following, setFollowing] = useState([]);
    const [followers, setFollowers] = useState([]);
    const [requests, setRequests] = useState([]);
    const [ids, setIds] = useState(new Map());
    const [q, setQ] = useState('');
    const [results, setResults] = useState(null);
    const [editing, setEditing] = useState(false);
    const [err, setErr] = useState(null);
    const refresh = () => Promise.all([listFollowing(), listFollowers(), followingIds(), listRequests()])
        .then(([a, b, c, d]) => {
        setFollowing(a);
        setFollowers(b);
        setIds(c);
        setRequests(d);
    })
        .catch((e) => setErr(e.message));
    useEffect(() => {
        refresh();
    }, []);
    useEffect(() => {
        if (!q.trim())
            return setResults(null);
        const t = setTimeout(() => searchProfiles(q).then(setResults).catch((e) => setErr(e.message)), 300);
        return () => clearTimeout(t);
    }, [q]);
    const run = async (action) => {
        setErr(null);
        try {
            await action;
            await refresh();
        }
        catch (e) {
            setErr(e instanceof Error ? e.message : String(e));
        }
    };
    if (editing)
        return _jsx(ProfileForm, { initial: me, onSaved: () => { setEditing(false); onEditProfile(); } });
    const list = results ?? (tab === 'following' ? following : followers);
    return (_jsxs("div", { className: "friends", children: [_jsxs("div", { className: "me-card", children: [_jsxs("div", { children: [_jsx("strong", { children: me.name || me.username }), _jsxs("span", { className: "handle", children: ["@", me.username] })] }), _jsx("button", { className: "link", onClick: () => setEditing(true), children: "\uC218\uC815" })] }), _jsxs("div", { className: "counts", children: [_jsxs("button", { className: tab === 'followers' && !results ? 'on' : '', onClick: () => { setQ(''); setTab('followers'); }, children: [_jsx("strong", { children: followers.length }), " \uD314\uB85C\uC6CC"] }), _jsxs("button", { className: tab === 'following' && !results ? 'on' : '', onClick: () => { setQ(''); setTab('following'); }, children: [_jsx("strong", { children: following.length }), " \uD314\uB85C\uC789"] })] }), _jsx("input", { className: "search", placeholder: "\uC544\uC774\uB514\uB098 \uC774\uB984\uC73C\uB85C \uCE5C\uAD6C \uCC3E\uAE30", value: q, onChange: (e) => setQ(e.target.value) }), err && _jsx("p", { className: "error", children: err }), requests.length > 0 && !results && (_jsxs(_Fragment, { children: [_jsxs("h3", { className: "sub-title", children: ["\uD314\uB85C\uC6B0 \uC694\uCCAD ", requests.length] }), _jsx("ul", { className: "people requests", children: requests.map((p) => (_jsxs("li", { children: [_jsxs("button", { className: "person", onClick: () => onOpen(p), children: [_jsx("span", { className: "avatar", children: (p.name || p.username).slice(0, 1).toUpperCase() }), _jsxs("span", { children: [_jsx("strong", { children: p.name || p.username }), _jsxs("span", { className: "handle", children: ["@", p.username] })] })] }), _jsx("button", { className: "link", onClick: () => run(removeFollower(p.id)), children: "\uAC70\uC808" }), _jsx("button", { className: "follow", onClick: () => run(acceptRequest(p.id)), children: "\uC218\uB77D" })] }, p.id))) })] })), _jsxs("ul", { className: "people", children: [list.map((p) => (_jsxs("li", { children: [_jsxs("button", { className: "person", onClick: () => onOpen(p), children: [_jsx("span", { className: "avatar", children: (p.name || p.username).slice(0, 1).toUpperCase() }), _jsxs("span", { children: [_jsx("strong", { children: p.name || p.username }), _jsxs("span", { className: "handle", children: ["@", p.username] })] })] }), tab === 'followers' && !results && (_jsx("button", { className: "link danger", onClick: () => confirm(`${p.name || p.username}님을 팔로워에서 삭제할까요?`) && run(removeFollower(p.id)), children: "\uC0AD\uC81C" })), _jsx("button", { className: ids.has(p.id) ? 'follow on' : 'follow', onClick: () => run(ids.has(p.id) ? unfollow(p.id) : follow(p.id)), children: ids.has(p.id) ? FOLLOW_LABEL[ids.get(p.id)] : tab === 'followers' && !results ? '맞팔로우' : '팔로우' })] }, p.id))), !list.length && (_jsx("li", { className: "empty", children: results ? '찾는 사람이 없어요.' : tab === 'following' ? '위에서 친구를 찾아 팔로우해 보세요.' : '아직 팔로워가 없어요.' }))] })] }));
}
