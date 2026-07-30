/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['utfs.io', 'api.slingacademy.com']
  },
  async redirects() {
    return [
      // 已经发出去的邀请链接是 /register?aff=XXXX，但本应用只有 /sign-in。
      // Next 默认会把 query 一起带过去，所以邀请码不会在重定向中丢失。
      {
        source: '/register',
        destination: '/sign-in',
        permanent: false
      }
    ];
  }
};

module.exports = nextConfig;
