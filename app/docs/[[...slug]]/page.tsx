import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { allDocs } from '@/lib/api-docs/catalog';
import { DocsPage } from '@/components/docs/docs-page';

interface Props {
  params: { slug?: string[] };
}

export function generateMetadata({ params }: Props): Metadata {
  const doc = allDocs.find((item) => item.slug === params.slug?.join('/'));
  return {
    title: doc ? `${doc.title.en} | Linkinfra API Docs` : 'Linkinfra API Docs',
    description: doc?.description.en
  };
}

export default function ApiDocumentationPage({ params }: Props) {
  if (!params.slug?.length) redirect('/docs/api/chat-completions');
  const slug = params.slug.join('/');
  if (!allDocs.some((doc) => doc.slug === slug)) notFound();
  return <DocsPage key={slug} slug={slug} />;
}
