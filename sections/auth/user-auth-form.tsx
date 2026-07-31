'use client';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn, useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, useTransition, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import GithubSignInButton from './github-auth-button';
import GoogleSignInButton from './google-auth-button';
import { toast } from 'sonner';
import {
  AFF_URL_PARAM,
  clearAffCode,
  persistAffCode,
  readAffCodeCookie,
  sanitizeAffCode
} from '@/lib/aff-code';

/**
 * 邮箱注册提交给后端的字段。
 *
 * 后端 controller/user.go 的 Register 读的是 body 里的 `aff_code`（不看 query），
 * 漏掉这个字段会让接口照样返回成功，但 users.inviter_id 是 0 —— 邀请人
 * 既拿不到注册奖励，也拿不到后续所有充值的返现。
 *
 * 除 aff_code 外全部可选，是为了与 formSchema 保持一致：那份 schema 按
 * isRegister / isResetPassword 动态生成，字段推断出来就是 string | undefined。
 * 不在这里用 ?? '' 兜成空串，是为了不改变发给后端的 JSON —— undefined 会被
 * JSON.stringify 省略 key，空串则会真的传过去，两者在后端的校验路径不同。
 */
interface RegisterParams {
  username?: string;
  email?: string;
  password?: string;
  password2?: string;
  verification_code?: string;
  aff_code?: string;
}

export default function UserAuthForm() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl');
  const affCodeFromUrl = sanitizeAffCode(searchParams.get(AFF_URL_PARAM));
  const [loading, startTransition] = useTransition();
  const [isRegister, setIsRegister] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [codeSending, setCodeSending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  console.log('session', session, status);

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(callbackUrl ?? '/dashboard');
    }
  }, [status, router]);

  // 邀请链接落地（/sign-in?aff=XXXX）时把邀请码存进 cookie。
  //
  // 这一步只为 OAuth 服务：next-auth 接管了跳转，signIn 回调在服务端的
  // /api/auth/callback/{provider} 里执行，那时 URL 上的 ?aff= 已经没了。
  // 邮箱注册不依赖 cookie，直接从 URL 取（见 onSubmit）。
  //
  // 放在这一层是因为本组件同时承载三种注册入口 —— 邮箱表单，以及
  // 下方渲染的 GithubSignInButton / GoogleSignInButton。
  useEffect(() => {
    if (affCodeFromUrl) {
      persistAffCode(affCodeFromUrl);
    }
  }, [affCodeFromUrl]);

  const defaultValues = {
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    verificationCode: ''
  };

  const formSchema = useMemo(
    () =>
      z
        .object({
          username: isResetPassword
            ? z.string().optional()
            : z
                .string({
                  required_error: 'Username is required',
                  invalid_type_error: 'Username is required'
                })
                .min(1, 'Username is required'),

          email:
            isResetPassword || isRegister
              ? z
                  .string({
                    required_error: 'Email is required',
                    invalid_type_error: 'Email is required'
                  })
                  .email('Invalid email format')
              : z.string().optional(),

          verificationCode: isRegister
            ? z.string({
                required_error: 'Verification code is required',
                invalid_type_error: 'Verification code is required'
              })
            : z.string().optional(),

          password: isResetPassword
            ? z.string().optional()
            : z
                .string({
                  required_error: 'Password is required',
                  invalid_type_error: 'Password is required'
                })
                .min(1, 'Password is required')
                .refine(
                  (password) =>
                    !password ||
                    (password.length >= 8 && password.length <= 20),
                  'Password must be between 8 and 20 characters'
                ),

          confirmPassword: isRegister
            ? z
                .string({
                  required_error: 'Confirm password is required',
                  invalid_type_error: 'Confirm password is required'
                })
                .min(1, 'Confirm password is required')
                .refine(
                  (password) =>
                    !password ||
                    (password.length >= 8 && password.length <= 20),
                  'Password must be between 8 and 20 characters'
                )
            : z.string().optional()
        })
        .refine(
          (data) => {
            if (isRegister) {
              return data.password === data.confirmPassword;
            }
            return true;
          },
          {
            message: 'Passwords do not match',
            path: ['confirmPassword']
          }
        ),
    [isRegister, isResetPassword]
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues
  });

  const handleUserRegister = async (params: RegisterParams) => {
    const res = await fetch(`/api/user/register`, {
      method: 'POST',
      body: JSON.stringify(params),
      credentials: 'include'
    });
    const { success, message } = await res.json();

    // 原实现不看返回值，注册失败也照样往下调 signIn —— 用户看到的是一次
    // 静默失败的登录，而不是"注册失败"的原因。
    if (!success) {
      toast.error(message || 'Registration failed');
      return;
    }

    // 邀请码已经兑现，立刻清掉 cookie。留着的话这 30 分钟的 cookie 会把
    // 邀请归因粘在浏览器上：共享设备下，后一个人直接访问 /sign-in 注册
    // 也会被计入同一个邀请人。
    clearAffCode();

    signIn('credentials', {
      username: params.username,
      password: params.password,
      callbackUrl: callbackUrl ?? '/dashboard'
    });
  };

  const handleSendVerificationCode = async () => {
    const email = form.getValues('email');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      setCodeSending(true);
      const params = new URLSearchParams({ email });
      const res = await fetch(`/api/verification?${params}`, {
        method: 'GET',
        credentials: 'include'
      });

      const { success, message } = await res.json();

      if (!success) {
        throw new Error(message || 'Failed to send verification code');
        return;
      }

      toast.success('Verification code sent successfully');

      // Start countdown timer (60 seconds)
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to send verification code'
      );
    } finally {
      setCodeSending(false);
    }
  };

  const handleResetPassword = async () => {
    try {
      const email = form.getValues('email');
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        toast.error('Please enter a valid email address');
        return;
      }

      const params = new URLSearchParams({ email });
      const res = await fetch(`/api/reset_password?${params}`, {
        method: 'GET',
        credentials: 'include'
      });
      const { success, message } = await res.json();
      if (success) {
        toast.success('Password reset email sent successfully');
      } else {
        throw new Error(message || 'Failed to send reset email');
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to send reset email'
      );
    }
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    console.log('onSubmit triggered', data);
    startTransition(async () => {
      if (isResetPassword) {
        handleResetPassword();
      } else if (isRegister) {
        // 邀请码取值：URL 参数优先、cookie 兜底。cookie 这一层覆盖的是
        // 「带 aff 落地后又发生过导航、URL 参数被抹掉」的情况。
        // （后端只从 query 读，不再有 session 通道。）
        const affCode = affCodeFromUrl || readAffCodeCookie();
        const params: RegisterParams = {
          username: data.username,
          email: data.email,
          password: data.password,
          password2: data.confirmPassword,
          verification_code: data.verificationCode
        };
        if (affCode) {
          params.aff_code = affCode;
        }
        handleUserRegister(params);
      } else {
        signIn('credentials', {
          username: data.username,
          password: data.password,
          callbackUrl: callbackUrl ?? '/dashboard'
        });
      }
    });
  };

  const toggleMode = () => {
    setIsRegister(false);
    setIsResetPassword(!isResetPassword);
    form.reset(); // 清空表单
  };

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-full space-y-2"
        >
          {!isResetPassword ? (
            <>
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Enter your username..."
                        disabled={loading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isRegister && (
                <>
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="Enter your email..."
                              disabled={loading}
                              {...field}
                            />
                          </FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleSendVerificationCode}
                            disabled={loading || codeSending || countdown > 0}
                          >
                            {countdown > 0 ? `${countdown}s` : 'Get Code'}
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="verificationCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Verification Code</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="Enter verification code..."
                            disabled={loading}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter your password..."
                        disabled={loading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isRegister && (
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Please enter your password again..."
                          disabled={loading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </>
          ) : (
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Please enter the email address used to register..."
                      disabled={loading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <div className="flex items-center justify-between text-sm">
            {!isResetPassword ? (
              <>
                <Button
                  type="button"
                  variant="link"
                  className="p-0"
                  onClick={() => setIsRegister(!isRegister)}
                >
                  {isRegister ? 'Sign in' : 'Sign up'}
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="p-0"
                  onClick={toggleMode}
                >
                  Forgot your password?
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="link"
                className="p-0"
                onClick={toggleMode}
              >
                Back to Login
              </Button>
            )}
          </div>

          <Button disabled={loading} className="ml-auto w-full" type="submit">
            {isResetPassword
              ? 'Send password reset email'
              : isRegister
              ? 'Sign up'
              : 'Sign in'}
          </Button>
        </form>
      </Form>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>
      <GithubSignInButton />
      <GoogleSignInButton />
    </>
  );
}
