import React from 'react';
import { ArrowLeft, Shield } from 'lucide-react';

interface Props {
  onBack: () => void;
}

export function PrivacyPolicyScreen({ onBack }: Props) {
  return (
    <div className="min-h-screen bg-background text-white">
      <div className="sticky top-0 z-10 bg-surface/80 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-white/5 transition-colors">
          <ArrowLeft size={20} className="text-gray-400" />
        </button>
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-primary" />
          <h1 className="font-bold text-white">Política de Privacidade</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 text-sm leading-relaxed text-gray-300">
        <p className="text-xs text-gray-500">Última atualização: março de 2026</p>

        <section>
          <h2 className="text-white font-bold text-base mb-2">1. Quem somos</h2>
          <p>
            O <strong className="text-primary">Shape Ward</strong> é um aplicativo de acompanhamento fitness
            desenvolvido por Vilson Jr. Este documento descreve como coletamos, usamos e protegemos seus dados
            pessoais, em conformidade com a{' '}
            <strong className="text-white">Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018)</strong>.
          </p>
        </section>

        <section>
          <h2 className="text-white font-bold text-base mb-2">2. Dados coletados</h2>
          <ul className="list-disc pl-4 space-y-1">
            <li><strong className="text-white">Identificação:</strong> nome, e-mail e foto (via Google Login).</li>
            <li><strong className="text-white">Biométricos:</strong> idade, peso, altura, percentual de gordura informados por você.</li>
            <li><strong className="text-white">Treinos:</strong> exercícios, séries, cargas e notas registrados no diário.</li>
            <li><strong className="text-white">Alimentação:</strong> refeições, alimentos e macronutrientes do plano alimentar.</li>
            <li><strong className="text-white">Documentos de saúde:</strong> arquivos PDF/imagem enviados voluntariamente.</li>
            <li><strong className="text-white">Histórico de chat:</strong> conversas com a TitanAI (mantidas por 7 dias).</li>
            <li><strong className="text-white">Uso do app:</strong> contador de requisições diárias (rate limiting).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-white font-bold text-base mb-2">3. Base legal (LGPD)</h2>
          <ul className="list-disc pl-4 space-y-1">
            <li><strong className="text-white">Consentimento (Art. 7°, I):</strong> ao criar conta e aceitar esta política.</li>
            <li><strong className="text-white">Execução de contrato (Art. 7°, V):</strong> para fornecer as funcionalidades do app.</li>
            <li><strong className="text-white">Legítimo interesse (Art. 7°, IX):</strong> segurança e prevenção de abuso.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-white font-bold text-base mb-2">4. Compartilhamento de dados</h2>
          <ul className="list-disc pl-4 space-y-1">
            <li><strong className="text-white">Google Firebase</strong> — armazenamento e autenticação (EUA, SCCs compatíveis com LGPD).</li>
            <li><strong className="text-white">Google Gemini API</strong> — processamento de IA. Documentos de saúde são enviados temporariamente e não são armazenados pelo Google.</li>
          </ul>
          <p className="mt-2">Não vendemos nem compartilhamos dados com terceiros para fins comerciais.</p>
        </section>

        <section>
          <h2 className="text-white font-bold text-base mb-2">5. Retenção de dados</h2>
          <ul className="list-disc pl-4 space-y-1">
            <li>Histórico de chat: <strong className="text-white">7 dias</strong> (deletado automaticamente).</li>
            <li>Dados de treino e dieta: <strong className="text-white">enquanto a conta estiver ativa</strong>.</li>
            <li>Após exclusão da conta: <strong className="text-white">todos os dados removidos em até 30 dias</strong>.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-white font-bold text-base mb-2">6. Seus direitos (LGPD Art. 18)</h2>
          <ul className="list-disc pl-4 space-y-1">
            <li><strong className="text-white">Acesso:</strong> solicitar cópia de todos os seus dados.</li>
            <li><strong className="text-white">Correção:</strong> atualizar dados incorretos pelo Perfil do app.</li>
            <li><strong className="text-white">Exclusão:</strong> deletar conta e todos os dados (disponível no Perfil).</li>
            <li><strong className="text-white">Portabilidade:</strong> exportar dados em JSON (disponível no Perfil).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-white font-bold text-base mb-2">7. Segurança</h2>
          <ul className="list-disc pl-4 space-y-1">
            <li>Todas as comunicações usam <strong className="text-white">HTTPS/TLS</strong>.</li>
            <li>Dados isolados por usuário via <strong className="text-white">Firebase Security Rules</strong>.</li>
            <li>Gemini API key <strong className="text-white">nunca exposta ao cliente</strong> — processada no Cloud Function.</li>
            <li>Upload restrito a <strong className="text-white">PDF e imagens até 10 MB</strong>.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-white font-bold text-base mb-2">8. Aviso sobre IA</h2>
          <div className="text-yellow-400/90 bg-yellow-400/10 border border-yellow-400/20 rounded-xl p-3 text-xs">
            As análises da TitanAI são de caráter <strong>informativo e educacional</strong>.
            Não substituem consulta com médico, nutricionista ou educador físico habilitado.
          </div>
        </section>

        <section>
          <h2 className="text-white font-bold text-base mb-2">9. Contato</h2>
          <p className="text-primary">vilsonjrjuvencio@hotmail.com</p>
          <p className="text-gray-500 text-xs mt-1">Respondemos em até 15 dias úteis.</p>
        </section>

        <p className="text-xs text-gray-600 text-center pt-4 border-t border-white/5">
          Shape Ward © 2026 — Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}
