'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useSystemConfig } from '@/hooks/use-system-config';

export default function InviteCard({ user }: { user?: any }) {
  // serverAddress 来自后台配置（/api/public/option）。
  //
  // 这里原先读 localStorage 的 'status'，那是上游老 React 前端的约定，
  // 本仓库从没写入过这个 key —— 所以后台配了 server_address 也不生效，
  // 永远落到 window.location.origin 兜底。
  const { serverAddress } = useSystemConfig();
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const baseUrl = (serverAddress || origin).replace(/\/+$/, '');
  const affCode = user?.aff_code || '';

  // 落地页是 /sign-in（本应用没有 /register 路由；next.config.js 里为
  // 已发出的旧链接留了 /register → /sign-in 重定向）。参数名 aff 与后端
  // 约定一致，见 lib/aff-code.ts。
  const referralLink =
    baseUrl && affCode
      ? `${baseUrl}/sign-in?aff=${encodeURIComponent(affCode)}`
      : '';

  const handleCopy = () => {
    // 邀请码还没拿到时不能复制 —— 原实现会把 aff_code 占位成字面量
    // 'CODE'，用户复制到的是一条必然失效的链接。
    if (!referralLink) {
      toast.error('Referral link is not ready yet.');
      return;
    }
    navigator.clipboard.writeText(referralLink);
    toast.success('Referral link copied to clipboard!');
  };

  return (
    <Card className="h-full">
      <CardHeader className="rounded-t-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
        <CardTitle className="flex items-center justify-between">
          <span>Invite Rewards</span>
          <span className="text-sm font-normal opacity-90">
            Invite friends for extra rewards
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-emerald-600">$0.00</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Available Earnings
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-600">$0.00</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Total Earnings
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-600">0</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Invited Users
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Referral Link</label>
          <div className="flex gap-2">
            <Input
              value={referralLink}
              readOnly
              className="bg-muted"
              placeholder="Loading referral link..."
            />
            <Button
              onClick={handleCopy}
              variant="secondary"
              className="shrink-0"
              disabled={!referralLink}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </Button>
          </div>
        </div>

        <div className="space-y-2 rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
          <p className="mb-2 font-medium text-foreground">
            Reward Instructions:
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>
              Invite friends to register, and you will receive corresponding
              rewards after they top up.
            </li>
            <li>
              Through the transfer function, reward amounts can be transferred
              to your account balance.
            </li>
            <li>The more friends you invite, the more rewards you get.</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
