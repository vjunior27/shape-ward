import React, { useEffect, useState, useRef } from 'react';
import { X, Download, Share2, Loader2 } from 'lucide-react';
import { useShare } from '../hooks/useShare';
import { SHARE_THEMES, type ShareCardData } from '../services/shareCardGenerator';

interface ShareSheetProps {
  isOpen: boolean;
  onClose: () => void;
  data: ShareCardData;
}

const ShareSheet: React.FC<ShareSheetProps> = ({ isOpen, onClose, data }) => {
  const { isGenerating, previewUrl, generate, shareNative, cleanup } = useShare();
  const [themeId, setThemeId] = useState('dark');
  const blobRef = useRef<Blob | null>(null);

  // Auto-generate preview when opened or theme changes
  useEffect(() => {
    if (!isOpen) return;
    generate(data, themeId).then((result) => {
      if (result) blobRef.current = result.blob;
    });
    return () => {
      // Don't cleanup on re-render, only on close
    };
  }, [isOpen, themeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup URLs when closed
  useEffect(() => {
    if (!isOpen) {
      cleanup();
      blobRef.current = null;
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDownload = async () => {
    if (!blobRef.current) return;
    const url = URL.createObjectURL(blobRef.current);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trainova-share.png';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (!blobRef.current) return;
    await shareNative(blobRef.current);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#12121a] border-t border-[#1E1E2A] rounded-t-3xl p-5 animate-slideUp max-h-[90vh] overflow-y-auto">
        {/* Handle */}
        <div className="w-10 h-1 bg-[#1E1E2A] rounded-full mx-auto mb-4" />

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold text-lg">Compartilhar</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#1a1a28] text-[#A1A1AA] hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Theme selector */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {SHARE_THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => setThemeId(theme.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                themeId === theme.id
                  ? 'border-primary text-primary bg-primary/10'
                  : 'border-[#1E1E2A] text-[#A1A1AA] bg-[#1a1a28]'
              }`}
            >
              {theme.name}
            </button>
          ))}
        </div>

        {/* Preview */}
        <div className="relative bg-[#0a0a0f] rounded-2xl overflow-hidden mb-4 min-h-[200px] flex items-center justify-center">
          {isGenerating ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <Loader2 size={32} className="text-primary animate-spin" />
              <p className="text-[#A1A1AA] text-sm">Gerando card...</p>
            </div>
          ) : previewUrl ? (
            <img
              src={previewUrl}
              alt="Preview do card"
              className="w-full object-contain max-h-[60vh]"
            />
          ) : (
            <p className="text-[#52525B] text-sm">Nenhuma prévia disponível</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            disabled={isGenerating || !previewUrl}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#1a1a28] border border-[#1E1E2A] text-white font-semibold text-sm hover:border-primary/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Download size={18} />
            Baixar
          </button>
          <button
            onClick={handleShare}
            disabled={isGenerating || !previewUrl}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary text-black font-bold text-sm hover:bg-[#00cc76] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_16px_rgba(0,255,148,0.3)]"
          >
            <Share2 size={18} />
            Compartilhar
          </button>
        </div>
      </div>
    </>
  );
};

export default ShareSheet;
