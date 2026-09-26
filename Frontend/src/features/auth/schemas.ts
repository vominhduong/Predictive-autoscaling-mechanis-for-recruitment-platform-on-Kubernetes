import{z}from'zod';
export const email=z.string().trim().email('Email không hợp lệ').max(255);export const password=z.string().min(8,'Tối thiểu 8 ký tự').max(72).regex(/[A-Z]/,'Cần chữ hoa').regex(/[a-z]/,'Cần chữ thường').regex(/\d/,'Cần chữ số').regex(/[^A-Za-z0-9]/,'Cần ký tự đặc biệt');
export const loginSchema=z.object({email,password:z.string().min(1,'Nhập mật khẩu').max(72)});export const registerSchema=z.object({email,password,role:z.enum(['CANDIDATE','EMPLOYER'])});
export type LoginInput=z.infer<typeof loginSchema>;export type RegisterInput=z.infer<typeof registerSchema>;
