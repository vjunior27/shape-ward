import React, { useState } from 'react';
import {
  ChevronLeft, ChevronRight, Crown, FileText, Shield, Download,
  Trash2, Info, LogOut
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { exportUserData, deleteAllUserData } from '../services/dataExport';
import { logEvent } from '../services/analytics';

export default function SettingsScreen() {
  const { state, dispatch, handleLogout } = useAppContext();
  const [deleteInput, setDeleteInput] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = async () => {
    const uid = state.user?.uid;
    if (!uid) return;
    try {
      await exportUserData(uid);
      logEvent({ name: 'data_exported' });
    } catch {
      setExportError('Erro ao exportar dados. Tente novamente.');
    }
  };

  const handleDeleteConfirm = async () => {
    const uid = state.user?.uid;
    if (!uid || deleteInput !== 'EXCLUIR') return;
    setIsDeleting(true);
    try {
      await deleteAllUserData(uid);
      logEvent({ name: 'account_deleted' });
      await handleLogout();
    } catch {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setDeleteInput('');
    }
  };

  const navigate = (screen: Parameters<typeof dispatch>[0]['payload']) =>
    dispatch({ type: 'SET_SCREEN', payload: screen as any });

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-[#1E1E2A] px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate('profile')}
          className="p-1.5 rounded-xl hover:bg-white/5 transition-colors"
          aria-label="Voltar"
        >
          <ChevronLeft size={22} className="text-gray-400" />
        </button>
        <h1 className="text-white font-bold text-lg">Configurações</h1>
      </div>

      <div className="px-4 py-4 space-y-6">

        {/* Seção Conta */}
        <section>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-2 px-1">Conta</p>
          <div className="bg-[#12121a] rounded-2xl overflow-hidden border border-[#1E1E2A] divide-y divide-[#1E1E2A]">
            <SettingsRow
              icon={<Crown size={18} className="text-[#00FF94]" />}
              label="Trainova Pro / Titan"
              sublabel="Faça upgrade e desbloqueie tudo"
              onClick={() => {/* navigate to pricing */}}
            />
          </div>
        </section>

        {/* Seção Legal */}
        <section>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-2 px-1">Legal</p>
          <div className="bg-[#12121a] rounded-2xl overflow-hidden border border-[#1E1E2A] divide-y divide-[#1E1E2A]">
            <SettingsRow
              icon={<FileText size={18} className="text-gray-400" />}
              label="Termos de Uso"
              onClick={() => navigate('terms')}
            />
            <SettingsRow
              icon={<Shield size={18} className="text-gray-400" />}
              label="Política de Privacidade"
              onClick={() => navigate('privacy')}
            />
          </div>
        </section>

        {/* Seção Dados */}
        <section>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-2 px-1">Dados</p>
          <div className="bg-[#12121a] rounded-2xl overflow-hidden border border-[#1E1E2A] divide-y divide-[#1E1E2A]">
            <SettingsRow
              icon={<Download size={18} className="text-gray-400" />}
              label="Exportar meus dados"
              sublabel={exportError ?? undefined}
              sublabelColor={exportError ? 'text-red-400' : undefined}
              onClick={handleExport}
            />
            <SettingsRow
              icon={<Trash2 size={18} className="text-red-500" />}
              label="Excluir minha conta"
              labelColor="text-red-400"
              onClick={() => { setDeleteInput(''); setShowDeleteModal(true); }}
              hideChevron
            />
          </div>
        </section>

        {/* Seção Sobre */}
        <section>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-2 px-1">Sobre</p>
          <div className="bg-[#12121a] rounded-2xl overflow-hidden border border-[#1E1E2A] divide-y divide-[#1E1E2A]">
            <SettingsRow
              icon={<Info size={18} className="text-gray-400" />}
              label="Versão"
              sublabel="1.0.0"
              hideChevron
            />
            <SettingsRow
              icon={<LogOut size={18} className="text-gray-400" />}
              label="Sair da conta"
              onClick={handleLogout}
              hideChevron
            />
          </div>
        </section>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#12121a] border border-[#1E1E2A] rounded-3xl p-6 w-full max-w-sm space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trash2 size={22} className="text-red-400" />
              </div>
              <h2 className="text-white font-bold text-lg">Excluir conta</h2>
              <p className="text-gray-400 text-sm mt-1">
                Esta ação é <span className="text-red-400 font-medium">irreversível</span>. Todos os seus dados serão permanentemente apagados.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-gray-500">Digite <span className="text-white font-mono font-bold">EXCLUIR</span> para confirmar:</p>
              <input
                type="text"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                className="w-full bg-[#0a0a0f] border border-[#1E1E2A] rounded-xl px-4 py-3 text-white text-sm focus:border-red-500 focus:outline-none font-mono"
                placeholder="EXCLUIR"
                autoCapitalize="characters"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteInput(''); }}
                className="flex-1 py-3 rounded-2xl border border-[#1E1E2A] text-gray-400 text-sm font-medium hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteInput !== 'EXCLUIR' || isDeleting}
                className="flex-1 py-3 rounded-2xl bg-red-600 text-white text-sm font-bold hover:bg-red-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Reusable row ──────────────────────────────────────────────────────────────

interface SettingsRowProps {
  icon: React.ReactNode;
  label: string;
  labelColor?: string;
  sublabel?: string;
  sublabelColor?: string;
  onClick?: () => void;
  hideChevron?: boolean;
}

function SettingsRow({ icon, label, labelColor, sublabel, sublabelColor, onClick, hideChevron }: SettingsRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="w-full flex items-center gap-3 px-4 py-4 min-h-[56px] hover:bg-white/[0.03] transition-colors disabled:cursor-default text-left"
    >
      <div className="shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${labelColor ?? 'text-white'}`}>{label}</p>
        {sublabel && (
          <p className={`text-xs mt-0.5 ${sublabelColor ?? 'text-gray-500'}`}>{sublabel}</p>
        )}
      </div>
      {!hideChevron && onClick && (
        <ChevronRight size={16} className="text-gray-600 shrink-0" />
      )}
    </button>
  );
}
