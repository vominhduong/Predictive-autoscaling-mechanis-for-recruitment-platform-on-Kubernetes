import {expect, test} from '@playwright/test';
import type {JobCategoryOption, JobLocationOption} from '../src/api/jobMetadata';

test('live metadata, employer dropdowns and public filters through Gateway', async ({page, request}, info) => {
    test.skip(process.env.LIVE_E2E !== '1', 'Requires the local backend stack');
    test.setTimeout(120_000);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
        if (message.type() === 'error') errors.push(message.text());
    });
    const categoriesResponse = await request.get('/api/v1/jobs/metadata/categories');
    const locationsResponse = await request.get('/api/v1/jobs/metadata/locations');
    expect(categoriesResponse.status()).toBe(200);
    expect(locationsResponse.status()).toBe(200);
    const categories: JobCategoryOption[] = (await categoriesResponse.json()).data;
    const locations: JobLocationOption[] = (await locationsResponse.json()).data;
    expect(categories.length).toBeGreaterThanOrEqual(15);
    expect(locations.length).toBeGreaterThanOrEqual(10);
    const category = categories.find(item => item.slug === 'devops-cloud')!;
    const location = locations.find(item => item.slug === 'ho-chi-minh')!;
    expect(Object.keys(category).sort()).toEqual(['id', 'name', 'slug']);
    expect(Object.keys(location).sort()).toEqual(['id', 'name', 'slug']);

    await page.goto('/');
    await expect(page.getByLabel('Ngành nghề')).toContainText(category.name);
    await expect(page.getByLabel('Địa điểm')).toContainText(location.name);

    const email = `metadata-${info.project.name}-${Date.now()}@example.com`;
    const password = 'Metadata#Pass123';
    const registration = await request.post('/api/v1/auth/register', {data: {email, password, role: 'EMPLOYER'}});
    expect(registration.status()).toBe(201);
    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Mật khẩu').fill(password);
    await page.getByRole('button', {name: 'Đăng nhập', exact: true}).click();
    await expect(page).toHaveURL(/employer\/dashboard/);
    const token = await page.evaluate(() => JSON.parse(sessionStorage.getItem('recruitment.session')!).accessToken as string);
    const headers = {Authorization: `Bearer ${token}`};
    const companyResponse = await request.post('/api/v1/companies', {headers, data: {name: `Metadata ${Date.now()}`}});
    expect(companyResponse.status()).toBe(201);
    const company = (await companyResponse.json()).data;
    await page.goto(`/employer/jobs/new?companyId=${company.id}`);
    const title = `Metadata Engineer ${Date.now()}`;
    await page.getByLabel('Tiêu đề *').fill(title);
    await page.getByLabel('Mô tả *').fill('Build reliable metadata services');
    await page.getByLabel('Yêu cầu *').fill('Java and TypeScript');
    await page.getByLabel('Ngành nghề *').selectOption({label: category.name});
    await page.getByLabel('Địa điểm *').selectOption({label: location.name});
    await page.getByLabel('Hạn ứng tuyển *').fill('2099-12-31');
    const created = page.waitForResponse(response => response.url().endsWith('/api/v1/jobs') && response.request().method() === 'POST');
    await page.getByRole('button', {name: 'Lưu bản nháp'}).click();
    const createResponse = await created;
    expect(createResponse.status()).toBe(201);
    const job = (await createResponse.json()).data;
    expect(createResponse.request().postDataJSON()).toMatchObject({categoryId: category.id, locationId: location.id});
    await expect(page).toHaveURL(new RegExp(`/employer/companies/${company.id}/jobs`));
    await page.goto(`/employer/jobs/${job.id}/edit?companyId=${company.id}`);
    await expect(page.getByLabel('Ngành nghề *')).toHaveValue(category.id);
    await expect(page.getByLabel('Địa điểm *')).toHaveValue(location.id);
    await page.getByLabel('Tiêu đề *').fill(title + ' Updated');
    const updated = page.waitForResponse(response => response.url().endsWith('/api/v1/jobs/' + job.id) && response.request().method() === 'PUT');
    await page.getByRole('button', {name: 'Cập nhật', exact: true}).click();
    const updateResponse = await updated;
    expect(updateResponse.status()).toBe(200);
    const version = (await updateResponse.json()).data.version;
    const published = await request.patch(`/api/v1/jobs/${job.id}/status`, {
        headers,
        data: {status: 'PUBLISHED', version}
    });
    expect(published.status()).toBe(200);
    await page.evaluate(() => sessionStorage.removeItem('recruitment.session'));

    let categoryCalls = 0, locationCalls = 0;
    page.on('request', req => {
        if (req.url().endsWith('/metadata/categories')) categoryCalls++;
        if (req.url().endsWith('/metadata/locations')) locationCalls++;
    });
    await page.goto('/jobs');
    const search = page.getByRole('search');
    await search.getByLabel('Ngành nghề').selectOption(category.id);
    await search.getByRole('button', {name: 'Tìm việc', exact: true}).click();
    await expect(page).toHaveURL(new RegExp(`categoryId=${category.id}`));
    await expect(page.getByRole('link', {name: title + ' Updated', exact: true})).toBeVisible();
    await search.getByLabel('Địa điểm').selectOption(location.id);
    await search.getByRole('button', {name: 'Tìm việc', exact: true}).click();
    await expect(page).toHaveURL(new RegExp(`locationId=${location.id}`));
    expect(categoryCalls).toBe(1);
    expect(locationCalls).toBe(1);
    await page.reload();
    await expect(search.getByLabel('Ngành nghề')).toHaveValue(category.id);
    await expect(search.getByLabel('Địa điểm')).toHaveValue(location.id);
    const chips = page.getByLabel('Bộ lọc đang áp dụng');
    await expect(chips.getByRole('button', {name: category.name})).toBeVisible();
    await expect(chips.getByRole('button', {name: location.name})).toBeVisible();
    await chips.getByRole('button', {name: category.name}).click();
    await expect(page).not.toHaveURL(/categoryId=/);
    await expect(page.getByRole('link', {name: title + ' Updated', exact: true})).toBeVisible();
    if (info.project.name === 'mobile') {
        await page.getByRole('button', {name: /Bộ lọc/}).click();
        const drawer = page.getByRole('dialog', {name: 'Bộ lọc việc làm'});
        await drawer.getByLabel('Ngành nghề').selectOption(category.id);
        await drawer.getByRole('button', {name: 'Xem kết quả'}).click();
        await expect(page).toHaveURL(new RegExp(`categoryId=${category.id}`));
    }
    const card = page.locator('article').filter({has: page.getByRole('link', {name: title + ' Updated', exact: true})});
    await expect(card).toContainText(category.name);
    await expect(card).toContainText(location.name);
    await expect(card).not.toContainText(category.id);
    await expect(card).not.toContainText(location.id);
    await page.getByRole('link', {name: title + ' Updated', exact: true}).click();
    await expect(page.locator('main')).toContainText(category.name);
    await expect(page.locator('main')).toContainText(location.name);
    await expect(page.locator('main')).not.toContainText(category.id);
    await expect(page.locator('main')).not.toContainText(location.id);
    await expect(page.getByText('Build reliable metadata services')).toBeVisible();
    expect(errors).toEqual([]);
});
