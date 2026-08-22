'use client';
import { useState, useEffect } from 'react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import PageContainer from '@/components/layout/page-container';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Save,
  Mail,
  MessageSquare,
  SendHorizontal,
  HardDrive,
  Github,
  LogIn
} from 'lucide-react';

const breadcrumbItems = [
  { title: 'Dashboard', link: '/dashboard' },
  { title: 'System settings', link: '/dashboard/setting' }
];

interface Option {
  key: string;
  value: any;
}

interface OAuthConfigStatus {
  baseUrl: string;
  githubConfigured: boolean;
  googleConfigured: boolean;
  githubCallbackUrl: string;
  googleCallbackUrl: string;
}

export default function SettingPage() {
  // ==================== 通用设置状态 ====================
  const [systemName, setSystemName] = useState('');
  const [frontendServerAddress, setFrontendServerAddress] = useState('');
  const [serverAddress, setServerAddress] = useState('');
  const [docsAddress, setDocsAddress] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [autoDisableEnabled, setAutoDisableEnabled] = useState(false);
  const [autoDisableKeywords, setAutoDisableKeywords] = useState('');
  const [retryKeywords, setRetryKeywords] = useState('');
  const [autoEnableEnabled, setAutoEnableEnabled] = useState(false);
  const [autoTestFrequency, setAutoTestFrequency] = useState(0);
  // 响应时间阈值（秒）：自动启用时若渠道响应时间超过此值则跳过启用
  const [channelDisableThreshold, setChannelDisableThreshold] = useState(0);
  const [upstreamIntervalMinutes, setUpstreamIntervalMinutes] = useState(30);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ==================== OAuth login settings ====================
  const [githubOAuthEnabled, setGithubOAuthEnabled] = useState(false);
  const [googleOAuthEnabled, setGoogleOAuthEnabled] = useState(false);
  const [oauthConfig, setOAuthConfig] = useState<OAuthConfigStatus | null>(
    null
  );

  // ==================== 提醒设置状态 ====================
  // SMTP 邮箱配置
  const [smtpServer, setSmtpServer] = useState('');
  const [smtpPort, setSmtpPort] = useState('');
  const [smtpAccount, setSmtpAccount] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');
  const [smtpToken, setSmtpToken] = useState('');
  const [smtpSSLEnabled, setSmtpSSLEnabled] = useState(false);

  // 飞书 Webhook 配置（支持多个，每行一个）
  const [feishuWebhookUrls, setFeishuWebhookUrls] = useState('');

  // ==================== S3/R2 存储配置状态 ====================
  const [cfR2storeEnabled, setCfR2storeEnabled] = useState(false);
  const [cfBucketFileName, setCfBucketFileName] = useState('');
  const [cfFileAccessKey, setCfFileAccessKey] = useState('');
  const [cfFileSecretKey, setCfFileSecretKey] = useState('');
  const [cfFileEndpoint, setCfFileEndpoint] = useState('');
  const [cfFilePublicUrl, setCfFilePublicUrl] = useState('');

  // 测试相关状态
  const [testEmail, setTestEmail] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  // 获取设置数据
  const fetchOptions = async () => {
    try {
      setIsDataLoading(true);
      const response = await fetch('/api/option');
      if (!response.ok) {
        throw new Error('Failed to fetch options');
      }
      const result = await response.json();
      if (result.success && result.data) {
        const options = result.data;

        const githubOAuthOption = options.find(
          (o: Option) => o.key === 'GitHubOAuthEnabled'
        );
        setGithubOAuthEnabled(
          githubOAuthOption?.value === 'true' ||
            githubOAuthOption?.value === true
        );

        const googleOAuthOption = options.find(
          (o: Option) => o.key === 'GoogleOAuthEnabled'
        );
        setGoogleOAuthEnabled(
          googleOAuthOption?.value === 'true' ||
            googleOAuthOption?.value === true
        );

        // 加载系统名称
        const systemNameOption = options.find(
          (o: Option) => o.key === 'SystemName'
        );
        if (systemNameOption) {
          setSystemName(systemNameOption.value || '');
        }

        const frontendServerAddressOption = options.find(
          (o: Option) => o.key === 'FrontendServerAddress'
        );
        if (frontendServerAddressOption) {
          setFrontendServerAddress(frontendServerAddressOption.value || '');
        }

        const serverAddressOption = options.find(
          (o: Option) => o.key === 'ServerAddress'
        );
        if (serverAddressOption) {
          setServerAddress(serverAddressOption.value || '');
        }

        const docsAddressOption = options.find(
          (o: Option) => o.key === 'DocsAddress'
        );
        if (docsAddressOption) {
          setDocsAddress(docsAddressOption.value || '');
        }

        const retryCountOption = options.find(
          (o: Option) => o.key === 'RetryTimes'
        );
        if (retryCountOption) {
          setRetryCount(parseInt(retryCountOption.value) || 0);
        }

        const autoDisableEnabledOption = options.find(
          (o: Option) => o.key === 'AutomaticDisableChannelEnabled'
        );
        if (autoDisableEnabledOption) {
          setAutoDisableEnabled(
            autoDisableEnabledOption.value === 'true' ||
              autoDisableEnabledOption.value === true
          );
        }

        const autoDisableKeywordsOption = options.find(
          (o: Option) => o.key === 'AutoDisableKeywords'
        );
        if (autoDisableKeywordsOption) {
          setAutoDisableKeywords(autoDisableKeywordsOption.value || '');
        }

        const retryKeywordsOption = options.find(
          (o: Option) => o.key === 'RetryKeywords'
        );
        if (retryKeywordsOption) {
          setRetryKeywords(retryKeywordsOption.value || '');
        }

        const autoEnableEnabledOption = options.find(
          (o: Option) => o.key === 'AutomaticEnableChannelEnabled'
        );
        if (autoEnableEnabledOption) {
          setAutoEnableEnabled(
            autoEnableEnabledOption.value === 'true' ||
              autoEnableEnabledOption.value === true
          );
        }

        const autoTestFrequencyOption = options.find(
          (o: Option) => o.key === 'AutoTestChannelFrequency'
        );
        if (autoTestFrequencyOption) {
          setAutoTestFrequency(parseInt(autoTestFrequencyOption.value) || 0);
        }

        const channelDisableThresholdOption = options.find(
          (o: Option) => o.key === 'ChannelDisableThreshold'
        );
        if (channelDisableThresholdOption) {
          setChannelDisableThreshold(
            parseFloat(channelDisableThresholdOption.value) || 0
          );
        }

        const upstreamIntervalOption = options.find(
          (o: Option) => o.key === 'UpstreamModelUpdateIntervalMinutes'
        );
        if (upstreamIntervalOption) {
          setUpstreamIntervalMinutes(
            parseInt(upstreamIntervalOption.value) || 30
          );
        }

        // ==================== 加载提醒设置 ====================
        // SMTP 配置
        const smtpServerOption = options.find(
          (o: Option) => o.key === 'SMTPServer'
        );
        if (smtpServerOption) {
          setSmtpServer(smtpServerOption.value || '');
        }

        const smtpPortOption = options.find(
          (o: Option) => o.key === 'SMTPPort'
        );
        if (smtpPortOption) {
          setSmtpPort(smtpPortOption.value || '');
        }

        const smtpAccountOption = options.find(
          (o: Option) => o.key === 'SMTPAccount'
        );
        if (smtpAccountOption) {
          setSmtpAccount(smtpAccountOption.value || '');
        }

        const smtpFromOption = options.find(
          (o: Option) => o.key === 'SMTPFrom'
        );
        if (smtpFromOption) {
          setSmtpFrom(smtpFromOption.value || '');
        }

        const smtpSSLOption = options.find(
          (o: Option) => o.key === 'SMTPSSLEnabled'
        );
        if (smtpSSLOption) {
          setSmtpSSLEnabled(
            smtpSSLOption.value === 'true' || smtpSSLOption.value === true
          );
        }

        // 飞书 Webhook 配置（支持多个）
        const feishuWebhookOption = options.find(
          (o: Option) => o.key === 'FeishuWebhookUrls'
        );
        if (feishuWebhookOption) {
          setFeishuWebhookUrls(feishuWebhookOption.value || '');
        }

        // ==================== 加载 S3/R2 存储配置 ====================
        const cfR2storeEnabledOption = options.find(
          (o: Option) => o.key === 'CfR2storeEnabled'
        );
        if (cfR2storeEnabledOption) {
          setCfR2storeEnabled(
            cfR2storeEnabledOption.value === 'true' ||
              cfR2storeEnabledOption.value === true
          );
        }

        const cfBucketFileNameOption = options.find(
          (o: Option) => o.key === 'CfBucketFileName'
        );
        if (cfBucketFileNameOption) {
          setCfBucketFileName(cfBucketFileNameOption.value || '');
        }

        const cfFileAccessKeyOption = options.find(
          (o: Option) => o.key === 'CfFileAccessKey'
        );
        if (cfFileAccessKeyOption) {
          setCfFileAccessKey(cfFileAccessKeyOption.value || '');
        }

        const cfFileEndpointOption = options.find(
          (o: Option) => o.key === 'CfFileEndpoint'
        );
        if (cfFileEndpointOption) {
          setCfFileEndpoint(cfFileEndpointOption.value || '');
        }

        const cfFilePublicUrlOption = options.find(
          (o: Option) => o.key === 'CfFilePublicUrl'
        );
        if (cfFilePublicUrlOption) {
          setCfFilePublicUrl(cfFilePublicUrlOption.value || '');
        }

        const oauthStatusResponse = await fetch('/api/auth/config-status');
        if (oauthStatusResponse.ok) {
          setOAuthConfig(await oauthStatusResponse.json());
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setIsDataLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const generalOptions = [
        { key: 'SystemName', value: systemName },
        {
          key: 'FrontendServerAddress',
          value: frontendServerAddress.trim()
        },
        { key: 'ServerAddress', value: serverAddress.trim() },
        { key: 'DocsAddress', value: docsAddress.trim() },
        { key: 'RetryTimes', value: retryCount.toString() },
        {
          key: 'AutomaticDisableChannelEnabled',
          value: autoDisableEnabled.toString()
        },
        { key: 'AutoDisableKeywords', value: autoDisableKeywords },
        { key: 'RetryKeywords', value: retryKeywords },
        {
          key: 'AutomaticEnableChannelEnabled',
          value: autoEnableEnabled.toString()
        },
        {
          key: 'AutoTestChannelFrequency',
          value: autoTestFrequency.toString()
        },
        {
          key: 'ChannelDisableThreshold',
          value: channelDisableThreshold.toString()
        },
        {
          key: 'UpstreamModelUpdateIntervalMinutes',
          value: upstreamIntervalMinutes.toString()
        }
      ];

      for (const option of generalOptions) {
        const response = await fetch('/api/option', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(option)
        });

        if (!response.ok) {
          throw new Error(`Failed to save ${option.key}`);
        }
      }

      toast.success('Saved.');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Save failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetryCountChange = (value: string) => {
    const count = parseInt(value);
    if (!isNaN(count) && count >= 0) {
      setRetryCount(count);
    }
  };

  const handleSaveOAuth = async () => {
    setIsLoading(true);
    try {
      const oauthOptions = [
        {
          key: 'GitHubOAuthEnabled',
          value: githubOAuthEnabled.toString()
        },
        {
          key: 'GoogleOAuthEnabled',
          value: googleOAuthEnabled.toString()
        }
      ];

      for (const option of oauthOptions) {
        const response = await fetch('/api/option', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(option)
        });
        if (!response.ok) throw new Error(`Failed to save ${option.key}`);
      }

      toast.success('OAuth login settings saved.');
    } catch (error) {
      console.error('Save OAuth error:', error);
      toast.error('Failed to save OAuth login settings.');
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== 保存 SMTP 设置 ====================
  const handleSaveSMTP = async () => {
    setIsLoading(true);
    try {
      const smtpOptions = [
        { key: 'SMTPServer', value: smtpServer },
        { key: 'SMTPPort', value: smtpPort },
        { key: 'SMTPAccount', value: smtpAccount },
        { key: 'SMTPFrom', value: smtpFrom },
        { key: 'SMTPSSLEnabled', value: smtpSSLEnabled.toString() }
      ];

      // 只有当 smtpToken 不为空时才更新（敏感信息）
      if (smtpToken) {
        smtpOptions.push({ key: 'SMTPToken', value: smtpToken });
      }

      for (const option of smtpOptions) {
        const response = await fetch('/api/option', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(option)
        });
        if (!response.ok) {
          throw new Error(`Failed to save ${option.key}`);
        }
      }

      toast.success('SMTP settings saved.');
      setSmtpToken(''); // clear the password field
    } catch (error) {
      console.error('Save SMTP error:', error);
      toast.error('Save failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== 保存飞书设置 ====================
  const handleSaveFeishu = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/option', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'FeishuWebhookUrls',
          value: feishuWebhookUrls
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save Feishu webhook');
      }

      toast.success('Feishu webhook settings saved.');
    } catch (error) {
      console.error('Save Feishu error:', error);
      toast.error('Save failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== 保存 S3/R2 存储设置 ====================
  const handleSaveStorage = async () => {
    setIsLoading(true);
    try {
      const storageOptions = [
        { key: 'CfR2storeEnabled', value: cfR2storeEnabled.toString() },
        { key: 'CfBucketFileName', value: cfBucketFileName },
        { key: 'CfFileEndpoint', value: cfFileEndpoint },
        { key: 'CfFilePublicUrl', value: cfFilePublicUrl }
      ];

      // 只有当 AccessKey 不为空时才更新（敏感信息）
      if (cfFileAccessKey) {
        storageOptions.push({ key: 'CfFileAccessKey', value: cfFileAccessKey });
      }

      // 只有当 SecretKey 不为空时才更新（敏感信息）
      if (cfFileSecretKey) {
        storageOptions.push({ key: 'CfFileSecretKey', value: cfFileSecretKey });
      }

      for (const option of storageOptions) {
        const response = await fetch('/api/option', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(option)
        });
        if (!response.ok) {
          throw new Error(`Failed to save ${option.key}`);
        }
      }

      toast.success('Storage settings saved.');
      setCfFileAccessKey(''); // clear key fields
      setCfFileSecretKey('');
    } catch (error) {
      console.error('Save Storage error:', error);
      toast.error('Save failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== 测试 SMTP 邮件发送 ====================
  const handleTestSMTP = async () => {
    if (!testEmail) {
      toast.error('Enter a test email address.');
      return;
    }

    // simple email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
      toast.error('Enter a valid email address.');
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch('/api/test/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success('Test email sent. Check your inbox.');
      } else {
        toast.error(result.message || 'Failed to send test email.');
      }
    } catch (error) {
      console.error('Test SMTP error:', error);
      toast.error('Failed to send test email. Check your SMTP settings.');
    } finally {
      setIsTesting(false);
    }
  };

  // ==================== 测试飞书 Webhook ====================
  const handleTestFeishu = async () => {
    if (!feishuWebhookUrls.trim()) {
      toast.error('Enter a Feishu webhook URL first.');
      return;
    }

    // parse multiple webhook URLs (split by line, filter blanks)
    const urls = feishuWebhookUrls
      .split('\n')
      .map((url) => url.trim())
      .filter((url) => url.length > 0);

    if (urls.length === 0) {
      toast.error('Enter at least one valid webhook URL.');
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch('/api/test/feishu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrls: urls })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(`Feishu test message sent to ${urls.length} webhook(s).`);
      } else {
        toast.error(result.message || 'Failed to send Feishu test message.');
      }
    } catch (error) {
      console.error('Test Feishu error:', error);
      toast.error('Feishu test failed. Check the webhook URL.');
    } finally {
      setIsTesting(false);
    }
  };

  if (error)
    return (
      <div className="p-4 text-red-500">Failed to load settings: {error}</div>
    );
  if (isDataLoading) return <div className="p-4">Loading...</div>;

  return (
    <PageContainer scrollable>
      <div className="space-y-6">
        <Breadcrumbs items={breadcrumbItems} />

        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">System settings</h2>
          <div className="flex items-center space-x-2">
            <Button onClick={handleSave} disabled={isLoading}>
              <Save className="mr-2 h-4 w-4" />
              {isLoading ? 'Saving...' : 'Save settings'}
            </Button>
          </div>
        </div>
        <Separator />

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="system-name">System name</Label>
                <Input
                  id="system-name"
                  type="text"
                  value={systemName}
                  onChange={(e) => setSystemName(e.target.value)}
                  placeholder="e.g. Production, Client A"
                />
                <p className="text-sm text-muted-foreground">
                  Used as a prefix in all push notifications (email, Feishu,
                  etc.) to distinguish different sites.
                </p>
              </div>
              <div className="grid w-full max-w-2xl items-center gap-1.5">
                <Label htmlFor="frontend-server-address">
                  Frontend server address
                </Label>
                <Input
                  id="frontend-server-address"
                  type="text"
                  value={frontendServerAddress}
                  onChange={(e) => setFrontendServerAddress(e.target.value)}
                  placeholder="e.g. https://web.example.com"
                />
                <p className="text-sm text-muted-foreground">
                  Corresponds to FrontendServerAddress. Used for frontend page
                  access and browser redirect URLs.
                </p>
              </div>
              <div className="grid w-full max-w-2xl items-center gap-1.5">
                <Label htmlFor="server-address">Backend server address</Label>
                <Input
                  id="server-address"
                  type="text"
                  value={serverAddress}
                  onChange={(e) => setServerAddress(e.target.value)}
                  placeholder="e.g. https://api.example.com"
                />
                <p className="text-sm text-muted-foreground">
                  Corresponds to ServerAddress. Used for the public API address,
                  callback URLs, and resource access.
                </p>
              </div>
              <div className="grid w-full max-w-2xl items-center gap-1.5">
                <Label htmlFor="docs-address">Docs address</Label>
                <Input
                  id="docs-address"
                  type="text"
                  value={docsAddress}
                  onChange={(e) => setDocsAddress(e.target.value)}
                  placeholder="e.g. https://docs.example.com"
                />
                <p className="text-sm text-muted-foreground">
                  Corresponds to DocsAddress. Used for the documentation link on
                  the home page and navigation bar.
                </p>
              </div>
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="retry-count">Retry count</Label>
                <Input
                  id="retry-count"
                  type="number"
                  min="0"
                  max="10"
                  value={retryCount}
                  onChange={(e) => handleRetryCountChange(e.target.value)}
                  placeholder="Enter retry count"
                />
                <p className="text-sm text-muted-foreground">
                  Number of retries when an upstream channel returns a 5xx error
                  or times out. Set this carefully.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogIn className="h-5 w-5" />
                OAuth login
              </CardTitle>
              <CardDescription>
                Configure and control third-party login for the sign-in and
                registration pages.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="flex min-w-0 flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-2">
                    <Label
                      htmlFor="github-oauth-enabled"
                      className="flex items-center gap-2 text-base"
                    >
                      <Github className="h-4 w-4" /> GitHub login
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Environment: GITHUB_ID and GITHUB_SECRET
                    </p>
                    <p className="break-all rounded-md bg-muted px-3 py-2 font-mono text-xs leading-relaxed text-muted-foreground">
                      Callback: {oauthConfig?.githubCallbackUrl || 'Loading...'}
                    </p>
                    <p
                      className={`text-xs ${
                        oauthConfig?.githubConfigured
                          ? 'text-green-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {oauthConfig?.githubConfigured
                        ? 'Credentials configured'
                        : 'Credentials missing — configure both variables and restart the frontend'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                    <span className="text-xs text-muted-foreground sm:hidden">
                      Enable
                    </span>
                    <Switch
                      id="github-oauth-enabled"
                      checked={githubOAuthEnabled}
                      onCheckedChange={setGithubOAuthEnabled}
                      disabled={
                        !oauthConfig?.githubConfigured && !githubOAuthEnabled
                      }
                    />
                  </div>
                </div>

                <div className="flex min-w-0 flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-2">
                    <Label
                      htmlFor="google-oauth-enabled"
                      className="flex items-center gap-2 text-base"
                    >
                      <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-blue-600 text-[10px] font-bold text-white">
                        G
                      </span>
                      Google login
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Environment: GOOGLE_ID and GOOGLE_SECRET
                    </p>
                    <p className="break-all rounded-md bg-muted px-3 py-2 font-mono text-xs leading-relaxed text-muted-foreground">
                      Callback: {oauthConfig?.googleCallbackUrl || 'Loading...'}
                    </p>
                    <p
                      className={`text-xs ${
                        oauthConfig?.googleConfigured
                          ? 'text-green-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {oauthConfig?.googleConfigured
                        ? 'Credentials configured'
                        : 'Credentials missing — configure both variables and restart the frontend'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                    <span className="text-xs text-muted-foreground sm:hidden">
                      Enable
                    </span>
                    <Switch
                      id="google-oauth-enabled"
                      checked={googleOAuthEnabled}
                      onCheckedChange={setGoogleOAuthEnabled}
                      disabled={
                        !oauthConfig?.googleConfigured && !googleOAuthEnabled
                      }
                    />
                  </div>
                </div>
              </div>

              <p className="rounded-lg border border-dashed p-3 text-sm leading-relaxed text-muted-foreground">
                OAuth secrets are deployment credentials. They are read only by
                the NextAuth server and are never stored in or returned to the
                browser.
              </p>
              <Button
                className="w-full sm:w-auto"
                onClick={handleSaveOAuth}
                disabled={isLoading}
              >
                <Save className="mr-2 h-4 w-4" />
                Save OAuth settings
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Auto-disable channels</CardTitle>
              <CardDescription>
                When a response contains any of the following keywords, the
                channel will be automatically disabled. One keyword per line;
                matching is case-insensitive.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* auto-disable toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="auto-disable-enabled"
                    className="text-base font-medium"
                  >
                    Enable auto-disable
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    When enabled, channels that return errors matching the
                    keywords below will be disabled automatically.
                  </p>
                </div>
                <Switch
                  id="auto-disable-enabled"
                  checked={autoDisableEnabled}
                  onCheckedChange={setAutoDisableEnabled}
                />
              </div>

              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="auto-disable-keywords">
                  Auto-disable keywords
                </Label>
                <Textarea
                  id="auto-disable-keywords"
                  value={autoDisableKeywords}
                  onChange={(e) => setAutoDisableKeywords(e.target.value)}
                  placeholder="One keyword per line, e.g.:&#10;api key not valid&#10;permission denied&#10;insufficient_quota&#10;consumer&#10;has been suspended"
                  className="h-60 font-mono text-sm"
                />
                <p className="text-sm text-muted-foreground">
                  Include keywords for invalid API keys, insufficient balance,
                  permission issues, suspended accounts, and other conditions
                  that warrant auto-disabling.
                </p>
              </div>

              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="retry-keywords">
                  Cross-channel retry keywords
                </Label>
                <Textarea
                  id="retry-keywords"
                  value={retryKeywords}
                  onChange={(e) => setRetryKeywords(e.target.value)}
                  placeholder="One keyword per line, e.g.:&#10;api key not valid&#10;billing hard limit has been reached&#10;your resource has been blocked because we detected unusual behavior"
                  className="h-60 font-mono text-sm"
                />
                <p className="text-sm text-muted-foreground">
                  When the upstream error message (case-insensitive) contains
                  any of these keywords, it is treated as a retryable error and
                  the system will automatically switch to another channel.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Auto-enable channels</CardTitle>
              <CardDescription>
                Periodically test auto-disabled channels and re-enable them if
                they pass. Manually disabled channels will not be
                auto-recovered.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* auto-enable toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="auto-enable-enabled"
                    className="text-base font-medium"
                  >
                    Enable auto-enable
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    When enabled, auto-disabled channels that pass periodic
                    tests will be automatically restored.
                  </p>
                </div>
                <Switch
                  id="auto-enable-enabled"
                  checked={autoEnableEnabled}
                  onCheckedChange={setAutoEnableEnabled}
                />
              </div>

              {/* test frequency */}
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="auto-test-frequency">
                  Auto-test frequency (minutes)
                </Label>
                <Input
                  id="auto-test-frequency"
                  type="number"
                  min={0}
                  value={autoTestFrequency}
                  onChange={(e) => {
                    const v = parseInt(e.target.value);
                    setAutoTestFrequency(isNaN(v) || v < 0 ? 0 : v);
                  }}
                  placeholder="0 to disable scheduled tests"
                  className="w-48"
                />
                <p className="text-sm text-muted-foreground">
                  The system tests all channels at this interval. Set to 0 to
                  disable. Changes take effect without a restart.
                </p>
              </div>

              {/* response time threshold */}
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="channel-disable-threshold">
                  Response time threshold (seconds)
                </Label>
                <Input
                  id="channel-disable-threshold"
                  type="number"
                  min={0}
                  step="0.1"
                  value={channelDisableThreshold}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setChannelDisableThreshold(isNaN(v) || v < 0 ? 0 : v);
                  }}
                  placeholder="e.g. 5"
                  className="w-48"
                />
                <p className="text-sm text-muted-foreground">
                  During auto-tests, channels whose response time exceeds this
                  value will be skipped for auto-enabling (prevents restoring
                  slow channels). Set to 0 to skip this check.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upstream model patrol</CardTitle>
              <CardDescription>
                Periodically check each channel&apos;s upstream model list for
                additions or removals, and sync changes automatically. Only
                applies to enabled channels; each channel must have patrol
                enabled individually.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="upstream-interval">
                  Patrol interval (minutes)
                </Label>
                <Input
                  id="upstream-interval"
                  type="number"
                  min={1}
                  max={1440}
                  value={upstreamIntervalMinutes}
                  onChange={(e) => {
                    const v = parseInt(e.target.value);
                    setUpstreamIntervalMinutes(isNaN(v) || v < 1 ? 30 : v);
                  }}
                  placeholder="Default 30"
                  className="w-48"
                />
                <p className="text-sm text-muted-foreground">
                  Global setting. Checks upstream model changes for all
                  patrol-enabled channels at this interval.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* ==================== Notification settings ==================== */}
          <Separator className="my-6" />
          <h3 className="text-xl font-semibold tracking-tight">
            Notification settings
          </h3>

          {/* SMTP configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Configure SMTP
              </CardTitle>
              <CardDescription>
                Used to enable system email sending, such as verification codes
                and notifications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="smtp-server">SMTP server</Label>
                  <Input
                    id="smtp-server"
                    value={smtpServer}
                    onChange={(e) => setSmtpServer(e.target.value)}
                    placeholder="e.g. smtp.gmail.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-port">SMTP port</Label>
                  <Input
                    id="smtp-port"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    placeholder="e.g. 465 or 587"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-account">SMTP account</Label>
                  <Input
                    id="smtp-account"
                    value={smtpAccount}
                    onChange={(e) => setSmtpAccount(e.target.value)}
                    placeholder="Account used to log in to the SMTP server"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="smtp-from">Sender address</Label>
                  <Input
                    id="smtp-from"
                    value={smtpFrom}
                    onChange={(e) => setSmtpFrom(e.target.value)}
                    placeholder="From address displayed on outgoing emails"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-token">SMTP credential</Label>
                  <Input
                    id="smtp-token"
                    type="password"
                    value={smtpToken}
                    onChange={(e) => setSmtpToken(e.target.value)}
                    placeholder="Sensitive — not displayed after saving"
                  />
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    id="smtp-ssl"
                    checked={smtpSSLEnabled}
                    onCheckedChange={setSmtpSSLEnabled}
                  />
                  <Label htmlFor="smtp-ssl">Enable SMTP SSL</Label>
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-4">
                <Button onClick={handleSaveSMTP} disabled={isLoading}>
                  <Save className="mr-2 h-4 w-4" />
                  Save SMTP settings
                </Button>

                {/* test SMTP */}
                <div className="flex items-end gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="test-email">Test email address</Label>
                    <Input
                      id="test-email"
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="Enter the address to receive the test email"
                      className="w-64"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleTestSMTP}
                    disabled={isTesting || !smtpServer}
                  >
                    <SendHorizontal className="mr-2 h-4 w-4" />
                    {isTesting ? 'Sending...' : 'Send test email'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feishu Webhook configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Configure Feishu notifications
              </CardTitle>
              <CardDescription>
                Used to send notifications via Feishu webhooks. Multiple
                webhooks are supported.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="feishu-webhook">Feishu webhook URL</Label>
                <Textarea
                  id="feishu-webhook"
                  value={feishuWebhookUrls}
                  onChange={(e) => setFeishuWebhookUrls(e.target.value)}
                  placeholder="One webhook URL per line, e.g.:&#10;https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxxxx&#10;https://open.feishu.cn/open-apis/bot/v2/hook/yyyyyyyy"
                  className="h-32 font-mono text-sm"
                />
                <p className="text-sm text-muted-foreground">
                  The webhook URL obtained after adding a custom bot to a Feishu
                  group. Multiple URLs are supported — enter one per line and
                  notifications will be sent to all of them.
                </p>
              </div>
              <div className="flex gap-4">
                <Button onClick={handleSaveFeishu} disabled={isLoading}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Feishu settings
                </Button>
                <Button
                  variant="outline"
                  onClick={handleTestFeishu}
                  disabled={isTesting || !feishuWebhookUrls.trim()}
                >
                  <SendHorizontal className="mr-2 h-4 w-4" />
                  {isTesting ? 'Sending...' : 'Send test message'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ==================== Storage settings ==================== */}
          <Separator className="my-6" />
          <h3 className="text-xl font-semibold tracking-tight">
            Storage settings
          </h3>

          {/* S3/R2 storage configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                Configure S3/R2 storage
              </CardTitle>
              <CardDescription>
                Configure an S3-compatible object storage service (e.g.
                Cloudflare R2, Alibaba Cloud OSS, AWS S3) for storing generated
                images and videos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* enable toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="cf-r2store-enabled"
                    className="text-base font-medium"
                  >
                    Enable S3/R2 storage
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    When enabled, generated images and videos will be uploaded
                    to S3-compatible storage and returned as URLs.
                  </p>
                </div>
                <Switch
                  id="cf-r2store-enabled"
                  checked={cfR2storeEnabled}
                  onCheckedChange={setCfR2storeEnabled}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cf-file-endpoint">S3 endpoint</Label>
                  <Input
                    id="cf-file-endpoint"
                    value={cfFileEndpoint}
                    onChange={(e) => setCfFileEndpoint(e.target.value)}
                    placeholder="e.g. https://xxx.r2.cloudflarestorage.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Endpoint URL of the S3-compatible service.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cf-bucket-filename">Bucket name</Label>
                  <Input
                    id="cf-bucket-filename"
                    value={cfBucketFileName}
                    onChange={(e) => setCfBucketFileName(e.target.value)}
                    placeholder="e.g. my-bucket"
                  />
                  <p className="text-xs text-muted-foreground">
                    The name of the bucket to store files in.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cf-file-publicurl">
                  Public access URL (optional)
                </Label>
                <Input
                  id="cf-file-publicurl"
                  value={cfFilePublicUrl}
                  onChange={(e) => setCfFilePublicUrl(e.target.value)}
                  placeholder="e.g. https://file.example.com"
                />
                <p className="text-xs text-muted-foreground">
                  Used to generate publicly accessible file links. Cloudflare R2
                  requires a custom domain. If the S3 endpoint already supports
                  public access (e.g. Rains3), this can be left blank.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cf-file-accesskey">Access Key ID</Label>
                  <Input
                    id="cf-file-accesskey"
                    type="password"
                    value={cfFileAccessKey}
                    onChange={(e) => setCfFileAccessKey(e.target.value)}
                    placeholder="Sensitive — not displayed after saving"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cf-file-secretkey">Secret Access Key</Label>
                  <Input
                    id="cf-file-secretkey"
                    type="password"
                    value={cfFileSecretKey}
                    onChange={(e) => setCfFileSecretKey(e.target.value)}
                    placeholder="Sensitive — not displayed after saving"
                  />
                </div>
              </div>

              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm text-muted-foreground">
                  <strong>Supported S3-compatible services:</strong>
                </p>
                <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
                  <li>Cloudflare R2</li>
                  <li>Alibaba Cloud OSS (via S3-compatible endpoint)</li>
                  <li>AWS S3</li>
                  <li>MinIO</li>
                  <li>Other S3-compatible services</li>
                </ul>
              </div>

              <Button onClick={handleSaveStorage} disabled={isLoading}>
                <Save className="mr-2 h-4 w-4" />
                Save storage settings
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
