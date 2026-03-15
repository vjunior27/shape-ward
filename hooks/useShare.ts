import { useState, useCallback } from 'react';
import type { ShareCardData } from '../services/shareCardGenerator';
import { useStreakStore } from '../stores/useStreakStore';

export function useShare() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const recordShare = useStreakStore((s) => s.recordShare);

  const generate = useCallback(async (data: ShareCardData, themeId = 'dark') => {
    setIsGenerating(true);
    try {
      const { generateShareCard } = await import('../services/shareCardGenerator');
      const blob = await generateShareCard(data, themeId);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      return { blob, url };
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const shareNative = useCallback(async (blob: Blob, text = 'Meu progresso no Trainova 💪') => {
    const file = new File([blob], 'trainova-share.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Trainova', text });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'trainova-share.png';
      a.click();
      URL.revokeObjectURL(url);
    }
    recordShare?.();
  }, [recordShare]);

  const cleanup = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }, [previewUrl]);

  return { isGenerating, previewUrl, generate, shareNative, cleanup };
}
