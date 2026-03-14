import { useState, useEffect } from 'react';
import { Cookie, X } from 'lucide-react';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('shape-ward-cookie-consent');
    if (!consent) setVisible(true);
  }, []);

  const save = (analytics: boolean) => {
    localStorage.setItem(
      'shape-ward-cookie-consent',
      JSON.stringify({ accepted: analytics, date: new Date().toISOString(), analytics })
    );
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] bg-surface/95 backdrop-blur-sm border-t border-white/10 p-4">
      <div className="max-w-2xl mx-auto flex items-start gap-3">
        <Cookie size={20} className="text-primary shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-white text-sm font-semibold mb-1">Cookies & Privacidade</p>
          <p className="text-gray-400 text-xs leading-relaxed">
            Usamos cookies para manter sua sessão e melhorar o app.{' '}
            <button
              onClick={() => {
                /* navigate to privacy policy — handled by parent */
              }}
              className="text-primary underline hover:text-primaryDark"
            >
              Política de Privacidade
            </button>
            .
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => save(false)}
            className="px-3 py-1.5 text-xs text-gray-400 border border-white/10 rounded-lg hover:text-white transition-colors"
          >
            Recusar
          </button>
          <button
            onClick={() => save(true)}
            className="px-3 py-1.5 text-xs text-black bg-primary rounded-lg font-semibold hover:bg-primaryDark transition-colors"
          >
            Aceitar
          </button>
        </div>
        <button onClick={() => save(false)} className="text-gray-600 hover:text-gray-400 p-1" aria-label="Fechar">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
