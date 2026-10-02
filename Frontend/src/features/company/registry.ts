import type {Company} from '../../types/api';
import {getSession} from '../auth/session';

export type KnownCompany = Company & { knownOwner?: boolean };
const key = () => 'recruitment.companies:' + (getSession()?.email.toLowerCase() ?? 'guest');

export function companies(): KnownCompany[] {
    try {
        const value: unknown = JSON.parse(localStorage.getItem(key()) ?? '[]');
        return Array.isArray(value) ? value.filter(item => typeof item?.id === 'string' && typeof item?.name === 'string') : [];
    } catch {
        return [];
    }
}

export function remember(company: Company, knownOwner = companies().find(item => item.id === company.id)?.knownOwner ?? false) {
    const next = [{...company, knownOwner}, ...companies().filter(item => item.id !== company.id)];
    try {
        localStorage.setItem(key(), JSON.stringify(next));
    } catch { /* The current company remains navigable. */
    }
    return next;
}
