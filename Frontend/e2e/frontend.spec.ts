import {expect, test, type Page} from '@playwright/test';

const job = {
    id: '11111111-1111-4111-8111-111111111111',
    companyId: '22222222-2222-4222-8222-222222222222',
    title: 'Senior Platform Engineer',
    description: 'Build reliable services',
    requirements: 'Java and distributed systems',
    location: {id: '33333333-3333-4333-8333-333333333333', name: 'Ho Chi Minh City', slug: 'hcm'},
    category: {id: '44444444-4444-4444-8444-444444444444', name: 'Backend', slug: 'backend'},
    employmentType: 'FULL_TIME',
    salaryMin: 2000,
    salaryMax: 3500,
    salaryCurrency: 'USD',
    salaryNegotiable: false,
    status: 'PUBLISHED',
    applicationDeadline: '2099-12-31',
    publishedAt: '2026-01-01T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    version: 0
};
const envelope = (data: unknown) => ({success: true, message: 'ok', data, timestamp: new Date().toISOString()});
const token = (role: string) => `${btoa('{}')}.${btoa(JSON.stringify({
    role,
    email: `${role.toLowerCase()}@example.com`
}))}.x`;

async function mockGateway(page: Page) {
    await page.route('**/api/v1/companies/**', route => route.fulfill({
        json: envelope({
            id: job.companyId,
            name: 'Công ty kiểm thử'
        })
    }));
    await page.route('**/api/v1/candidates/me', route => route.fulfill({
        status: 404,
        json: {code: 'PROFILE_NOT_FOUND'}
    }));
    await page.route('**/api/v1/candidates/me/cvs', route => route.fulfill({json: envelope([])}));
    await page.route('**/api/v1/jobs**', async route => {
        const url = new URL(route.request().url());
        const data = url.pathname.endsWith('/metadata/categories') ? [job.category]
            : url.pathname.endsWith('/metadata/locations') ? [job.location]
                : url.pathname.endsWith(job.id) ? job : {
                    content: [job],
                    page: 0,
                    size: 10,
                    totalElements: 1,
                    totalPages: 1,
                    first: true,
                    last: true
                };
        await route.fulfill({json: envelope(data)});
    });
    await page.route('**/api/v1/auth/login', route => route.fulfill({
        json: envelope({
            accessToken: token('CANDIDATE'),
            refreshToken: 'opaque-refresh',
            tokenType: 'Bearer',
            expiresIn: 1800,
            refreshExpiresIn: 604800
        })
    }));
    await page.route('**/api/v1/applications/me**', route => route.fulfill({
        json: envelope({
            content: [],
            page: 0,
            size: 20,
            totalElements: 0,
            totalPages: 0,
            first: true,
            last: true
        })
    }));
}

test.beforeEach(async ({page}) => mockGateway(page));

test('public user searches and opens a Job detail', async ({page}) => {
    await page.goto('/');
    await page.getByLabel('Từ khóa').fill('Platform');
    await page.getByRole('button', {name: 'Tìm việc ngay'}).click();
    await expect(page).toHaveURL(/keyword=Platform/);
    await expect(page.getByText(job.title)).toBeVisible();
    await page.getByRole('link', {name: job.title, exact: true}).click();
    await expect(page.getByText('Build reliable services')).toBeVisible();
    await expect(page.getByText('Java and distributed systems')).toBeVisible();
});

test('Candidate login restores role navigation and blocks Employer route', async ({page}) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('candidate@example.com');
    await page.getByLabel('Mật khẩu').fill('Strong#123');
    await page.getByRole('button', {name: /Đăng nhập/}).click();
    await expect(page).toHaveURL(/candidate\/dashboard/);
    await page.goto('/employer/companies');
    await expect(page).toHaveURL(/403/);
    await expect(page.getByText('Không có quyền truy cập')).toBeVisible();
});

test('mobile layout exposes navigation without horizontal overflow', async ({page}, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile');
    await page.goto('/');
    await page.getByRole('button', {name: 'Mở menu'}).click();
    await expect(page.getByRole('dialog', {name: 'Điều hướng chính'}).getByRole('link', {name: 'Việc làm'})).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
});
