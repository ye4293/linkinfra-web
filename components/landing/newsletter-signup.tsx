'use client';

import { useLocale } from '@/components/providers/locale-provider';
import s from './home.module.css';

export function NewsletterSignup({ brand }: { brand: string }) {
  const { lang } = useLocale();
  const c = (cn: string, en: string) => (lang === 'zh' ? cn : en);

  return (
    <section className={s.newsletter} aria-labelledby="newsletter-heading">
      <h2 id="newsletter-heading">
        {c(`订阅 ${brand} 邮件通知`, `Join the ${brand} newsletter`)}
      </h2>
      <p id="newsletter-description">
        {c(
          '通过邮件了解新模型、产品更新与平台动态。',
          'New models, product updates, and platform news, delivered to your inbox.'
        )}
      </p>
      <form
        className={s.newsletterForm}
        onSubmit={(event) => event.preventDefault()}
      >
        <label className="sr-only" htmlFor="newsletter-email">
          {c('电子邮箱', 'Email address')}
        </label>
        <input
          id="newsletter-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          aria-describedby="newsletter-description newsletter-note"
          disabled
        />
        <button type="submit" className={s.primary} disabled>
          {c('订阅', 'Subscribe')}
        </button>
      </form>
      <p id="newsletter-note" className={s.newsletterNote}>
        {c(
          '邮件订阅即将开放，欢迎先加入 Discord 获取最新动态。',
          'Email subscriptions are coming soon. Join our Discord for the latest updates.'
        )}
      </p>
    </section>
  );
}
