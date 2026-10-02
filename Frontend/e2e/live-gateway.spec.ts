import {expect, test} from '@playwright/test';

test('critical Candidate and Employer flow through the real API Gateway', async ({page}, testInfo) => {
    test.skip(process.env.LIVE_E2E !== '1' || testInfo.project.name !== 'chromium', 'Requires the local backend stack');
    test.setTimeout(120_000);
    const trustedHeaderViolations: string[] = [];
    page.on('request', request => {
        const headers = request.headers();
        if (headers['x-user-id'] || headers['x-user-email'] || headers['x-user-role']) trustedHeaderViolations.push(request.url());
    });
    page.on('dialog', dialog => dialog.accept(dialog.type() === 'prompt' ? 'Frontend review' : undefined));
    const stamp = Date.now();
    const employer = `p10-employer-${stamp}@example.com`;
    const candidate = `p10-candidate-${stamp}@example.com`;
    const outsider = `p10-outsider-${stamp}@example.com`;
    const password = 'Manual#Pass123';

    const register = async (email: string, role: 'CANDIDATE' | 'EMPLOYER') => {
        await page.goto('/register');
        await page.getByLabel(role === 'CANDIDATE' ? /Ứng viên/ : /Nhà tuyển dụng/).check();
        await page.getByLabel('Email').fill(email);
        await page.getByLabel('Mật khẩu').fill(password);
        await page.getByRole('button', {name: 'Tạo tài khoản'}).click();
        await expect(page).toHaveURL(/login/);
    };
    const login = async (email: string, role: 'CANDIDATE' | 'EMPLOYER') => {
        await page.goto('/login');
        await page.getByLabel('Email').fill(email);
        await page.getByLabel('Mật khẩu').fill(password);
        await page.getByRole('button', {name: 'Đăng nhập'}).click();
        await expect(page).toHaveURL(role === 'CANDIDATE' ? /candidate\/dashboard/ : /employer\/dashboard/);
    };
    const logout = async () => {
        await page.getByRole('button', {name: /Đăng xuất/}).click();
        await expect(page).toHaveURL('/');
    };

    await register(employer, 'EMPLOYER');
    await login(employer, 'EMPLOYER');
    await page.goto('/employer/companies');
    await page.getByLabel('Tên công ty').fill(`Prompt 10 Company ${stamp}`);
    await page.getByLabel('Mô tả').fill('Frontend live verification');
    await page.getByLabel('Địa chỉ').fill('Ho Chi Minh City');
    await page.getByRole('button', {name: /Tạo công ty/}).click();
    const companyLink = page.getByRole('link', {name: new RegExp(`Prompt 10 Company ${stamp}`)});
    await expect(companyLink).toBeVisible();
    await companyLink.click();
    const companyId = new URL(page.url()).pathname.split('/').at(-1)!;
    await page.locator('main').getByRole('link', {name: 'Tin tuyển dụng', exact: true}).click();
    await page.getByRole('link', {name: 'Đăng tin tuyển dụng', exact: true}).click();
    await page.getByLabel('Tiêu đề').fill(`Prompt 10 Engineer ${stamp}`);
    await page.getByLabel('Ngành nghề *').selectOption({label: 'Backend Development'});
    await page.getByLabel('Địa điểm *').selectOption({label: 'Hồ Chí Minh'});
    await page.getByLabel('Lương tối thiểu').fill('1500');
    await page.getByLabel('Lương tối đa').fill('3000');
    await page.getByLabel('Hạn ứng tuyển').fill('2099-12-31');
    await page.getByLabel('Mô tả').fill('Build reliable recruitment software');
    await page.getByLabel('Yêu cầu').fill('TypeScript and Java');
    await page.getByRole('button', {name: 'Lưu bản nháp'}).click();
    await expect(page).toHaveURL(new RegExp(`/employer/companies/${companyId}/jobs`));
    await page.getByRole('button', {name: 'Đăng tuyển', exact: true}).click();
    await page.getByRole('dialog').getByRole('button', {name: 'Đăng tuyển', exact: true}).click();
    await expect(page.locator('.status', {hasText: 'Đang tuyển'})).toBeVisible();
    const applicationLink = page.locator('main').getByRole('link', {name: 'Hồ sơ ứng tuyển', exact: true});
    const jobId = (await applicationLink.getAttribute('href'))!.split('/')[3];
    await logout();

    await page.goto('/jobs');
    await expect(page.getByText(`Prompt 10 Engineer ${stamp}`)).toBeVisible();
    await page.getByRole('link', {name: `Prompt 10 Engineer ${stamp}`, exact: true}).click();
    await expect(page.getByText('Build reliable recruitment software')).toBeVisible();

    await register(candidate, 'CANDIDATE');
    await login(candidate, 'CANDIDATE');
    await page.goto('/candidate/profile');
    await page.getByLabel('Họ và tên').fill('Prompt Ten Candidate');
    await page.getByLabel('Chức danh nghề nghiệp').fill('Platform Engineer');
    await page.getByRole('button', {name: 'Lưu hồ sơ'}).click();
    await expect(page.getByText('Đã lưu hồ sơ.')).toBeVisible();
    await page.goto('/candidate/cvs');
    await page.getByLabel('Chọn CV PDF').setInputFiles({
        name: 'prompt10.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4\n%%EOF')
    });
    const uploaded = page.waitForResponse(response => response.request().method() === 'POST'
        && response.url().includes('/api/v1/candidates/me/cvs'));
    await page.getByRole('button', {name: 'Tải lên', exact: true}).click();
    expect((await uploaded).status()).toBe(201);
    await expect(page.getByText('prompt10.pdf')).toBeVisible();
    await page.goto(`/jobs/${jobId}/apply`);
    await page.getByRole('radio', {name: /prompt10.pdf/}).check();
    await page.getByLabel('Nội dung').fill('Frontend live application');
    await page.getByRole('button', {name: 'Kiểm tra và gửi hồ sơ'}).click();
    await page.getByRole('dialog').getByRole('button', {name: 'Gửi hồ sơ'}).click();
    await expect(page).toHaveURL(/candidate\/applications\//);
    await expect(page.getByText('Đã ứng tuyển', {exact: true}).first()).toBeVisible();
    const applicationId = new URL(page.url()).pathname.split('/').at(-1)!;
    await page.goto(`/jobs/${jobId}/apply`);
    await expect(page.getByText('Hồ sơ đã được gửi')).toBeVisible();
    await page.goto('/employer/companies');
    await expect(page).toHaveURL(/403/);
    await logout();

    await login(employer, 'EMPLOYER');
    await page.goto(`/employer/jobs/${jobId}/applications`);
    await expect(page.getByText(candidate)).toBeVisible();
    const statusUpdated = page.waitForResponse(response => response.request().method() === 'PATCH' && response.url().endsWith(`/api/v1/applications/${applicationId}/status`) && response.ok());
    await page.getByRole('button', {name: 'Chuyển sang xem xét'}).click();
    await page.getByRole('dialog').getByRole('button', {name: 'Chuyển sang xem xét'}).click();
    await statusUpdated;
    await expect(page.locator('.status', {hasText: 'Đang xem xét'})).toBeVisible();
    await page.goto(`/employer/companies/${companyId}/jobs`);
    await page.getByRole('button', {name: 'Ẩn tin', exact: true}).click();
    await page.getByRole('dialog').getByRole('button', {name: 'Ẩn tin', exact: true}).click();
    await expect(page.locator('.status', {hasText: 'Đã ẩn'})).toBeVisible();
    await page.getByRole('button', {name: 'Đăng tuyển', exact: true}).click();
    await page.getByRole('dialog').getByRole('button', {name: 'Đăng tuyển', exact: true}).click();
    await expect(page.locator('.status', {hasText: 'Đang tuyển'})).toBeVisible();
    await page.getByRole('button', {name: 'Đóng tin', exact: true}).click();
    await page.getByRole('dialog').getByRole('button', {name: 'Đóng tin', exact: true}).click();
    await expect(page.locator('.status', {hasText: 'Đã đóng'})).toBeVisible();
    await logout();

    await login(candidate, 'CANDIDATE');
    await page.goto(`/candidate/applications/${applicationId}`);
    await expect(page.getByText('Đang xem xét', {exact: true}).first()).toBeVisible();
    await page.reload();
    await expect(page.getByText('Đang xem xét', {exact: true}).first()).toBeVisible();
    await page.goto('/candidate/cvs');
    await page.getByRole('button', {name: 'Xóa prompt10.pdf'}).click();
    await page.getByRole('dialog').getByRole('button', {name: 'Xóa CV', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'prompt10.pdf', exact: true})).not.toBeVisible();
    await logout();

    await register(outsider, 'EMPLOYER');
    await login(outsider, 'EMPLOYER');
    await page.goto(`/employer/companies/${companyId}`);
    await expect(page.getByRole('button', {name: 'Lưu thay đổi'})).toBeDisabled();
    await page.goto(`/employer/companies/${companyId}/jobs`);
    await expect(page.getByText(/Bạn không có quyền/)).toBeVisible();
    await logout();
    expect(trustedHeaderViolations).toEqual([]);
});
