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
    <details className="rounded-lg border bg-card p-4">
      <summary className="cursor-pointer text-sm font-semibold">
        <BookOpen className="mr-2 inline h-4 w-4" />
        New here? Start with the setup guide
      </summary>
      <p className="mt-3 text-sm text-muted-foreground">
        Check your balance, create a key, connect your client and send your
        first request.
      </p>
      <Link
        href="/getting-started"
        className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary"
      >
        Open step-by-step guide <ArrowRight className="h-4 w-4" />
      </Link>
    </details>
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
