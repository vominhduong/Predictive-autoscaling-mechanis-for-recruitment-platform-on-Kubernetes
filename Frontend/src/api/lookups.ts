import {applicationApi, jobApi} from './services';

export async function findApplication(jobId: string) {
    for (let page = 0; ; page++) {
        const result = await applicationApi.mine(page);
        const found = result.content.find(item => item.jobId === jobId);
        if (found) return found;
        if (result.last || page + 1 >= result.totalPages) return null;
    }
}

export async function findEmployerJob(companyId: string, id: string) {
    for (let page = 0; ; page++) {
        const result = await jobApi.employer(companyId, undefined, page);
        const found = result.content.find(item => item.id === id);
        if (found) return found;
        if (result.last || page + 1 >= result.totalPages) return null;
    }
}
