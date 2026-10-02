import {useQuery} from '@tanstack/react-query';
import {api, data} from './client';
import {isUuid} from '../utils/validation';

export type JobCategoryOption = { id: string; name: string; slug: string };
export type JobLocationOption = { id: string; name: string; slug: string };

// Malformed responses are recoverable errors, not empty catalogs.
function options(value: unknown): JobCategoryOption[] {
    if (!Array.isArray(value) || !value.every(item => item && typeof item.id === 'string'
            && isUuid(item.id) && typeof item.name === 'string' && item.name.trim()
            && typeof item.slug === 'string' && item.slug.trim())
        || new Set(value.map(item => item.id)).size !== value.length) {
        throw new Error('Invalid job metadata');
    }
    return value;
}

export async function getJobCategories(): Promise<JobCategoryOption[]> {
    return options(await data<unknown>(api.get('/api/v1/jobs/metadata/categories')));
}

export async function getJobLocations(): Promise<JobLocationOption[]> {
    return options(await data<unknown>(api.get('/api/v1/jobs/metadata/locations')));
}

export function useJobMetadata() {
    const categories = useQuery({
        queryKey: ['job-metadata', 'categories'], queryFn: getJobCategories,
        staleTime: 30 * 60_000, gcTime: 60 * 60_000, retry: false
    });
    const locations = useQuery({
        queryKey: ['job-metadata', 'locations'], queryFn: getJobLocations,
        staleTime: 30 * 60_000, gcTime: 60 * 60_000, retry: false
    });
    return {categories, locations};
}
