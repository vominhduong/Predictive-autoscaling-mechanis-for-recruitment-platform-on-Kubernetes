import {useEffect, useRef, type RefObject} from 'react';

// Shared by dialogs and mobile drawers. Preserve prior inert/scroll state.
export function useFocusScope(ref: RefObject<HTMLElement | null>, open: boolean, onClose: () => void) {
    const closeRef = useRef(onClose);
    useEffect(() => {
        closeRef.current = onClose;
    }, [onClose]);
    useEffect(() => {
        const panel = ref.current;
        if (!open || !panel) return;
        const previous = document.activeElement as HTMLElement | null;
        const overflow = document.body.style.overflow;
        const inerted: Array<[HTMLElement, boolean]> = [];
        let node: HTMLElement = panel;
        while (node.parentElement && node !== document.body) {
            for (const sibling of node.parentElement.children) {
                if (sibling !== node && sibling instanceof HTMLElement) {
                    inerted.push([sibling, sibling.inert]);
                    sibling.inert = true;
                }
            }
            node = node.parentElement;
        }
        document.body.style.overflow = 'hidden';
        const controls = () => Array.from(panel.querySelectorAll<HTMLElement>('a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')).filter(el => !el.hidden && getComputedStyle(el).display !== 'none');
        (panel.querySelector<HTMLElement>('[data-initial-focus]') ?? controls()[0] ?? panel).focus();
        const key = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                closeRef.current();
            }
            if (event.key !== 'Tab') return;
            event.preventDefault();
            const items = controls();
            if (!items.length) {
                panel.focus();
                return;
            }
            const index = items.indexOf(document.activeElement as HTMLElement);
            items[(index + (event.shiftKey ? -1 : 1) + items.length) % items.length]?.focus();
        };
        document.addEventListener('keydown', key);
        return () => {
            document.removeEventListener('keydown', key);
            document.body.style.overflow = overflow;
            inerted.forEach(([el, value]) => {
                el.inert = value;
            });
            if (previous?.isConnected) previous.focus();
        };
    }, [open, ref]);
}
