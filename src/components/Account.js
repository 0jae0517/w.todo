import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { PRIVACY_URL } from '../native';
import { sendLoginLink, setPassword, signInWithPassword, signInWithProvider, signUp } from '../sync';
export const STATUS_LABEL = {
    off: '이 기기에만 저장 중',
    'signed-out': '로그인하면 동기화돼요',
    syncing: '동기화 중…',
    synced: '동기화됨',
    offline: '오프라인 (연결되면 자동 동기화)',
    error: '동기화 오류',
};
const errText = (e) => (e instanceof Error ? e.message : String(e));
export function LoginPanel() {
    const [email, setEmail] = useState('');
    const [password, setPw] = useState('');
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState(null);
    const [err, setErr] = useState(null);
    const run = async (fn) => {
        setBusy(true);
        setErr(null);
        setMsg(null);
        try {
            setMsg(await fn());
        }
        catch (e) {
            setErr(errText(e));
        }
        finally {
            setBusy(false);
        }
    };
    return (_jsxs("div", { children: [_jsxs("div", { className: "social", children: [_jsxs("button", { className: "social-btn google", disabled: busy, onClick: () => run(async () => (await signInWithProvider('google'), null)), children: [_jsx(GoogleLogo, {}), " Google\uB85C \uACC4\uC18D\uD558\uAE30"] }), _jsxs("button", { className: "social-btn kakao", disabled: busy, onClick: () => run(async () => (await signInWithProvider('kakao'), null)), children: [_jsx(KakaoLogo, {}), " \uCE74\uCE74\uC624\uB85C \uACC4\uC18D\uD558\uAE30"] })] }), _jsx("div", { className: "or", children: _jsx("span", { children: "\uB610\uB294 \uC774\uBA54\uC77C\uB85C" }) }), _jsxs("form", { className: "login", onSubmit: (e) => {
                    e.preventDefault();
                    run(async () => {
                        await signInWithPassword(email.trim(), password);
                        return null;
                    });
                }, children: [_jsx("p", { className: "sheet-sub", children: "\uAC19\uC740 \uC774\uBA54\uC77C\uACFC \uBE44\uBC00\uBC88\uD638\uB85C \uB85C\uADF8\uC778\uD558\uBA74 \uD734\uB300\uD3F0\uACFC \uCEF4\uD4E8\uD130\uC758 \uD560 \uC77C\uC774 \uAC19\uC774 \uBCF4\uC5EC\uC694." }), _jsx("input", { type: "email", required: true, autoComplete: "email", placeholder: "\uC774\uBA54\uC77C", value: email, onChange: (e) => setEmail(e.target.value) }), _jsx("input", { type: "password", required: true, minLength: 6, autoComplete: "current-password", placeholder: "\uBE44\uBC00\uBC88\uD638 (6\uC790 \uC774\uC0C1)", value: password, onChange: (e) => setPw(e.target.value) }), _jsx("button", { className: "primary", disabled: busy, children: "\uB85C\uADF8\uC778" }), _jsx("button", { type: "button", disabled: busy, onClick: () => run(async () => {
                            if (!email.trim() || password.length < 6)
                                throw new Error('이메일과 6자 이상 비밀번호를 입력해 주세요');
                            const needsConfirm = await signUp(email.trim(), password);
                            return needsConfirm ? `${email} 으로 확인 메일을 보냈어요. 메일의 링크를 누른 뒤 여기서 로그인해 주세요.` : null;
                        }), children: "\uCC98\uC74C\uC774\uC5D0\uC694 (\uAC00\uC785\uD558\uAE30)" }), _jsx("button", { type: "button", className: "link", disabled: busy, onClick: () => run(async () => {
                            if (!email.trim())
                                throw new Error('이메일을 입력해 주세요');
                            await sendLoginLink(email.trim());
                            return `${email} 으로 로그인 링크를 보냈어요. 링크는 이 브라우저에서 열어야 해요. 로그인한 뒤 계정 화면에서 비밀번호를 정할 수 있어요.`;
                        }), children: "\uBE44\uBC00\uBC88\uD638\uAC00 \uC5C6\uAC70\uB098 \uC78A\uC5C8\uC5B4\uC694 (\uBA54\uC77C\uB85C \uB85C\uADF8\uC778 \uB9C1\uD06C \uBC1B\uAE30)" }), msg && _jsx("p", { className: "sheet-sub", children: msg }), err && _jsx("p", { className: "error", children: err })] }), _jsxs("p", { className: "sheet-sub legal-note", children: ["\uAC00\uC785\uD558\uBA74", ' ', _jsx("a", { href: PRIVACY_URL, target: "_blank", rel: "noopener", children: "\uAC1C\uC778\uC815\uBCF4\uCC98\uB9AC\uBC29\uCE68" }), "\uC5D0 \uB3D9\uC758\uD558\uB294 \uAC83\uC73C\uB85C \uBD10\uC694. \uB9CC 14\uC138 \uBBF8\uB9CC\uC740 \uAC00\uC785\uD560 \uC218 \uC5C6\uC5B4\uC694."] })] }));
}
export function PasswordForm() {
    const [open, setOpen] = useState(false);
    const [pw, setPw] = useState('');
    const [msg, setMsg] = useState(null);
    const [busy, setBusy] = useState(false);
    if (!open)
        return _jsx("button", { className: "link", onClick: () => setOpen(true), children: "\uBE44\uBC00\uBC88\uD638 \uC124\uC815/\uBCC0\uACBD" });
    return (_jsxs("form", { className: "login", onSubmit: async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
                await setPassword(pw);
                setMsg('비밀번호를 저장했어요. 다른 기기에서 이 이메일과 비밀번호로 로그인하세요.');
                setPw('');
            }
            catch (e) {
                setMsg(errText(e));
            }
            finally {
                setBusy(false);
            }
        }, children: [_jsx("input", { type: "password", required: true, minLength: 6, autoComplete: "new-password", placeholder: "\uC0C8 \uBE44\uBC00\uBC88\uD638 (6\uC790 \uC774\uC0C1)", value: pw, onChange: (e) => setPw(e.target.value) }), _jsx("button", { className: "primary", disabled: busy, children: "\uC800\uC7A5" }), msg && _jsx("p", { className: "sheet-sub", children: msg })] }));
}
/** Account deletion behind a second step, since it can't be undone. */
export function DeleteAccount({ onDelete }) {
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState(null);
    if (!open)
        return (_jsx("button", { className: "link danger-link", onClick: () => setOpen(true), children: "\uD68C\uC6D0 \uD0C8\uD1F4" }));
    return (_jsxs("div", { className: "delete-box", children: [_jsx("p", { className: "sheet-sub", children: "\uD0C8\uD1F4\uD558\uBA74 \uD560 \uC77C, \uCE74\uD14C\uACE0\uB9AC, \uC9D1\uC911 \uAE30\uB85D, \uC2DC\uAC04\uD45C, \uD504\uB85C\uD544, \uD314\uB85C\uC6B0, \uAC10\uC815\uD45C\uD604, \uB0B4\uAC00 \uB9CC\uB4E0 \uD15C\uD50C\uB9BF\uC774 \uC11C\uBC84\uC640 \uC774 \uAE30\uAE30\uC5D0\uC11C \uBC14\uB85C \uC9C0\uC6CC\uC838\uC694. \uB418\uB3CC\uB9B4 \uC218 \uC5C6\uC5B4\uC694." }), _jsxs("div", { className: "actions", children: [_jsx("button", { onClick: () => setOpen(false), disabled: busy, children: "\uCDE8\uC18C" }), _jsx("button", { className: "danger", disabled: busy, onClick: async () => {
                            setBusy(true);
                            setErr(null);
                            try {
                                await onDelete();
                            }
                            catch (e) {
                                setErr(errText(e));
                                setBusy(false);
                            }
                        }, children: busy ? '지우는 중…' : '탈퇴하기' })] }), err && _jsx("p", { className: "error", children: err })] }));
}
const GoogleLogo = () => (_jsxs("svg", { viewBox: "0 0 48 48", width: "18", height: "18", "aria-hidden": true, children: [_jsx("path", { fill: "#FFC107", d: "M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" }), _jsx("path", { fill: "#FF3D00", d: "M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" }), _jsx("path", { fill: "#4CAF50", d: "M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" }), _jsx("path", { fill: "#1976D2", d: "M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" })] }));
const KakaoLogo = () => (_jsx("svg", { viewBox: "0 0 24 24", width: "18", height: "18", "aria-hidden": true, children: _jsx("path", { fill: "#000", d: "M12 3C6.5 3 2 6.5 2 10.8c0 2.8 1.9 5.2 4.7 6.6l-1 3.6c-.1.3.3.6.6.4l4.2-2.8c.5.1 1 .1 1.5.1 5.5 0 10-3.5 10-7.9S17.5 3 12 3z" }) }));
