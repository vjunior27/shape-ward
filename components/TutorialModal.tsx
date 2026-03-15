import React, { useState } from 'react';
import { BrainCircuit, Dumbbell, Utensils, User, ChevronRight, X, Sparkles, FileText } from 'lucide-react';

interface TutorialModalProps {
  onClose: () => void;
}

const steps = [
  {
    icon: <Sparkles size={36} className="text-primary" />,
    title: 'Bem-vindo ao Trainova',
    description:
      'Seu assistente de saúde e performance com inteligência artificial. Vamos te mostrar como tirar o máximo do app em poucos passos.',
  },
  {
    icon: <User size={36} className="text-primary" />,
    title: '1. Complete seu Perfil',
    description:
      'Acesse a aba Perfil e preencha seus dados: peso, altura, objetivo e rotina. Você também pode anexar exames e laudos médicos para que a TitanAI personalize melhor suas recomendações.',
  },
  {
    icon: <BrainCircuit size={36} className="text-primary" />,
    title: '2. Converse com a TitanAI',
    description:
      'Na aba Coach, peça à TitanAI para gerar seu treino e dieta personalizados. Ela usa seu perfil e histórico para criar planos precisos com base em ciência do esporte.',
  },
  {
    icon: <Dumbbell size={36} className="text-primary" />,
    title: '3. Registre seus Treinos',
    description:
      'Na aba Treinos, registre cargas, séries e repetições de cada exercício. As semanas ficam ordenadas da mais recente para a mais antiga para facilitar o acompanhamento.',
  },
  {
    icon: <Utensils size={36} className="text-primary" />,
    title: '4. Acompanhe sua Dieta',
    description:
      'Na aba Nutrição, visualize sua dieta gerada pela TitanAI. As calorias de cada alimento são calculadas automaticamente. Marque os alimentos consumidos ao longo do dia.',
  },
  {
    icon: <FileText size={36} className="text-primary" />,
    title: 'Dica: Relatório para Profissional',
    description:
      'No Perfil, você pode baixar um relatório completo com seu histórico de treinos e dieta para compartilhar com seu nutricionista ou educador físico.',
  },
];

export const TutorialModal: React.FC<TutorialModalProps> = ({ onClose }) => {
  const [step, setStep] = useState(0);

  const isLast = step === steps.length - 1;
  const current = steps[step];

  const next = () => {
    if (isLast) {
      onClose();
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-card w-full max-w-sm rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(0,255,148,0.15)] animate-slideUp">
        {/* Progress bar */}
        <div className="flex gap-1.5 p-4 pb-0">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-0.5 rounded-full transition-all duration-500 ${
                i <= step ? 'bg-primary' : 'bg-white/10'
              }`}
            />
          ))}
        </div>

        {/* Close button */}
        <div className="flex justify-end px-4 pt-3">
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-400 transition-colors p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-4 text-center flex flex-col items-center gap-4 animate-fadeIn" key={step}>
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-3xl">
            {current.icon}
          </div>
          <div>
            <h3 className="text-xl font-display font-bold text-white mb-2">{current.title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{current.description}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex flex-col gap-2">
          <button
            onClick={next}
            className="w-full bg-primary text-black font-bold py-3.5 rounded-2xl hover:bg-primaryDark transition-all shadow-[0_0_20px_rgba(0,255,148,0.3)] flex items-center justify-center gap-2"
          >
            {isLast ? 'Começar' : 'Próximo'}
            {!isLast && <ChevronRight size={18} />}
          </button>
          {!isLast && (
            <button
              onClick={onClose}
              className="text-gray-500 text-sm py-2 hover:text-gray-300 transition-colors"
            >
              Pular tutorial
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
