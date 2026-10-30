/**
 * iPhone Safari keeps the layout viewport full height when the keyboard opens,
 * so a bottom sheet ends up behind the keyboard. Track the visible part of the
 * screen in CSS variables; sheets (.backdrop) sit inside it.
 */
export function trackVisualViewport() {
    const vv = window.visualViewport;
    if (!vv)
        return;
    const root = document.documentElement.style;
    const update = () => {
        root.setProperty('--vv-top', `${vv.offsetTop}px`);
        root.setProperty('--vv-height', `${vv.height}px`);
        // keep the field being typed in visible inside the sheet
        const el = document.activeElement;
        if (el instanceof HTMLElement && el.closest('.sheet'))
            el.scrollIntoView({ block: 'nearest' });
    };
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    update();
}
