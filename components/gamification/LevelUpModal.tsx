import React, { useEffect, useState } from 'react';

interface Props {
  level: number;
  name: string;
  icon: string;
  onClose: () => void;
}

export default function LevelUpModal({ level, name, icon, onClose }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-md">
      <div
        className={`flex flex-col items-center text-center p-8 transition-all duration-700 ${
          visible ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
        }`}
      >
        {/* Glow ring */}
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full blur-2xl bg-primary/40 scale-150" />
          <div className="relative w-28 h-28 rounded-full bg-gray-900 border-2 border-primary flex items-center justify-center">
            <span className="text-6xl">{icon}</span>
          </div>
        </div>

        <p className="text-gray-400 text-sm uppercase tracking-widest mb-1">Subiu de Nível!</p>
        <p className="text-primary font-black text-5xl mb-1">{level}</p>
        <p className="text-white font-bold text-2xl mb-6">{name}</p>

        <button
          onClick={onClose}
          className="px-8 py-3 bg-primary text-black font-bold rounded-2xl hover:bg-primaryDark transition-colors"
        >
          Continuar 🚀
        </button>
      </div>
    </div>
  );
}
