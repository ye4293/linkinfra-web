import ModelPlazaView from '@/sections/model-plaza/model-plaza-view';
import { Suspense } from 'react';

export const metadata = {
  title: 'Model marketplace',
  description: 'View pricing for all available AI models'
};

export default function ModelPlazaPage() {
  return (
    <Suspense>
      <ModelPlazaView />
    </Suspense>
  );
}
