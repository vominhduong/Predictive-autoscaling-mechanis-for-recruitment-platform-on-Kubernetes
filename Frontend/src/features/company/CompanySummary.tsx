import {useQuery} from '@tanstack/react-query';
import {companyApi} from '../../api/services';
import {isUuid} from '../../utils/validation';

export function CompanySummary({id}: { id: string }) {
    const company = useQuery({
        queryKey: ['company', id],
        queryFn: () => companyApi.get(id),
        enabled: isUuid(id),
        staleTime: 300_000,
        retry: false
    });
    return <span>{company.data?.name ?? (company.isPending ? 'Đang tải công ty…' : 'Chưa tải được tên công ty')}{company.isError &&
        <button className="button button-ghost button-small" onClick={() => company.refetch()}>Thử lại tên công
            ty</button>}</span>;
}
