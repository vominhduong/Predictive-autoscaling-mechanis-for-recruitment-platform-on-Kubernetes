import {expect, test} from '@playwright/test';

const job = {
    id: '11111111-1111-4111-8111-111111111111',
    companyId: '22222222-2222-4222-8222-222222222222',
    title: 'Kỹ sư nền tảng',
    description: 'Xây dựng dịch vụ ổn định.',
    requirements: 'Java và TypeScript.',
    location: {id: '33333333-3333-4333-8333-333333333333', name: 'Hà Nội', slug: 'ha-noi'},
    category: {id: '44444444-4444-4444-8444-444444444444', name: 'Phần mềm', slug: 'phan-mem'},
    employmentType: 'FULL_TIME',
    salaryMin: 2000,
    salaryMax: 3000,
    salaryCurrency: 'USD',
    salaryNegotiable: false,
    status: 'PUBLISHED',
    applicationDeadline: '2099-12-31',
    publishedAt: '2026-01-01',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    version: 0
};
const cv = {
    id: '55555555-5555-4555-8555-555555555555',
    fileName: 'candidate.pdf',
    contentType: 'application/pdf',
    sizeBytes: 1024,
    isDefault: true,
    createdAt: '2026-01-01'
};
const application = {
    id: '66666666-6666-4666-8666-666666666666',
    jobId: job.id,
    companyId: job.companyId,
    candidateId: cv.id,
    cvId: cv.id,
    cvFileName: cv.fileName,
    jobTitle: job.title,
    candidateIdentity: 'candidate@example.com',
    status: 'APPLIED',
    version: 0,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01'
};
const envelope = (data: unknown) => ({success: true, data});
const pageData = (content: unknown[]) => ({
    content,
    page: 0,
    size: 20,
    totalElements: content.length,
    totalPages: content.length ? 1 : 0,
    first: true,
    last: true
});

for (const width of [375, 768, 1024, 1440]) {
    test(`Candidate and Employer critical controls at ${width}px`, async ({page}, info) => {
        test.skip(info.project.name !== 'chromium', 'Widths explicitly covered in Chromium');
        await page.setViewportSize({width, height: 900});
        let uploaded = false;
        let applied = false;
        let submissions = 0;
        await page.route('**/api/v1/**', async route => {
            const path = new URL(route.request().url()).pathname;
            const method = route.request().method();
            let data: unknown;
            if (path.endsWith('/candidates/me')) return route.fulfill({status: 404, json: {code: 'PROFILE_NOT_FOUND'}});
            if (path.endsWith('/candidates/me/cvs')) {
                if (method === 'POST') uploaded = true;
                data = method === 'POST' ? cv : uploaded ? [cv] : [];
            } else if (path.endsWith('/applications/me')) data = pageData(applied ? [application] : []);
            else if (path.endsWith('/applications/' + application.id)) data = {application, history: []};
            else if (path.endsWith('/applications') && method === 'POST') {
                submissions++;
                applied = true;
                data = application;
            } else if (path.endsWith('/companies/' + job.companyId)) data = {
                id: job.companyId,
                name: 'Công ty kiểm thử'
            };
            else if (path.endsWith('/metadata/categories')) data = [job.category];
            else if (path.endsWith('/metadata/locations')) data = [job.location];
            else if (path.endsWith('/jobs/' + job.id)) data = job;
            else data = pageData([job]);
            return route.fulfill({json: envelope(data)});
        });
        await page.goto('/');
        await page.evaluate(() => sessionStorage.setItem('recruitment.session', JSON.stringify({
            accessToken: 'test',
            refreshToken: 'test',
            role: 'CANDIDATE',
            email: 'candidate@example.com',
            expiresAt: Date.now() + 1000000
        })));
        await page.goto('/candidate/dashboard');
        await expect(page.getByRole('link', {name: 'Tạo hồ sơ', exact: true})).toBeVisible();
        if (width <= 1024) {
            const trigger = page.getByRole('button', {name: 'Mở menu'});
            await trigger.click();
            await expect(page.getByRole('dialog').getByRole('link', {name: 'CV của tôi'})).toBeVisible();
            await page.keyboard.press('Escape');
            await expect(trigger).toBeFocused();
        }
        await page.goto('/jobs?keyword=java&page=0');
        if (width <= 768) {
            const trigger = page.getByRole('button', {name: /Bộ lọc/});
            await trigger.click();
            await page.getByRole('dialog').getByLabel('Loại công việc').selectOption('FULL_TIME');
            await page.getByRole('dialog').getByRole('button', {name: 'Xem kết quả'}).click();
            await expect(trigger).toBeFocused();
        }
        await page.getByRole('link', {name: job.title, exact: true}).click();
        await expect(page.getByRole('link', {name: 'Quay lại danh sách'})).toHaveAttribute('href', /keyword=java/);
        await page.getByRole('link', {name: 'Tải CV lên để ứng tuyển'}).click();
        await page.getByLabel('Chọn CV PDF').setInputFiles({
            name: cv.fileName,
            mimeType: 'application/pdf',
            buffer: Buffer.from('%PDF-1.4\n%%EOF')
        });
        await page.getByRole('button', {name: 'Tải lên', exact: true}).click();
        await page.getByRole('link', {name: 'Quay lại việc làm để ứng tuyển'}).click();
        await page.getByRole('link', {name: 'Ứng tuyển ngay'}).click();
        await expect(page.getByRole('radio')).toBeChecked();
        await page.getByRole('button', {name: 'Kiểm tra và gửi hồ sơ'}).click();
        await page.getByRole('dialog').getByRole('button', {name: 'Gửi hồ sơ', exact: true}).click();
        await expect(page.getByText(/Ứng tuyển thành công!/)).toBeVisible();
        expect(submissions).toBe(1);
        await page.goto('/jobs/' + job.id);
        await expect(page.getByText('Bạn đã gửi hồ sơ cho vị trí này.')).toBeVisible();
        await page.evaluate(() => sessionStorage.setItem('recruitment.session', JSON.stringify({
            accessToken: 'test',
            refreshToken: 'test',
            role: 'EMPLOYER',
            email: 'employer@example.com',
            expiresAt: Date.now() + 1000000
        })));
        for (const path of ['/employer/dashboard', '/employer/companies', '/employer/jobs', '/employer/applications', '/employer/jobs/new?companyId=' + job.companyId]) {
            await page.goto(path);
            await expect(page.locator('main')).toBeVisible();
            expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), path).toBe(false);
        }
        await page.screenshot({path: info.outputPath(`job-form-${width}.png`), fullPage: true});
    });
}

test('Employer creates Company and draft, publishes and reviews an Application', async ({page}, info) => {
    test.skip(info.project.name !== 'chromium', 'One complete employer mutation journey');
    let created = false;
    let published = false;
    let reviewed = false;
    const company = {
        id: job.companyId,
        name: 'Công ty hành trình',
        description: '',
        address: 'Hà Nội',
        status: 'ACTIVE',
        version: 0
    };
    await page.route('**/api/v1/**', async route => {
        const path = new URL(route.request().url()).pathname;
        const method = route.request().method();
        let data: unknown;
        if (path.endsWith('/metadata/categories')) data = [job.category];
        else if (path.endsWith('/metadata/locations')) data = [job.location];
        else if (path.endsWith('/companies') && method === 'POST') data = company;
        else if (path.endsWith('/companies/' + company.id)) data = company;
        else if (path.endsWith('/jobs') && method === 'POST') {
            created = true;
            expect(route.request().postDataJSON().companyId).toBe(company.id);
            data = {...job, status: 'DRAFT'};
        } else if (path.endsWith('/jobs/' + job.id + '/status')) {
            published = true;
            expect(route.request().postDataJSON()).toEqual({status: 'PUBLISHED', version: 0});
            data = {...job, version: 1};
        } else if (path.endsWith('/employer/jobs')) data = pageData(created ? [{
            ...job,
            status: published ? 'PUBLISHED' : 'DRAFT',
            version: published ? 1 : 0
        }] : []);
        else if (path.endsWith('/applications/' + application.id + '/status')) {
            reviewed = true;
            expect(route.request().postDataJSON().newStatus).toBe('SCREENING');
            data = {application: {...application, status: 'SCREENING', version: 1}, history: []};
        } else if (path.endsWith('/applications')) data = pageData([{
            ...application,
            status: reviewed ? 'SCREENING' : 'APPLIED'
        }]);
        else data = pageData([job]);
        await route.fulfill({json: envelope(data)});
    });
    await page.goto('/');
    await page.evaluate(() => sessionStorage.setItem('recruitment.session', JSON.stringify({
        accessToken: 'test',
        refreshToken: 'test',
        role: 'EMPLOYER',
        email: 'employer@example.com',
        expiresAt: Date.now() + 1000000
    })));
    await page.goto('/employer/dashboard');
    await page.getByRole('link', {name: 'Tạo hồ sơ công ty', exact: true}).click();
    await page.getByLabel('Tên công ty').fill(company.name);
    await page.getByRole('button', {name: 'Tạo công ty', exact: true}).click();
    await page.getByRole('link', {name: 'Đăng tin tuyển dụng đầu tiên'}).click();
    await page.getByLabel('Tiêu đề *').fill(job.title);
    await page.getByLabel('Mô tả *', {exact: true}).fill(job.description);
    await page.getByLabel('Yêu cầu *', {exact: true}).fill(job.requirements);
    await page.getByLabel('Ngành nghề *', {exact: true}).selectOption(job.category.id);
    await page.getByLabel('Địa điểm *', {exact: true}).selectOption(job.location.id);
    await page.getByLabel('Lương thỏa thuận').check();
    await page.getByLabel('Hạn ứng tuyển *').fill('2099-12-31');
    await page.getByRole('button', {name: 'Lưu bản nháp'}).click();
    await expect(page.getByText(/Đã lưu tin tuyển dụng/)).toBeVisible();
    await page.getByRole('button', {name: 'Đăng tuyển', exact: true}).click();
    await page.getByRole('dialog').getByRole('button', {name: 'Đăng tuyển', exact: true}).click();
    await expect(page.getByText('Đã cập nhật trạng thái tin tuyển dụng.')).toBeVisible();
    await page.locator('main').getByRole('link', {name: 'Hồ sơ ứng tuyển', exact: true}).click();
    await page.getByRole('button', {name: 'Chuyển sang xem xét'}).click();
    await page.getByRole('dialog').getByLabel('Ghi chú (không bắt buộc)').fill('Hồ sơ đã được tiếp nhận.');
    await page.getByRole('dialog').getByRole('button', {name: 'Chuyển sang xem xét'}).click();
    await expect(page.getByText('Đã cập nhật trạng thái hồ sơ.')).toBeVisible();
    await expect(page.locator('.status')).toHaveText('Đang xem xét');
    expect(created && published && reviewed).toBe(true);
});
