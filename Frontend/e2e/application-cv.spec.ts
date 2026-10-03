import {expect, test} from '@playwright/test';
import {readFile} from 'node:fs/promises';

const id = '11111111-1111-4111-8111-111111111111';
const company = '22222222-2222-4222-8222-222222222222';
const envelope = (data: unknown) => ({success: true, data});
const application = {id, jobId: id, companyId: company, cvId: id, cvFileName: 'Nguyen An.pdf',
    candidateIdentity: 'candidate@example.com', jobTitle: 'Java Engineer', status: 'APPLIED',
    createdAt: '2026-10-01T00:00:00Z', version: 0};

test('employer previews actual PDF bytes and downloads the same CV on list and detail', async ({page}) => {
    const pdf = await readFile('../Services/application-service/src/test/resources/cv-preview.pdf');
    await page.addInitScript(() => sessionStorage.setItem('recruitment.session', JSON.stringify({
        accessToken: 'test-employer-token', refreshToken: 'test-refresh', role: 'EMPLOYER',
        email: 'employer@example.com', expiresAt: Date.now() + 300000
    })));
    await page.route('**/api/v1/**', async route => {
        const url = new URL(route.request().url());
        if (url.pathname.endsWith('/cv')) {
            expect(route.request().headers().authorization).toBe('Bearer test-employer-token');
            return route.fulfill({contentType: 'application/pdf', body: pdf});
        }
        if (url.pathname.includes('/companies/')) return route.fulfill({json: envelope({id: company, name: 'Test company'})});
        if (url.pathname.includes('/employer/jobs/')) return route.fulfill({json: envelope({content: [application], page: 0, totalPages: 1})});
        return route.fulfill({json: envelope({application, history: []})});
    });
    for (const path of [`/employer/jobs/${id}/applications`, `/employer/applications/${id}`]) {
        await page.goto(path);
        await page.getByRole('button', {name: 'Xem CV', exact: true}).click();
        const frame = page.locator('iframe[title="CV: Nguyen An.pdf"]');
        await expect(frame).toBeVisible();
        const bytes = await frame.evaluate(async element => {
            const response = await fetch((element as HTMLIFrameElement).src);
            return Array.from(new Uint8Array(await response.arrayBuffer()));
        });
        expect(Buffer.from(bytes)).toEqual(pdf);
        await page.getByRole('button', {name: 'Đóng CV'}).click();
        await expect(frame).toHaveCount(0);
        const downloadEvent = page.waitForEvent('download');
        await page.getByRole('button', {name: 'Tải CV', exact: true}).click();
        const download = await downloadEvent;
        expect(download.suggestedFilename()).toBe('Nguyen An.pdf');
        expect(await readFile((await download.path())!)).toEqual(pdf);
    }
});
