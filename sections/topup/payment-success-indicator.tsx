'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

// 支付成功回跳指示器。Stripe success_url 带 ?paid=1 跳回本页时渲染，
// 弹出成功提示并刷新服务端数据（余额、交易记录），随后去掉 ?paid 参数
// 防止刷新或分享 URL 时重复弹提示。
export default function PaymentSuccessIndicator({ paid }: { paid?: string }) {
  const router = useRouter();

  useEffect(() => {
    if (!paid) return;
    toast.success('Top-up successful. Credits added.');
    router.refresh();
    const url = new URL(window.location.href);
    url.searchParams.delete('paid');
    window.history.replaceState({}, '', url.toString());
  }, [paid, router]);

  return null;
}
