export function safeReturnPath(value: unknown, fallback = '/jobs'): string {
    if (typeof value !== 'string' || !value.startsWith('/') || /[\\\s]/.test(value) || Array.from(value).some(char => char.charCodeAt(0) < 32)) return fallback;
    try {
        const decoded = decodeURIComponent(value);
        if (decoded.startsWith('//') || decoded.includes('\\') || Array.from(decoded).some(char => char.charCodeAt(0) < 32)) return fallback;
        const url = new URL(value, 'https://local.invalid');
        if (url.origin !== 'https://local.invalid' || /^\/(login|register)(\/|$)/.test(url.pathname)) return fallback;
        return url.pathname + url.search + url.hash;
    } catch {
        return fallback;
    }
}

export function jobListPath(value: unknown) {
    const path = safeReturnPath(value);
    return /^\/jobs(?:\?|$)/.test(path) ? path : '/jobs';
}
