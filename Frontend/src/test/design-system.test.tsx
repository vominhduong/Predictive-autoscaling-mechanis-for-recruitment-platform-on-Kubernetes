import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button, Dialog, Skeleton, ToastProvider, useToast } from '../components/DesignSystem';

describe('design system interactions', () => {
  it('exposes loading state and prevents repeated button actions', async () => {
    const action = vi.fn();
    render(<Button loading onClick={action}>Lưu thay đổi</Button>);
    const button = screen.getByRole('button', { name: 'Lưu thay đổi' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(button);
    expect(action).not.toHaveBeenCalled();
  });

  it('moves focus into a dialog and closes it with Escape', async () => {
    const close = vi.fn();
    render(<Dialog open title="Xóa CV?" description="Hành động này không thể hoàn tác." danger onClose={close} onConfirm={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: 'Xóa CV?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hủy' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(close).toHaveBeenCalledOnce();
  });

  it('announces skeleton loading state', () => {
    render(<Skeleton rows={2} />);
    expect(screen.getByRole('status', { name: 'Đang tải dữ liệu' })).toBeInTheDocument();
  });

  it('announces toast feedback and allows dismissal', async () => {
    function Trigger() { const toast = useToast(); return <button onClick={() => toast.push('Đã lưu hồ sơ')}>Lưu</button>; }
    render(<ToastProvider><Trigger /></ToastProvider>);
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(screen.getByText('Đã lưu hồ sơ')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Đóng thông báo' }));
    expect(screen.queryByText('Đã lưu hồ sơ')).not.toBeInTheDocument();
  });
});
