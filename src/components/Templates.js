import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { dayLabel, timeLabel, todayKey } from '../date';
import { useMyProfile } from '../social';
import { applyTemplate, addCategory, useStore } from '../store';
import { useSync } from '../sync';
import { countUse, createTemplate, deleteTemplate, getTemplate, listTemplates, myTemplates, setListed, shareLink, } from '../templates';
import { CheckMarkIcon, GlobeIcon, LinkIcon, PlusIcon, RepeatIcon } from './Icons';
import Sheet from './Sheet';
import { repeatLabel } from './TodoSheet';
const errText = (e) => (e instanceof Error ? e.message : String(e));
const itemKey = (it) => `${it.title}|${it.time}|${it.days.join()}`;
function ItemList({ items }) {
    return (_jsx("ul", { className: "tpl-items", children: items.map((it, i) => (_jsxs("li", { children: [_jsx("span", { className: "tpl-item-title", children: it.title }), _jsxs("span", { className: "muted", children: [it.time && `${timeLabel(it.time)} · `, it.days.length ? (_jsxs(_Fragment, { children: [_jsx(RepeatIcon, {}), " ", repeatLabel(it.days)] })) : ('한 번')] })] }, i))) }));
}
// ---- making a template from a category ----
/** Shares a category's repeating todos (and today's one-off todos) as a template. */
export function TemplateMaker({ category, onClose }) {
    const { session } = useSync();
    const { profile } = useMyProfile();
    const { routines, todos } = useStore();
    const today = todayKey();
    const candidates = useMemo(() => {
        const list = [
            ...routines.filter((r) => r.category_id === category.id).map((r) => ({ title: r.title, time: r.time, days: [...r.days].sort() })),
            ...todos.filter((t) => t.category_id === category.id && t.date === today && !t.routine_id).map((t) => ({ title: t.title, time: t.time, days: [] })),
        ];
        // the same line twice is noise
        return list.filter((it, i) => list.findIndex((x) => itemKey(x) === itemKey(it)) === i);
    }, [routines, todos, category.id, today]);
    const [title, setTitle] = useState(category.name);
    const [description, setDescription] = useState('');
    const [picked, setPicked] = useState(() => new Set(candidates.map(itemKey)));
    const [extra, setExtra] = useState([]);
    const [draft, setDraft] = useState('');
    const [listed, setListedState] = useState(true);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState(null);
    const [made, setMade] = useState(null);
    const [shared, setShared] = useState(null);
    const items = [...candidates.filter((it) => picked.has(itemKey(it))), ...extra];
    if (!session || !profile)
        return (_jsx(Sheet, { title: "\uD15C\uD50C\uB9BF\uC73C\uB85C \uACF5\uC720", onClose: onClose, children: _jsx("p", { className: "sheet-sub", children: session ? '친구 탭에서 프로필을 먼저 만들어 주세요.' : '로그인하면 템플릿을 공유할 수 있어요.' }) }));
    if (made)
        return (_jsxs(Sheet, { title: "\uD15C\uD50C\uB9BF\uC744 \uB9CC\uB4E4\uC5C8\uC5B4\uC694", onClose: onClose, children: [_jsx("p", { className: "sheet-sub", children: listed ? '친구 탭의 템플릿 목록에 올라갔어요. 링크로도 보낼 수 있어요.' : '링크를 받은 사람만 볼 수 있어요.' }), _jsx("button", { className: "primary wide", onClick: async () => setShared(await shareLink(made)), children: "\uB9C1\uD06C \uACF5\uC720\uD558\uAE30" }), shared === 'copied' && _jsx("p", { className: "sheet-sub", children: "\uB9C1\uD06C\uB97C \uBCF5\uC0AC\uD588\uC5B4\uC694." })] }));
    const submit = async () => {
        setBusy(true);
        setErr(null);
        try {
            const id = await createTemplate({ title: title.trim(), description: description.trim(), color: category.color, items, listed });
            setMade({ id, title: title.trim() });
        }
        catch (e) {
            setErr(errText(e));
        }
        finally {
            setBusy(false);
        }
    };
    const addExtra = () => {
        const t = draft.trim();
        if (t)
            setExtra([...extra, { title: t, time: null, days: [] }]);
        setDraft('');
    };
    return (_jsxs(Sheet, { title: "\uD15C\uD50C\uB9BF\uC73C\uB85C \uACF5\uC720", onClose: onClose, children: [_jsx("p", { className: "sheet-sub", children: "\uACE0\uB978 \uD560 \uC77C\uB9CC \uC81C\uBAA9\u00B7\uC2DC\uAC04\u00B7\uBC18\uBCF5 \uC694\uC77C\uB85C \uACF5\uC720\uB3FC\uC694. \uC644\uB8CC \uAE30\uB85D\uC774\uB098 \uC9D1\uC911 \uC2DC\uAC04\uC740 \uACF5\uC720\uB418\uC9C0 \uC54A\uC544\uC694." }), _jsx("input", { className: "sheet-input", placeholder: "\uD15C\uD50C\uB9BF \uC774\uB984", maxLength: 60, value: title, onChange: (e) => setTitle(e.target.value) }), _jsx("textarea", { className: "tpl-desc", placeholder: "\uC124\uBA85 (\uC120\uD0DD)", maxLength: 500, value: description, onChange: (e) => setDescription(e.target.value) }), _jsx("h3", { className: "sub-title", children: "\uB2F4\uC744 \uD560 \uC77C" }), candidates.length === 0 && extra.length === 0 && _jsx("p", { className: "sheet-sub", children: "\uC774 \uCE74\uD14C\uACE0\uB9AC\uC5D0 \uBC18\uBCF5 \uD560 \uC77C\uC774\uB098 \uC624\uB298 \uD560 \uC77C\uC774 \uC5C6\uC5B4\uC694. \uC544\uB798\uC5D0\uC11C \uC9C1\uC811 \uCD94\uAC00\uD574 \uC8FC\uC138\uC694." }), _jsxs("ul", { className: "pick-list", children: [candidates.map((it) => {
                        const k = itemKey(it);
                        return (_jsx("li", { children: _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: picked.has(k), onChange: () => {
                                            const next = new Set(picked);
                                            if (next.has(k))
                                                next.delete(k);
                                            else
                                                next.add(k);
                                            setPicked(next);
                                        } }), it.title, _jsxs("span", { className: "muted", children: [' ', it.time && timeLabel(it.time), it.time && it.days.length > 0 && ' · ', it.days.length > 0 && (_jsxs(_Fragment, { children: [_jsx(RepeatIcon, {}), " ", repeatLabel(it.days)] }))] })] }) }, k));
                    }), extra.map((it, i) => (_jsx("li", { children: _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: true, onChange: () => setExtra(extra.filter((_, j) => j !== i)) }), it.title] }) }, `x${i}`)))] }), _jsxs("div", { className: "cat-add", children: [_jsx("input", { placeholder: "\uD56D\uBAA9 \uC9C1\uC811 \uCD94\uAC00", value: draft, onChange: (e) => setDraft(e.target.value), onKeyDown: (e) => e.key === 'Enter' && !e.nativeEvent.isComposing && addExtra() }), _jsx("button", { className: "icon-add", onClick: addExtra, "aria-label": "\uD56D\uBAA9 \uCD94\uAC00", title: "\uD56D\uBAA9 \uCD94\uAC00", children: _jsx(PlusIcon, {}) })] }), _jsxs("div", { className: "vis-options", children: [_jsxs("button", { className: listed ? 'on' : '', onClick: () => setListedState(true), children: [_jsx(GlobeIcon, {}), " \uBAA9\uB85D\uC5D0 \uACF5\uAC1C"] }), _jsxs("button", { className: !listed ? 'on' : '', onClick: () => setListedState(false), children: [_jsx(LinkIcon, {}), " \uB9C1\uD06C\uB85C\uB9CC"] })] }), err && _jsx("p", { className: "error", children: err }), _jsxs("button", { className: "primary wide", disabled: busy || !title.trim() || !items.length, onClick: submit, children: [items.length, "\uAC1C \uD56D\uBAA9\uC73C\uB85C \uD15C\uD50C\uB9BF \uB9CC\uB4E4\uAE30"] })] }));
}
// ---- viewing / using a template ----
const NEW = '__new';
export function TemplateView({ id, onClose, onChanged }) {
    const { categories } = useStore();
    const { session } = useSync();
    const [t, setT] = useState(undefined);
    const [target, setTarget] = useState(NEW);
    const [date, setDate] = useState(todayKey);
    const [done, setDone] = useState(false);
    const [note, setNote] = useState(null);
    const [err, setErr] = useState(null);
    const mine = !!t && t.owner_id === session?.user.id;
    useEffect(() => {
        getTemplate(id)
            .then(setT)
            .catch((e) => {
            setErr(errText(e));
            setT(null);
        });
    }, [id]);
    if (t === undefined)
        return _jsx(Sheet, { onClose: onClose, children: _jsx("p", { className: "empty", children: "\uBD88\uB7EC\uC624\uB294 \uC911\u2026" }) });
    if (t === null)
        return (_jsx(Sheet, { onClose: onClose, children: _jsx("p", { className: "empty", children: err ?? '템플릿을 찾을 수 없어요. 삭제되었을 수 있어요.' }) }));
    const use = () => {
        const categoryId = target === NEW ? addCategory(t.title, t.color) : target;
        applyTemplate(t.items, categoryId, date);
        countUse(t.id).catch(() => { });
        setDone(true);
    };
    const repeating = t.items.some((it) => it.days.length);
    return (_jsxs(Sheet, { onClose: onClose, children: [_jsxs("div", { className: "tpl-head", style: { '--c': t.color }, children: [_jsx("h2", { className: "sheet-title", children: t.title }), _jsxs("p", { className: "sheet-sub", children: [t.owner && `@${t.owner.username} · `, t.items.length, "\uAC1C \uD56D\uBAA9 \u00B7 ", t.uses, "\uBA85\uC774 \uAC00\uC838\uAC10"] })] }), t.description && _jsx("p", { className: "tpl-description", children: t.description }), _jsx(ItemList, { items: t.items }), done ? (_jsxs("p", { className: "tpl-done", children: [_jsx(CheckMarkIcon, {}), " ", target === NEW ? `'${t.title}' 카테고리에` : '고른 카테고리에', " \uCD94\uAC00\uD588\uC5B4\uC694.", repeating && ` 반복 할 일은 ${dayLabel(date)}부터 시작돼요.`] })) : (_jsxs(_Fragment, { children: [_jsx("h3", { className: "sub-title", children: "\uB0B4 \uD560 \uC77C\uC5D0 \uCD94\uAC00" }), _jsxs("label", { className: "field", children: [_jsx("span", { children: "\uCE74\uD14C\uACE0\uB9AC" }), _jsxs("select", { value: target, onChange: (e) => setTarget(e.target.value), children: [_jsxs("option", { value: NEW, children: ["\uC0C8 \uCE74\uD14C\uACE0\uB9AC '", t.title, "'"] }), categories.map((c) => (_jsx("option", { value: c.id, children: c.name }, c.id)))] })] }), _jsxs("label", { className: "field", children: [_jsx("span", { children: repeating ? '시작 날짜' : '날짜' }), _jsx("input", { type: "date", value: date, onChange: (e) => e.target.value && setDate(e.target.value) })] }), _jsx("button", { className: "primary wide", onClick: use, children: "\uB0B4 \uD560 \uC77C\uC5D0 \uCD94\uAC00" })] })), _jsxs("div", { className: "actions", children: [_jsx("button", { onClick: async () => setNote((await shareLink(t)) === 'copied' ? '링크를 복사했어요.' : null), children: "\uB9C1\uD06C \uACF5\uC720" }), mine && (_jsxs(_Fragment, { children: [_jsx("button", { onClick: async () => {
                                    await setListed(t.id, !t.listed);
                                    setT({ ...t, listed: !t.listed });
                                    onChanged?.();
                                }, children: t.listed ? '목록에서 내리기' : '목록에 공개' }), _jsx("button", { onClick: async () => {
                                    if (!confirm(`'${t.title}' 템플릿을 삭제할까요? 이미 가져간 사람의 할 일은 그대로 남아요.`))
                                        return;
                                    await deleteTemplate(t.id);
                                    onChanged?.();
                                    onClose();
                                }, children: "\uC0AD\uC81C" })] }))] }), note && _jsx("p", { className: "sheet-sub", children: note })] }));
}
// ---- browsing ----
export function TemplateGallery() {
    const { session } = useSync();
    const [q, setQ] = useState('');
    const [list, setList] = useState(null);
    const [mine, setMine] = useState([]);
    const [open, setOpen] = useState(null);
    const [err, setErr] = useState(null);
    const [tick, setTick] = useState(0);
    useEffect(() => {
        const h = setTimeout(() => listTemplates(q)
            .then(setList)
            .catch((e) => setErr(errText(e))), q ? 300 : 0);
        return () => clearTimeout(h);
    }, [q, tick]);
    useEffect(() => {
        if (!session)
            return setMine([]);
        myTemplates().then(setMine).catch(() => { });
    }, [session, tick]);
    const card = (t) => (_jsx("li", { children: _jsxs("button", { className: "tpl-card", style: { '--c': t.color }, onClick: () => setOpen(t.id), children: [_jsx("strong", { children: t.title }), _jsxs("span", { className: "muted", children: [t.owner ? `@${t.owner.username} · ` : '', t.items.length, "\uAC1C \u00B7 ", t.uses, "\uBA85\uC774 \uAC00\uC838\uAC10", !t.listed && ' · 링크로만'] }), t.description && _jsx("span", { className: "tpl-card-desc", children: t.description })] }) }, t.id));
    return (_jsxs("div", { className: "templates", children: [_jsx("p", { className: "sheet-sub", children: "\uB2E4\uB978 \uC0AC\uB78C\uC758 \uB8E8\uD2F4\uC744 \uAC00\uC838\uC624\uAC70\uB098, \uCE74\uD14C\uACE0\uB9AC \uAD00\uB9AC(\uC624\uB978\uCABD \uC704 +)\uC5D0\uC11C \uACF5\uC720 \uBC84\uD2BC\uC744 \uB20C\uB7EC \uB0B4 \uB8E8\uD2F4\uC744 \uACF5\uC720\uD560 \uC218 \uC788\uC5B4\uC694." }), _jsx("input", { className: "search", placeholder: "\uD15C\uD50C\uB9BF \uAC80\uC0C9", value: q, onChange: (e) => setQ(e.target.value) }), err && _jsx("p", { className: "error", children: err }), mine.length > 0 && !q && (_jsxs(_Fragment, { children: [_jsx("h3", { className: "sub-title", children: "\uB0B4 \uD15C\uD50C\uB9BF" }), _jsx("ul", { className: "tpl-list", children: mine.map(card) })] })), _jsx("h3", { className: "sub-title", children: q ? '검색 결과' : '인기 템플릿' }), list === null ? (_jsx("p", { className: "empty", children: "\uBD88\uB7EC\uC624\uB294 \uC911\u2026" })) : list.length === 0 ? (_jsx("p", { className: "empty", children: q ? '찾는 템플릿이 없어요.' : '아직 공개된 템플릿이 없어요. 첫 템플릿을 올려 보세요!' })) : (_jsx("ul", { className: "tpl-list", children: list.map(card) })), open && _jsx(TemplateView, { id: open, onClose: () => setOpen(null), onChanged: () => setTick(tick + 1) })] }));
}
