import { cn } from '@/lib/utils';

/** Ola's small vector avatar stays crisp in message rows and the welcome screen. */
export function OlaMascot({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      aria-hidden="true"
      className={cn('shrink-0', className)}
    >
      <ellipse
        cx="40"
        cy="72"
        rx="21"
        ry="4"
        className="fill-violet-200/60 dark:fill-violet-900/60"
      />
      <path
        d="M21 23C13 15 11 6 16 7C22 8 27 12 29 17C36 14 44 14 51 17C53 12 58 8 64 7C69 6 67 15 59 23C66 30 69 39 66 49C64 61 54 69 40 69C26 69 16 61 14 49C11 39 14 30 21 23Z"
        className="fill-violet-500 dark:fill-violet-400"
      />
      <path
        d="M21 40C21 29 29 23 40 23C51 23 59 29 59 40V46C59 56 51 62 40 62C29 62 21 56 21 46V40Z"
        className="fill-violet-50 dark:fill-violet-100"
      />
      <ellipse cx="31" cy="41" rx="3.5" ry="5" fill="#31205B" />
      <ellipse cx="49" cy="41" rx="3.5" ry="5" fill="#31205B" />
      <circle cx="32" cy="39" r="1" fill="white" />
      <circle cx="50" cy="39" r="1" fill="white" />
      <path
        d="M35 51C37.5 54 42.5 54 45 51"
        stroke="#6D28D9"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <ellipse cx="25" cy="49" rx="4" ry="2.5" fill="#DDD6FE" />
      <ellipse cx="55" cy="49" rx="4" ry="2.5" fill="#DDD6FE" />
    </svg>
  );
}
