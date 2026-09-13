'use client';

import Link from 'next/link';
import { BookOpen, ArrowRight } from 'lucide-react';
import { useSystemConfig } from '@/hooks/use-system-config';
import { docsHref } from '@/lib/public-navigation';
import { ApiConnectionGuide } from '@/components/api-connection-guide';
import { Button } from '@/components/ui/button';

const steps = [
  {
    title: 'Check your balance',
    description:
      'Open Billing to check your available balance and top up if needed. A key spending limit does not add credit to your account.',
    href: '/dashboard/topup',
    action: 'Open Billing'
  },
  {
    title: 'Create an API key',
    description:
      'Give your key a name, expiration date and spending limit. One key can call the models available to your account; you do not need a new key for every model.',
    href: '/dashboard/token/create',
    action: 'Create API key'
  },
  {
    title: 'Connect your client',
    description:
      'In Keys, select Set up client next to your key. Import into CC Switch or Cherry Studio, or copy the Base URL and key into Chatbox or another OpenAI-compatible app. Confirm the import in the installed app.',
    href: '/dashboard/token',
    action: 'Set up a client'
  },
  {
    title: 'Choose a model and send a message',
    description:
      'Copy the exact model ID from the marketplace and choose a protocol supported by that model. Send a short message in your app, or try Playground with your key.',
    href: '/dashboard/playground',
    action: 'Try Playground'
  },
  {
    title: 'Check your first request',
    description:
      'Usage shows individual requests, tokens and charges. Statistics shows reliability, latency and speed for your selected period. Keep the request ID if you need help with a failed call.',
    href: '/dashboard/log',
    action: 'View Usage'
  }
];

export function GettingStartedCard() {
  return (
    <section
      aria-label="Getting started"
      className="rounded-xl border border-l-4 border-primary/25 border-l-primary bg-gradient-to-r from-primary/10 to-primary/5 p-5 sm:p-6"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Quick start guide
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight sm:text-xl">
              New to LinkInfra? Start here.
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              We’ll walk you through creating a key, connecting your app and
              making your first request.
            </p>
          </div>
        </div>
        <Button asChild size="lg" className="w-full shrink-0 gap-2 sm:w-auto">
          <Link href="/getting-started">
            Start setup <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
      <ol className="mt-5 flex flex-wrap gap-x-6 gap-y-3 border-t border-primary/15 pt-4 text-sm">
        {[
          'Create an API key',
          'Connect your client',
          'Send your first request'
        ].map((label, index) => (
          <li key={label} className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {index + 1}
            </span>
            <span>{label}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function GettingStartedGuide() {
  const { docsAddress } = useSystemConfig();
  const documentation = docsHref(docsAddress);
  return (
    <main className="mx-auto max-w-4xl space-y-7 px-4 py-8 sm:px-6">
      <nav
        aria-label="Guide navigation"
        className="flex flex-wrap gap-4 text-sm"
      >
        <Link href="/">Home</Link>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/model-plaza">Models</Link>
        {documentation !== '/getting-started' && (
          <a href={documentation}>Docs</a>
        )}
      </nav>
      <header className="space-y-2">
        <p className="text-sm font-medium text-primary">GETTING STARTED</p>
        <h1 className="text-3xl font-semibold">Your first API request</h1>
        <p className="text-muted-foreground">
          Follow these steps to connect LinkInfra to your app.{' '}
          <Link href="/sign-in" className="underline">
            Sign in or create an account
          </Link>{' '}
          before you begin.
        </p>
      </header>
      <ol className="space-y-4">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className="flex gap-3 rounded-xl border bg-card p-4 sm:gap-4 sm:p-6"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {index + 1}
            </span>
            <div className="min-w-0 space-y-2">
              <h2 className="text-lg font-semibold">{step.title}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
              <Button asChild size="sm" variant="outline">
                <Link href={step.href}>
                  {step.action}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </li>
        ))}
      </ol>
      <ApiConnectionGuide />
      <section className="space-y-3 rounded-xl border p-4 sm:p-6">
        <h2 className="text-xl font-semibold">Understand the price</h2>
        <p className="text-sm text-muted-foreground">
          Per token: input and output tokens are charged at their respective
          rates; /M means per million tokens. Per call: each request is charged
          at the listed rate. Your account’s applicable pricing determines the
          final charge.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">If something goes wrong</h2>
        {[
          [
            'Invalid or expired key',
            'Copy the complete API key and check that it is enabled and unexpired.'
          ],
          [
            'Insufficient quota',
            'Check both your account balance and the spending limit on this key.'
          ],
          [
            'Model or protocol error',
            'Check the exact model ID and supported API protocol. Claude Code uses Anthropic Messages, Codex uses OpenAI Responses, and Gemini CLI uses the native Gemini API.'
          ],
          [
            'The client does not open',
            'Install CC Switch or Cherry Studio and allow the browser to open it. You can also copy the settings manually from Set up client.'
          ],
          [
            'Wrong API address',
            'Use the API address shown in Keys, not the dashboard website URL. Do not append /v1 twice.'
          ]
        ].map(([title, description]) => (
          <details key={title} className="rounded-lg border p-4">
            <summary className="cursor-pointer text-sm font-medium">
              {title}
            </summary>
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          </details>
        ))}
      </section>
      {documentation !== '/getting-started' && (
        <a
          className="inline-flex text-sm font-medium text-primary underline"
          href={documentation}
        >
          Read the full documentation →
        </a>
      )}
    </main>
  );
}
