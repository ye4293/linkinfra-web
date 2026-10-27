import { auth } from '@/auth';
import { NextRequest } from 'next/server';
import { apiAddresses, clientApiKey } from '@/lib/client-setup';
import {
  EDIT_IMAGE_TYPES,
  imageRequestSchema,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_COUNT
} from '@/lib/playground';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body: BodyInit;
  let apiKey: string;
  let editing = false;
  try {
    const multipart = req.headers
      .get('content-type')
      ?.includes('multipart/form-data');
    const form = multipart ? await req.formData() : null;
    const input = form ? Object.fromEntries(form.entries()) : await req.json();
    apiKey = clientApiKey(
      typeof input?.apiKey === 'string' ? input.apiKey : ''
    );
    const parsed = imageRequestSchema.safeParse(input);
    if (!parsed.success)
      return Response.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );

    if (form) {
      const images = [...form.getAll('image[]'), ...form.getAll('image')];
      if (!images.length || images.length > MAX_IMAGE_COUNT) {
        return Response.json(
          { error: 'Attach between 1 and 16 images.' },
          { status: 400 }
        );
      }
      const upstream = new FormData();
      Object.entries(parsed.data).forEach(([key, value]) =>
        upstream.set(key, String(value))
      );
      for (const image of images) {
        if (
          typeof image === 'string' ||
          !EDIT_IMAGE_TYPES.includes(image.type) ||
          !image.size ||
          image.size > MAX_IMAGE_BYTES
        ) {
          return Response.json(
            {
              error: 'Images must be PNG, JPEG or WebP files up to 20 MB each.'
            },
            { status: 400 }
          );
        }
        upstream.append('image[]', image, image.name);
      }
      body = upstream;
      editing = true;
    } else {
      body = JSON.stringify(parsed.data);
    }
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Invalid image request.'
      },
      { status: 400 }
    );
  }

  try {
    const { openai } = apiAddresses(process.env.NEXT_PUBLIC_API_BASE_URL || '');
    const response = await fetch(
      `${openai}/images/${editing ? 'edits' : 'generations'}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          ...(!editing && { 'Content-Type': 'application/json' })
        },
        body,
        signal: req.signal,
        cache: 'no-store'
      }
    );
    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type':
          response.headers.get('content-type') || 'application/json',
        'Cache-Control': 'no-store'
      }
    });
  } catch {
    return Response.json(
      {
        error: req.signal.aborted
          ? 'Request cancelled.'
          : 'Unable to reach the image service.'
      },
      { status: req.signal.aborted ? 499 : 502 }
    );
  }
}
