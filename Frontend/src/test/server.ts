import {setupServer} from 'msw/node';
import {http, HttpResponse} from 'msw';
import {envelope, job, page} from './fixtures';

export const server = setupServer(
    http.get('http://localhost:8080/api/v1/jobs/metadata/categories', () => HttpResponse.json(envelope([job.category]))),
    http.get('http://localhost:8080/api/v1/jobs/metadata/locations', () => HttpResponse.json(envelope([job.location]))),
    http.get('http://localhost:8080/api/v1/companies/:id', ({params}) => HttpResponse.json(envelope({
        id: params.id,
        name: 'Công ty kiểm thử',
        address: 'Hà Nội'
    }))), http.get('http://localhost:8080/api/v1/jobs', () => HttpResponse.json(envelope(page([job])))));
