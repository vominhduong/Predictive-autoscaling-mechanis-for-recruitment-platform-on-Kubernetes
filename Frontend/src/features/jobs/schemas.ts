import {z} from 'zod';

export const uuid = z.string().uuid('Mã chưa hợp lệ. Hãy chọn từ gợi ý hoặc kiểm tra mã được cung cấp.');
export const jobSchema = z.object({
    companyId: uuid,
    title: z.string().trim().min(1, 'Nhập tiêu đề').max(255),
    description: z.string().trim().min(1, 'Nhập mô tả').max(20000),
    requirements: z.string().trim().min(1, 'Nhập yêu cầu').max(20000),
    locationId: z.string().uuid('Vui lòng chọn địa điểm hợp lệ.'),
    categoryId: z.string().uuid('Vui lòng chọn ngành nghề hợp lệ.'),
    employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE']),
    salaryMin: z.number().min(0).nullable(),
    salaryMax: z.number().min(0).nullable(),
    salaryCurrency: z.string().trim().regex(/^[A-Z]{3}$/, 'Dùng mã tiền tệ 3 chữ cái'),
    salaryNegotiable: z.boolean(),
    applicationDeadline: z.string().refine(v => !!v && v > new Date().toISOString().slice(0, 10), 'Hạn nộp phải ở tương lai'),
    version: z.number().nullable()
}).refine(v => v.salaryNegotiable || v.salaryMin == null || v.salaryMax == null || v.salaryMax >= v.salaryMin, {
    message: 'Lương tối đa phải lớn hơn hoặc bằng lương tối thiểu',
    path: ['salaryMax']
});
export type JobInput = z.infer<typeof jobSchema>;
