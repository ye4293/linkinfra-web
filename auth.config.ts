import { NextAuthConfig } from 'next-auth';
import CredentialProvider from 'next-auth/providers/credentials';
import GithubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';
import { cookies } from 'next/headers';
import { Account, Session, User as NextAuthUser } from 'next-auth';
import { AFF_COOKIE_NAME, sanitizeAffCode } from '@/lib/aff-code';
import { getOAuthProviderConfig } from '@/lib/oauth-provider-config';

/**
 * 取出落地页存下的邀请码，拼成后端登录接口要的 query。
 *
 * 后端 readAffCode（controller/aff.go）从 query 参数 `aff_code` 读；
 * 这里必须用 cookie 中转，因为 signIn 回调运行在服务端的 OAuth 回调请求里，
 * 邀请链接 URL 上的 ?aff= 早已丢失。
 *
 * 只能在回调函数体内调用，绝不能提到模块顶层 —— middleware.ts 也 import
 * 这份 config 并跑在 Edge runtime，顶层调 cookies() 会炸掉整个中间件。
 *
 * 再 sanitize 一遍是因为 cookie 可以被用户手工改写，而这个值要拼进 URL。
 */
function withAffCode(endpoint: string): string {
  const store = cookies();
  const affCode = sanitizeAffCode(store.get(AFF_COOKIE_NAME)?.value);
  const url = process.env.NEXT_PUBLIC_API_BASE_URL + endpoint;
  if (!affCode) return url;

  // 读到即消费：OAuth 登录完成后用户落在 /dashboard 而不是登录页，客户端
  // 的 clearAffCode() 不会被执行，所以必须在这里清。否则这 30 分钟的 cookie
  // 会把邀请归因粘在浏览器上（共享设备下后一个注册者会被计入同一邀请人）。
  //
  // best-effort：Route Handler 里改 cookie 通常是允许的，但 next-auth 自己
  // 构造重定向响应，不保证一定生效 —— 失败也绝不能影响登录，所以吞掉异常。
  try {
    store.delete(AFF_COOKIE_NAME);
  } catch {
    // 清不掉就靠 max-age 到期，不阻断登录
  }

  return `${url}?aff_code=${encodeURIComponent(affCode)}`;
}

/**
 * 调后端登录接口时带的请求头。
 *
 * 后端的 /api/{github,google}/login 接收的是「用户已通过 OAuth 认证」这个
 * 断言，而 code 交换发生在这里（我们持有 client secret），后端无法自证
 * 断言真伪，只能验证说话的人是谁。共享密钥就是那个身份证明。
 *
 * 必须用不带 NEXT_PUBLIC_ 前缀的环境变量 —— 带前缀的会被内联进客户端
 * bundle，等于把密钥公开发布。signIn 回调是服务端代码，读得到非 public 的 env。
 */
function oauthLoginHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  const secret = process.env.OAUTH_LOGIN_SECRET;
  if (secret) {
    headers['X-OAuth-Login-Secret'] = secret;
  }
  return headers;
}
// import { JWT } from 'next-auth/jwt';

// 首先在文件顶部添加类型定义
// interface UserData {
//   id: string | number;
//   username: string;
//   display_name: string;
//   email: string;
//   role: string | number;
// }

// 扩展 Account 类型
interface ExtendedAccount extends Account {
  userData?: Record<string, string | number>;
  accessToken?: string;
}

// 扩展 User 类型
interface User extends NextAuthUser {
  username?: string;
  display_name?: string;
  role?: number;
  accessToken?: string;
}

// 扩展 JWT 类型
// interface JWT {
//   id: string;
//   username: string;
//   name?: string | null;
//   display_name?: string;
//   email?: string | null;
//   role?: number;
// }

// 扩展 Session 类型
// interface ExtendedSession extends Session {
//   user: {
//     id: string;
//     username: string;
//     name?: string | null;
//     email?: string | null;
//     role?: number;
//     accessToken?: string;
//   };
// }

export async function createAuthConfig(): Promise<NextAuthConfig> {
  const oauth = await getOAuthProviderConfig();
  return {
    providers: [
      GithubProvider({
        clientId: oauth.githubId,
        clientSecret: oauth.githubSecret,
        // GitHub now includes the RFC 9207 `iss` parameter in OAuth callbacks.
        // @auth/core 0.39's built-in GitHub provider does not declare it, so the
        // strict callback validator rejects an otherwise valid response with
        // `unexpected "iss" response parameter value`.
        issuer: 'https://github.com/login/oauth'
        // authorization: {
        //   url: 'https://github.com/login/oauth/authorize'
        // }
      }),
      GoogleProvider({
        clientId: oauth.googleId,
        clientSecret: oauth.googleSecret
      }),
      CredentialProvider({
        credentials: {
          // email: {
          //   type: 'email'
          // },
          username: { label: 'Username', type: 'text', placeholder: 'jsmith' },
          password: {
            type: 'password'
          }
        },
        async authorize(credentials, req) {
          // console.log('credentials', credentials);
          const { username, password } = credentials;
          const params = {
            username,
            password
          };

          const res = await fetch(
            process.env.NEXT_PUBLIC_API_BASE_URL + '/api/user/login',
            {
              method: 'POST',
              body: JSON.stringify(params),
              headers: { 'Content-Type': 'application/json' }
            }
          );
          const userLogin = await res.json();
          console.log('Credentials login', res, res.headers.get('set-cookie'));
          console.log('----userLogin----', userLogin);
          if (!userLogin?.success) return null;
          // console.log('userLogin', userLogin)
          // console.log('res', res.json())
          // console.log('---res.headers---', res.headers)
          // console.log("---res.headers.get('set-cookie')---", res.headers.get('set-cookie'))

          // const apiCookies = res.headers.get('set-cookie')?.split(';');
          // let _session = '';
          // let _path = '';
          // let _expires = '';
          // let _maxAge = '';
          // apiCookies &&
          //   apiCookies.forEach((item) => {
          //     if (item.includes('session')) {
          //       _session = item.split('=')[1];
          //     }
          //     if (item.includes('Path')) {
          //       _path = item.split('=')[1];
          //     }
          //     if (item.includes('Expires')) {
          //       _expires = item.split('=')[1];
          //     }
          //     if (item.includes('Max-Age')) {
          //       _maxAge = item.split('=')[1];
          //     }
          //   });
          // // console.log(_session, _path, _expires, _maxAge)
          // // console.log('---cookies---', cookies())
          // cookies().set({
          //   name: 'session',
          //   value: _session,
          //   httpOnly: true,
          //   path: '/'
          // });
          // // 设置角色
          // cookies().set({
          //   name: 'role',
          //   value: userLogin.data.role,
          //   httpOnly: true,
          //   path: '/'
          // });

          // const loginData = await res.json()
          // console.log('loginData', loginData)
          const user = {
            // id: '1',
            // name: 'John',
            // email: credentials?.email as string,
            // username: credentials?.username as string,
            id: userLogin.data.id,
            username: userLogin.data.username,
            display_name: userLogin.data.display_name,
            email: userLogin.data.email,
            role: userLogin.data.role,
            accessToken: userLogin.data.access_token
            // password: credentials?.password as string,
            // 'set-cookie': res.headers.get('set-cookie'),
            // ...loginData.data
          };
          // console.log('-----user----', user)
          if (user) {
            // Any object returned will be saved in `user` property of the JWT
            return user;
          } else {
            // If you return null then an error will be displayed advising the user to check their details.
            return null;

            // You can also Reject this callback with an Error thus the user will be sent to the error page with the error message as a query parameter
          }
        }
      })
    ],
    session: {
      // 使用JWT来管理会话
      strategy: 'jwt',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      updateAge: 24 * 60 * 60 // 24 hours
    },
    jwt: {
      maxAge: 30 * 24 * 60 * 60 // 30 天
    },
    callbacks: {
      async signIn({ user, account, profile }) {
        // console.log('----user---', user)
        // console.log('----account---', account)
        // console.log('----profile---', profile)
        // 处理 GitHub 登录成功后的回调
        if (account?.provider === 'github') {
          console.log('-----github user****', user);
          // 可以在这里添加任何额外的逻辑，例如记录用户信息或进行其他验证
          // console.log('GitHub login successful:', user);
          const params = {
            ...user
          };
          const res = await fetch(withAffCode('/api/github/login'), {
            method: 'POST',
            body: JSON.stringify(params),
            headers: oauthLoginHeaders()
          });

          console.log('GitHub login', res, res.headers.get('set-cookie'));

          const userInfo = await res.json();
          if (!userInfo.success) return false;

          // const apiCookies = res.headers.get('set-cookie')?.split(';');
          // console.log('apiCookies', apiCookies);
          // let _session = '';
          // let _path = '';
          // let _expires = '';
          // let _maxAge = '';
          // apiCookies &&
          //   apiCookies.forEach((item) => {
          //     if (item.includes('session')) {
          //       _session = item.split('=')[1];
          //     }
          //     if (item.includes('Path')) {
          //       _path = item.split('=')[1];
          //     }
          //     if (item.includes('Expires')) {
          //       _expires = item.split('=')[1];
          //     }
          //     if (item.includes('Max-Age')) {
          //       _maxAge = item.split('=')[1];
          //     }
          //   });
          // cookies().set({
          //   name: 'session',
          //   value: _session,
          //   httpOnly: true,
          //   path: '/'
          // });
          // // 设置角色
          // cookies().set({
          //   name: 'role',
          //   value: userInfo?.data?.role,
          //   // value: '1',
          //   httpOnly: true,
          //   path: '/'
          // });

          // 返回从后端 API 获取的用户数据
          (account as ExtendedAccount).userData = { ...userInfo.data };
          // account = { ...account, role: 1 }
          // console.log('*****account*****', account)
          // user = { ...user, ...userInfo.data }
          return true; // 返回 true 以允许登录
        }
        if (account?.provider === 'google') {
          console.log('-----google user****', user);

          const params = {
            ...user
          };
          const res = await fetch(withAffCode('/api/google/login'), {
            method: 'POST',
            body: JSON.stringify(params),
            headers: oauthLoginHeaders()
          });

          console.log('Google login', res, res.headers.get('set-cookie'));

          const userInfo = await res.json();
          if (!userInfo.success) return false;

          // 返回从后端 API 获取的用户数据
          (account as ExtendedAccount).userData = { ...userInfo.data };

          return true;
        }
        // user = { ...user, role: 1 }
        // user = { role: 1, aaa: 222 }

        return true; // 其他提供者的默认行为
      },
      async redirect(params: { url: string; baseUrl: string }) {
        // console.log('params', params);
        // console.log('params.url', params.url)
        // console.log('params.baseUrl', params.baseUrl)
        // 在用户登录后重定向到指定的端口
        // return 'http://localhost:3001'; // 替换为您需要的端口
        return params.url; // 替换为您需要的端口
      },
      async jwt({ token, user, account, trigger, session }) {
        // 处理 session 更新（如重新生成 accessToken）
        if (trigger === 'update' && session?.accessToken) {
          token.accessToken = session.accessToken;
          return token;
        }

        if (user) {
          console.log('user******', user, account);
          token.id = String(
            (account as ExtendedAccount)?.userData?.id || user.id
          );
          token.username = String(
            (user as User).username ||
              (account as ExtendedAccount)?.userData?.username ||
              ''
          );
          token.name = user.name;
          token.display_name = String(
            (user as User).display_name ||
              (account as ExtendedAccount)?.userData?.display_name ||
              ''
          );
          token.email = String(
            user.email || (account as ExtendedAccount)?.userData?.email || ''
          );
          token.role =
            (user as User).role || (account as ExtendedAccount)?.userData?.role;
          token.accessToken =
            (user as User).accessToken ||
            (account as ExtendedAccount)?.userData?.access_token; // 添加访问令牌
        }
        return token;
      },
      async session({ session, token, user }) {
        // const sess = session as ExtendedSession;
        const sess = session as Session;
        sess.user.id = String(token.id);
        sess.user.username = String(token.username);
        sess.user.name = String(token.name || token.display_name);
        sess.user.email = String(token.email);
        sess.user.role = token.role as number;
        sess.user.accessToken = token.accessToken as string;
        return sess;
      }
    },
    pages: {
      signIn: '/sign-in'
    },
    debug: process.env.NODE_ENV === 'development',
    logger: {
      error(code, ...message) {
        console.error(code, ...message);
      },
      warn(code, ...message) {
        console.warn(code, ...message);
      },
      debug(code, ...message) {
        console.debug(code, ...message);
      }
    }
  } satisfies NextAuthConfig;
}

// Middleware runs in the Edge runtime and only needs authorization callbacks;
// provider credentials are loaded lazily by auth.ts on the server.
const authConfig = {
  providers: [],
  pages: { signIn: '/sign-in' }
} satisfies NextAuthConfig;

export default authConfig;
