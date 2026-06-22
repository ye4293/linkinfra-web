'use client';

import { useState } from 'react';
import { toast } from 'sonner';

export function useCopyToClipboard() {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = async (text: string | number, label?: string) => {
    try {
      const textToCopy = String(text);
      await navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      toast.success(`${label || 'Content'} copied to clipboard.`, {
        duration: 2000
      });

      // Reset copied state after 2 seconds
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Copy failed:', error);
      toast.error('Copy failed. Please try again.', {
        duration: 2000
      });
    }
  };

  return { copyToClipboard, isCopied };
}
