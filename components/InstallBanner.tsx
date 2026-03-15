import { useState } from 'react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { Download, X } from 'lucide-react';

export default function InstallBanner() {
  const { isInstallable, install } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);

  if (!isInstallable || dismissed) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 bg-gradient-to-r from-primary/90 to-emerald-600/90 backdrop-blur-sm rounded-2xl p-4 shadow-2xl flex items-center gap-3">
      <Download size={20} className="text-black shrink-0" />
      <div className="flex-1">
        <p className="text-black font-bold text-sm">Instalar Trainova</p>
        <p className="text-black/70 text-xs">Acesso rápido direto da tela inicial</p>
      </div>
      <button
        onClick={install}
        className="bg-black text-primary font-bold text-xs px-3 py-2 rounded-xl hover:bg-gray-900 transition-colors"
      >
        Instalar
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="text-black/60 hover:text-black p-1"
        aria-label="Fechar"
      >
        <X size={16} />
      </button>
    </div>
  );
}
