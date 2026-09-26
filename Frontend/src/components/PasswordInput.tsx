import { Eye, EyeOff } from 'lucide-react';
import { forwardRef, useState, type InputHTMLAttributes } from 'react';

export const PasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function PasswordInput(props, ref) {
  const [visible, setVisible] = useState(false);
  return <span className="password-input"><input ref={ref} type={visible ? 'text' : 'password'} {...props} /><button type="button" className="password-toggle" aria-label={visible ? 'Ẩn nội dung đã nhập' : 'Hiện nội dung đã nhập'} aria-pressed={visible} onClick={() => setVisible(value => !value)}>{visible ? <EyeOff /> : <Eye />}</button></span>;
});
