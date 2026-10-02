import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {delay, http, HttpResponse} from 'msw';
import {MemoryRouter, useLocation} from 'react-router-dom';
import {describe, expect, it, vi} from 'vitest';
import {AuthProvider} from '../features/auth/AuthContext';
import {SearchBar} from '../features/jobs/SearchBar';
import {JobsPage} from '../features/jobs/JobBoardPages';
import {JobForm} from '../features/employer/JobForm';
import {JobCard} from '../features/jobs/JobCard';
import {ReferenceSelect} from '../features/jobs/ReferenceSelect';
import {getJobCategories, getJobLocations} from '../api/jobMetadata';
import {envelope, job} from './fixtures';
import {server} from './server';

const base = 'http://localhost:8080/api/v1/jobs/metadata';

function Url() {
    return <output data-testid="url">{useLocation().search}</output>;
}

function wrap(node: React.ReactNode, entry = '/jobs') {
    const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
    return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[entry]}>
        <AuthProvider>{node}<Url/></AuthProvider></MemoryRouter></QueryClientProvider>);
}

const initial = {
    companyId: job.companyId, title: job.title, description: job.description,
    requirements: job.requirements, categoryId: job.category.id, locationId: job.location.id,
    employmentType: job.employmentType, salaryMin: 1, salaryMax: 2, salaryCurrency: 'USD',
    salaryNegotiable: false, applicationDeadline: '2099-12-31', version: null
};

describe('job metadata', () => {
    it('unwraps both metadata API envelopes', async () => {
        expect(await getJobCategories()).toEqual([job.category]);
        expect(await getJobLocations()).toEqual([job.location]);
    });
    it('loads SearchBar options and sends UUID values with friendly labels', async () => {
        const submit = vi.fn();
        wrap(<SearchBar values={{keyword: '', categoryId: '', locationId: ''}} onSubmit={submit}/>);
        await screen.findByRole('option', {name: job.category.name});
        await userEvent.selectOptions(screen.getByLabelText('Ngành nghề'), job.category.id);
        await userEvent.selectOptions(screen.getByLabelText('Địa điểm'), job.location.id);
        await userEvent.click(screen.getByRole('button', {name: 'Tìm việc'}));
        expect(submit).toHaveBeenCalledWith({keyword: '', categoryId: job.category.id, locationId: job.location.id});
        expect(document.body.textContent).not.toContain(job.category.id);
        expect(document.body.textContent).not.toContain(job.location.id);
        expect(screen.queryByRole('textbox', {name: /Mã/})).not.toBeInTheDocument();
    });
    it('shows loading while keyword search stays usable', async () => {
        server.use(http.get(base + '/categories', async () => {
            await delay(250);
            return HttpResponse.json(envelope([job.category]));
        }));
        wrap(<SearchBar values={{keyword: '', categoryId: '', locationId: ''}} onSubmit={vi.fn()}/>);
        expect(screen.getByText('Đang tải ngành nghề…')).toBeInTheDocument();
        expect(screen.getByLabelText('Ngành nghề')).toBeDisabled();
        expect(screen.getByRole('button', {name: 'Tìm việc'})).toBeEnabled();
        await screen.findByRole('option', {name: job.category.name});
    });
    it('recovers from metadata failure and permits keyword search', async () => {
        let calls = 0;
        server.use(http.get(base + '/categories', () => ++calls === 1 ? new HttpResponse(null, {status: 503}) : HttpResponse.json(envelope([job.category]))));
        const submit = vi.fn();
        wrap(<SearchBar values={{keyword: 'Java', categoryId: '', locationId: ''}} onSubmit={submit}/>);
        await screen.findByText('Chưa tải được ngành nghề.');
        await userEvent.click(screen.getByRole('button', {name: 'Tìm việc'}));
        expect(submit).toHaveBeenCalledWith({keyword: 'Java', categoryId: '', locationId: ''});
        await userEvent.click(screen.getByRole('button', {name: 'Thử lại ngành nghề'}));
        await screen.findByRole('option', {name: job.category.name});
    });
    it('shares the catalog cache across search and sidebar', async () => {
        let categories = 0, locations = 0;
        server.use(http.get(base + '/categories', () => {
                categories++;
                return HttpResponse.json(envelope([job.category]));
            }),
            http.get(base + '/locations', () => {
                locations++;
                return HttpResponse.json(envelope([job.location]));
            }));
        wrap(<JobsPage/>);
        await screen.findAllByRole('option', {name: job.category.name});
        await screen.findAllByRole('option', {name: job.location.name});
        expect(categories).toBe(1);
        expect(locations).toBe(1);
    });
    it('updates URL for combined search, renders named chips, and resets filters', async () => {
        wrap(<JobsPage/>);
        const search = within(screen.getByRole('search'));
        await search.findByRole('option', {name: job.category.name});
        await userEvent.selectOptions(search.getByLabelText('Ngành nghề'), job.category.id);
        await userEvent.selectOptions(search.getByLabelText('Địa điểm'), job.location.id);
        await userEvent.click(search.getByRole('button', {name: 'Tìm việc'}));
        expect(screen.getByTestId('url')).toHaveTextContent('categoryId=' + job.category.id);
        expect(screen.getByTestId('url')).toHaveTextContent('locationId=' + job.location.id);
        const chips = within(screen.getByLabelText('Bộ lọc đang áp dụng'));
        expect(chips.getByRole('button', {name: job.category.name})).toBeInTheDocument();
        await userEvent.click(chips.getByRole('button', {name: job.location.name}));
        expect(screen.getByTestId('url')).not.toHaveTextContent('locationId');
        await userEvent.click(chips.getByRole('button', {name: 'Xóa tất cả'}));
        expect(screen.getByTestId('url')).toBeEmptyDOMElement();
    });
    it('restores category and location from a reloaded URL', async () => {
        wrap(<JobsPage/>, `/jobs?categoryId=${job.category.id}&locationId=${job.location.id}`);
        const search = within(screen.getByRole('search'));
        await search.findByRole('option', {name: job.category.name});
        expect(search.getByLabelText('Ngành nghề')).toHaveValue(job.category.id);
        expect(search.getByLabelText('Địa điểm')).toHaveValue(job.location.id);
    });
    it('changes metadata filters in the mobile drawer', async () => {
        wrap(<JobsPage/>);
        await userEvent.click(screen.getByRole('button', {name: 'Bộ lọc'}));
        const drawer = within(screen.getByRole('dialog', {name: 'Bộ lọc việc làm'}));
        await drawer.findByRole('option', {name: job.category.name});
        await userEvent.selectOptions(drawer.getByLabelText('Ngành nghề'), job.category.id);
        await userEvent.selectOptions(drawer.getByLabelText('Địa điểm'), job.location.id);
        expect(screen.getByTestId('url')).toHaveTextContent('categoryId=' + job.category.id);
        expect(screen.getByTestId('url')).toHaveTextContent('locationId=' + job.location.id);
        await userEvent.click(drawer.getByRole('button', {name: 'Xem kết quả'}));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    it('shows safe fallback for an unavailable URL UUID', async () => {
        wrap(<JobsPage/>, '/jobs?categoryId=' + job.id);
        await screen.findAllByRole('option', {name: 'Lựa chọn không còn khả dụng'});
        expect(screen.getByRole('button', {name: 'Ngành nghề chưa khả dụng'})).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', {name: 'Tìm việc'}));
        expect(screen.getByTestId('url')).not.toHaveTextContent('categoryId');
    });
    it('handles malformed metadata without crashing', async () => {
        server.use(http.get(base + '/categories', () => HttpResponse.json(envelope({content: null}))));
        wrap(<ReferenceSelect kind="category" value="" onChange={vi.fn()}/>);
        expect(await screen.findByText('Chưa tải được ngành nghề.')).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Thử lại ngành nghề'})).toBeEnabled();
    });
    it('shows an empty catalog state', async () => {
        server.use(http.get(base + '/locations', () => HttpResponse.json(envelope([]))));
        wrap(<ReferenceSelect kind="location" value="" onChange={vi.fn()}/>);
        expect(await screen.findByText('Chưa có địa điểm khả dụng.')).toBeInTheDocument();
    });
    it('requires dropdown choices before creating a Job and submits their UUIDs', async () => {
        const save = vi.fn();
        wrap(<JobForm initial={{...initial, categoryId: '', locationId: ''}} onSave={save} pending={false}/>);
        expect(screen.getByRole('button', {name: 'Lưu bản nháp'})).toBeDisabled();
        await screen.findByRole('option', {name: job.category.name});
        await userEvent.selectOptions(screen.getByLabelText('Ngành nghề *'), job.category.id);
        await userEvent.selectOptions(screen.getByLabelText('Địa điểm *'), job.location.id);
        await userEvent.click(screen.getByRole('button', {name: 'Lưu bản nháp'}));
        await waitFor(() => expect(save).toHaveBeenCalledWith(initial));
    });
    it('selects current metadata when editing and preserves it on validation errors', async () => {
        wrap(<JobForm initial={{...initial, title: '', version: 2}} onSave={vi.fn()} pending={false}/>);
        await screen.findByRole('option', {name: job.category.name});
        expect(screen.getByLabelText('Ngành nghề *')).toHaveValue(job.category.id);
        expect(screen.getByLabelText('Địa điểm *')).toHaveValue(job.location.id);
        await userEvent.click(screen.getByRole('button', {name: 'Cập nhật'}));
        await screen.findByText('Nhập tiêu đề');
        expect(screen.getByLabelText('Ngành nghề *')).toHaveValue(job.category.id);
        expect(screen.getByLabelText('Địa điểm *')).toHaveValue(job.location.id);
    });
    it.each(['categoryId', 'locationId'] as const)('blocks inactive %s during edit until reselected', async key => {
        wrap(<JobForm initial={{...initial, [key]: job.id, version: 1}} onSave={vi.fn()} pending={false}/>);
        await screen.findByText('Lựa chọn đã ngừng hoạt động hoặc không còn tồn tại. Vui lòng chọn lại.');
        expect(screen.getByRole('button', {name: 'Cập nhật'})).toBeDisabled();
        await userEvent.selectOptions(screen.getByLabelText(key === 'categoryId' ? 'Ngành nghề *' : 'Địa điểm *'),
            key === 'categoryId' ? job.category.id : job.location.id);
        expect(screen.getByRole('button', {name: 'Cập nhật'})).toBeEnabled();
    });
    it('renders JobCard summaries without metadata requests or visible UUIDs', () => {
        wrap(<JobCard job={job}/>);
        expect(screen.getByText(job.category.name)).toBeInTheDocument();
        expect(screen.getByText(job.location.name)).toBeInTheDocument();
        expect(document.body.textContent).not.toContain(job.category.id);
        expect(document.body.textContent).not.toContain(job.location.id);
    });
});
