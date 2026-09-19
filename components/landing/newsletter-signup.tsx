'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useLocale } from '@/components/providers/locale-provider';
import s from './home.module.css';

export function NewsletterSignup({ brand }: { brand: string }) {
  const { lang } = useLocale();
  const c = (cn: string, en: string) => (lang === 'zh' ? cn : en);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<
    'idle' | 'pending' | 'success' | 'error' | 'limited'
  >('idle');
  const submitting = useRef(false);

  async function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setStatus('pending');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          language: lang,
          consent: true
        }),
        signal: controller.signal
      });
      const result = await response.json().catch(() => null);
      if (response.status === 429) {
        setStatus('limited');
      } else if (response.ok && result?.success === true) {
        setStatus('success');
        setEmail('');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    } finally {
      clearTimeout(timeout);
      submitting.current = false;
    }
  }

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
        onSubmit={subscribe}
        aria-busy={status === 'pending'}
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
          required
          maxLength={254}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setStatus('idle');
          }}
          disabled={status === 'pending'}
        />
        <button
          type="submit"
          className={s.primary}
          disabled={status === 'pending'}
        >
          {status === 'pending'
            ? c('订阅中…', 'Subscribing…')
            : c('订阅', 'Subscribe')}
        </button>
      </form>
      <p id="newsletter-note" className={s.newsletterNote}>
        {c(
          '点击订阅，即表示你同意接收我们的模型、产品及平台更新邮件。',
          'By subscribing, you agree to receive emails about our models, products, and platform updates.'
        )}
      </p>
      <p className={s.newsletterStatus} role="status" aria-live="polite">
        {status === 'success'
          ? c('订阅成功，感谢关注！', 'You’re subscribed. Thanks for joining!')
          : status === 'limited'
          ? c(
              '请求过于频繁，请稍后再试。',
              'Too many requests. Please try again later.'
            )
          : status === 'error'
          ? c(
              '订阅暂时失败，请稍后重试。',
              'Unable to subscribe right now. Please try again.'
            )
          : ''}
      </p>
    </section>
  );
}
