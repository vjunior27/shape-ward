import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export default function TermsScreen() {
  const { dispatch } = useAppContext();

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-[#1E1E2A] px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => dispatch({ type: 'SET_SCREEN', payload: 'settings' })}
          className="p-1.5 rounded-xl hover:bg-white/5 transition-colors"
          aria-label="Voltar"
        >
          <ChevronLeft size={22} className="text-gray-400" />
        </button>
        <h1 className="text-white font-bold text-lg">Termos de Uso</h1>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6 pb-24 text-gray-300 text-sm leading-relaxed">
        <p className="text-gray-500 text-xs">Última atualização: março de 2025</p>

        <section className="space-y-2">
          <h2 className="text-white font-bold text-base">1. Aceitação dos Termos</h2>
          <p>
            Ao acessar ou usar o aplicativo Trainova, você concorda com estes Termos de Uso. Se não concordar com qualquer parte destes termos, não utilize o serviço.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-white font-bold text-base">2. Descrição do Serviço</h2>
          <p>
            Trainova é uma plataforma de fitness pessoal que oferece diário de treinos, registro de alimentação, gamificação de metas e coach de inteligência artificial (TitanAI). O serviço é disponibilizado como aplicativo web progressivo (PWA).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-white font-bold text-base">3. Uso Aceitável</h2>
          <p>Você concorda em:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Usar o serviço apenas para fins pessoais e lícitos.</li>
            <li>Não compartilhar credenciais de acesso com terceiros.</li>
            <li>Não tentar reverter, descompilar ou extrair o código-fonte do aplicativo.</li>
            <li>Não usar o serviço para spam, abuso ou violação de direitos de terceiros.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-white font-bold text-base">4. Assinaturas e Pagamentos</h2>
          <p>O Trainova opera em três planos:</p>
          <div className="space-y-3 mt-2">
            <div className="bg-[#12121a] rounded-2xl p-4 border border-[#1E1E2A]">
              <p className="text-white font-semibold mb-1">Plano Free</p>
              <p className="text-gray-400 text-xs">Acesso básico ao coach TitanAI, diário de treinos e nutrição com limite de interações diárias.</p>
            </div>
            <div className="bg-[#12121a] rounded-2xl p-4 border border-[#00FF94]/20]">
              <p className="text-[#00FF94] font-semibold mb-1">Plano Pro</p>
              <p className="text-gray-400 text-xs">Interações ilimitadas com TitanAI, análise avançada de progresso, exportação de dados e acesso prioritário a novas funcionalidades.</p>
            </div>
            <div className="bg-[#12121a] rounded-2xl p-4 border border-yellow-500/20">
              <p className="text-yellow-400 font-semibold mb-1">Plano Titan</p>
              <p className="text-gray-400 text-xs">Tudo do Pro + análise de documentos de saúde, relatórios personalizados para profissionais de saúde e suporte prioritário.</p>
            </div>
          </div>
          <p className="mt-2">
            Assinaturas pagas são cobradas mensalmente ou anualmente, conforme selecionado. O cancelamento pode ser feito a qualquer momento; o acesso permanece ativo até o fim do período pago.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-white font-bold text-base">5. Propriedade Intelectual</h2>
          <p>
            Todo o conteúdo do Trainova — incluindo textos, código, design, logo e a marca TitanAI — é propriedade exclusiva dos desenvolvedores. É vedada a reprodução, distribuição ou uso comercial sem autorização prévia por escrito.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-white font-bold text-base">6. Isenção de Responsabilidade Médica</h2>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
            <p className="text-amber-300 font-medium mb-1">⚠️ Aviso Importante</p>
            <p className="text-amber-200/80">
              O Trainova e o coach TitanAI fornecem informações e sugestões de caráter geral sobre exercícios e nutrição. <strong>Este serviço NÃO substitui a orientação de médicos, nutricionistas ou educadores físicos habilitados.</strong> Sempre consulte um profissional de saúde antes de iniciar qualquer programa de exercícios ou mudança alimentar, especialmente se você tiver condições médicas preexistentes.
            </p>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-white font-bold text-base">7. Limitação de Responsabilidade</h2>
          <p>
            O Trainova não se responsabiliza por danos diretos, indiretos, incidentais ou consequentes decorrentes do uso ou impossibilidade de uso do serviço, incluindo lesões físicas resultantes da prática de exercícios.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-white font-bold text-base">8. Alterações nos Termos</h2>
          <p>
            Reservamo-nos o direito de atualizar estes termos a qualquer momento. Alterações relevantes serão notificadas via app. O uso continuado após a notificação implica aceitação dos novos termos.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-white font-bold text-base">9. Contato</h2>
          <p>
            Para dúvidas, sugestões ou solicitações relacionadas a estes Termos, entre em contato através do suporte disponível no aplicativo ou pelo e-mail de suporte indicado no site oficial.
          </p>
        </section>
      </div>
    </div>
  );
}
