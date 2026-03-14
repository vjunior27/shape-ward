import React, { useState, useRef } from 'react';
import { UserProfile, WeeklyWorkoutPlan, WeeklyDietPlan, HealthDocument } from '../types';
import { Button } from '../components/Button';
import { FileText, Save, UserCircle, Image as ImageIcon, X, Plus, Camera, AlertCircle, Download, Loader2, FileCheck, Stethoscope, CalendarClock, Trash2, PackageOpen } from 'lucide-react';
import { generateMedicalReport } from '../utils/generateReport';
import { logEvent } from '../services/analytics';
import { uploadHealthDocument, deleteHealthDocument } from '../services/firebase';
import { useAppContext } from '../context/AppContext';
import { exportUserData, deleteAllUserData } from '../services/dataExport';

interface ProfileScreenProps {
  initialProfile: UserProfile;
  onSave: (profile: UserProfile) => void;
  workoutHistory?: WeeklyWorkoutPlan[];
  dietHistory?: WeeklyDietPlan[];
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  initialProfile,
  onSave,
  workoutHistory = [],
  dietHistory = [],
}) => {
  const { state } = useAppContext();
  const [profile, setProfile] = useState<UserProfile>({
    ...initialProfile,
    documentosSaude: initialProfile.documentosSaude ?? [],
    rotinaDiaria: initialProfile.rotinaDiaria ?? initialProfile.routine ?? '',
    historicoLesoes: initialProfile.historicoLesoes ?? '',
  });
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const [deletingFiles, setDeletingFiles] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleGenerateReport = () => {
    generateMedicalReport(profile, workoutHistory, dietHistory);
    logEvent({ name: 'report_generated' });
  };

  const handleExportData = async () => {
    const uid = state.user?.uid;
    if (!uid) return;
    try {
      await exportUserData(uid);
      logEvent({ name: 'data_exported' });
    } catch (err) {
      setError('Erro ao exportar dados. Tente novamente.');
    }
  };

  const handleDeleteAccount = async () => {
    const uid = state.user?.uid;
    if (!uid) return;
    const confirmed = window.confirm(
      'ATENÇÃO: Esta ação é irreversível. Todos os seus dados serão permanentemente excluídos. Deseja continuar?'
    );
    if (!confirmed) return;
    try {
      await deleteAllUserData(uid);
      logEvent({ name: 'account_deleted' });
    } catch (err: any) {
      setError('Erro ao excluir conta. Por favor, faça login novamente e tente de novo.');
    }
  };

  const handleChange = (field: keyof UserProfile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const convertFileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
    });

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await convertFileToBase64(file);
      setProfile(prev => ({ ...prev, avatar: base64 }));
    } catch (e) {
      console.error('Error processing avatar', e);
    }
  };

  /** Upload one or more health documents to Firebase Storage. */
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    // Convert to Array BEFORE resetting the input — FileList is a live object and
    // gets cleared when event.target.value is set to ''.
    const filesArray = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (filesArray.length === 0) return;

    const uid = state.user?.uid;
    if (!uid) {
      setError('Você precisa estar autenticado para fazer upload de documentos.');
      return;
    }

    for (const file of filesArray) {
      const isPdf = file.type === 'application/pdf';
      const isImage = file.type.startsWith('image/');
      if (!isPdf && !isImage) continue;

      const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
      if (file.size > MAX_BYTES) {
        setError(`"${file.name}" excede o limite de 10 MB.`);
        continue;
      }

      const tempKey = `${file.name}_${Date.now()}`;
      setUploadingFiles(prev => new Set(prev).add(tempKey));

      try {
        const doc = await uploadHealthDocument(uid, file);
        setProfile(prev => ({
          ...prev,
          documentosSaude: [...(prev.documentosSaude ?? []), doc],
        }));
      } catch (err) {
        console.error('Upload error:', err);
        setError(`Erro ao enviar "${file.name}". Tente novamente.`);
      } finally {
        setUploadingFiles(prev => {
          const next = new Set(prev);
          next.delete(tempKey);
          return next;
        });
      }
    }
  };

  /** Delete a health document from Storage and Firestore. */
  const handleRemoveDoc = async (target: HealthDocument) => {
    const uid = state.user?.uid;
    if (!uid) return;

    setDeletingFiles(prev => new Set(prev).add(target.storagePath));
    try {
      await deleteHealthDocument(uid, target);
      setProfile(prev => ({
        ...prev,
        documentosSaude: (prev.documentosSaude ?? []).filter(
          d => d.storagePath !== target.storagePath
        ),
      }));
    } catch (err) {
      console.error('Delete error:', err);
      setError('Erro ao remover o documento. Tente novamente.');
    } finally {
      setDeletingFiles(prev => {
        const next = new Set(prev);
        next.delete(target.storagePath);
        return next;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !profile.name || !profile.age || !profile.sex ||
      !profile.weight || !profile.height || !profile.workoutsPerWeek || !profile.objective
    ) {
      setError('Preencha todos os campos obrigatórios (*)');
      return;
    }
    onSave(profile);
  };

  const isUploading = uploadingFiles.size > 0;
  const docs = profile.documentosSaude ?? [];

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-display font-bold text-white tracking-wide">Seu Perfil</h2>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 mb-6 flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Avatar & Name */}
          <div className="flex flex-col items-center space-y-4">
            <div
              onClick={() => avatarInputRef.current?.click()}
              className="relative w-24 h-24 rounded-full bg-surface border-2 border-primary/20 flex items-center justify-center cursor-pointer hover:border-primary transition-all overflow-hidden group"
            >
              <input type="file" ref={avatarInputRef} onChange={handleAvatarChange} className="hidden" accept="image/*" />
              {profile.avatar ? (
                <img src={`data:image/jpeg;base64,${profile.avatar}`} className="w-full h-full object-cover" alt="Avatar" />
              ) : (
                <UserCircle size={48} className="text-gray-500" />
              )}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={24} className="text-white" />
              </div>
            </div>
            <div className="w-full">
              <input
                type="text"
                value={profile.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full bg-transparent border-b border-white/10 p-2 text-center text-xl text-white focus:border-primary focus:outline-none font-medium"
                placeholder="Seu Nome *"
              />
            </div>
          </div>

          {/* Metrics */}
          <section className="bg-surface rounded-xl p-4 border border-white/5">
            <h3 className="text-primary font-bold mb-4 uppercase text-sm tracking-wider">Métricas Corporais</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-400">Sexo <span className="text-primary">*</span></label>
                <select
                  value={profile.sex}
                  onChange={(e) => handleChange('sex', e.target.value)}
                  className="w-full bg-[#121212] border border-white/10 rounded-lg p-3 text-white focus:border-primary focus:outline-none appearance-none"
                >
                  <option value="">Selecione</option>
                  <option value="male">Masculino</option>
                  <option value="female">Feminino</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">Idade (anos) <span className="text-primary">*</span></label>
                <input type="number" value={profile.age} onChange={(e) => handleChange('age', e.target.value)}
                  className="w-full bg-[#121212] border border-white/10 rounded-lg p-3 text-white focus:border-primary focus:outline-none" placeholder="25" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">Peso (kg) <span className="text-primary">*</span></label>
                <input type="number" value={profile.weight} onChange={(e) => handleChange('weight', e.target.value)}
                  className="w-full bg-[#121212] border border-white/10 rounded-lg p-3 text-white focus:border-primary focus:outline-none" placeholder="75.5" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">Altura (cm) <span className="text-primary">*</span></label>
                <input type="number" value={profile.height} onChange={(e) => handleChange('height', e.target.value)}
                  className="w-full bg-[#121212] border border-white/10 rounded-lg p-3 text-white focus:border-primary focus:outline-none" placeholder="180" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">Gordura Corporal (%)</label>
                <input type="number" value={profile.fatPercentage} onChange={(e) => handleChange('fatPercentage', e.target.value)}
                  className="w-full bg-[#121212] border border-white/10 rounded-lg p-3 text-white focus:border-primary focus:outline-none" placeholder="Opcional" />
              </div>
            </div>
          </section>

          {/* Training & Lifestyle */}
          <section className="bg-surface rounded-xl p-4 border border-white/5">
            <h3 className="text-primary font-bold mb-4 uppercase text-sm tracking-wider">Treino & Objetivo</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-400">Objetivo Principal <span className="text-primary">*</span></label>
                <select value={profile.objective} onChange={(e) => handleChange('objective', e.target.value)}
                  className="w-full bg-[#121212] border border-white/10 rounded-lg p-3 text-white focus:border-primary focus:outline-none appearance-none">
                  <option value="">Selecione seu objetivo</option>
                  <option value="Emagrecimento">Emagrecimento / Queima de Gordura</option>
                  <option value="Hipertrofia">Hipertrofia / Ganho de Massa</option>
                  <option value="Definição">Definição Muscular</option>
                  <option value="Condicionamento">Condicionamento Físico / Saúde</option>
                  <option value="Performance">Performance Atlética</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">Média de Treinos por Semana <span className="text-primary">*</span></label>
                <input type="number" value={profile.workoutsPerWeek} onChange={(e) => handleChange('workoutsPerWeek', e.target.value)}
                  className="w-full bg-[#121212] border border-white/10 rounded-lg p-3 text-white focus:border-primary focus:outline-none" placeholder="Ex: 4" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">Profissão</label>
                <input type="text" value={profile.profession} onChange={(e) => handleChange('profession', e.target.value)}
                  className="w-full bg-[#121212] border border-white/10 rounded-lg p-3 text-white focus:border-primary focus:outline-none" placeholder="ex: Engenheiro..." />
              </div>
            </div>
          </section>

          {/* Minha Rotina */}
          <section className="bg-surface rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <CalendarClock size={16} className="text-primary" />
              <h3 className="text-primary font-bold uppercase text-sm tracking-wider">Minha Rotina</h3>
            </div>
            <p className="text-[11px] text-gray-500 mb-4 leading-relaxed">
              Descreva seu dia a dia: horário de trabalho, horas de sono, nível de estresse e tempo disponível para treinar. A TitanAI usa isso para encaixar o treino na sua realidade.
            </p>
            <textarea
              value={profile.rotinaDiaria}
              onChange={(e) => handleChange('rotinaDiaria', e.target.value)}
              rows={3}
              className="w-full bg-[#121212] border border-white/10 rounded-lg p-3 text-white focus:border-primary focus:outline-none resize-none text-sm"
              placeholder="Ex: Trabalho das 8h às 18h, durmo em média 7h, treino disponível no período da noite (19h-21h). Estresse moderado."
            />
          </section>

          {/* Lesões e Condições Médicas */}
          <section className="bg-surface rounded-xl p-4 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-1">
              <Stethoscope size={16} className="text-amber-400" />
              <h3 className="text-amber-400 font-bold uppercase text-sm tracking-wider">Lesões e Condições Médicas</h3>
            </div>
            <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">
              Dores crônicas, cirurgias, tratamentos em curso, limitações físicas ou condições de saúde preexistentes. A TitanAI trata este campo como <span className="text-amber-400 font-medium">restrição absoluta</span> ao gerar qualquer plano de treino.
            </p>
            <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/15 rounded-lg px-3 py-2 mb-3">
              <AlertCircle size={13} className="text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-300/80 leading-relaxed">
                Exercícios que contraindiquem qualquer item aqui listado serão automaticamente excluídos ou adaptados.
              </p>
            </div>
            <textarea
              value={profile.historicoLesoes}
              onChange={(e) => handleChange('historicoLesoes', e.target.value)}
              rows={3}
              className="w-full bg-[#121212] border border-amber-500/20 rounded-lg p-3 text-white focus:border-amber-400 focus:outline-none resize-none text-sm"
              placeholder="Ex: Hérnia de disco L4-L5 (evitar flexão lombar com carga), cirurgia no joelho direito em 2022, dor no ombro esquerdo ao abduzir acima de 90°."
            />
          </section>

          {/* Health Documents — Firebase Storage */}
          <section className="bg-surface rounded-xl p-4 border border-white/5">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-primary font-bold uppercase text-sm tracking-wider">Documentos de Saúde</h3>
              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="text-xs flex items-center gap-1 bg-white/5 px-2 py-1 rounded hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {isUploading ? 'Enviando...' : 'Adicionar'}
              </button>
            </div>
            <p className="text-[11px] text-gray-500 mb-4 leading-relaxed">
              Exames laboratoriais, laudos médicos ou imagens. A TitanAI lê esses documentos automaticamente e os considera em cada resposta.
            </p>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,image/*"
              multiple
              className="hidden"
            />

            <div className="space-y-3">
              {docs.length === 0 && !isUploading && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="text-center p-4 border border-dashed border-white/10 rounded-xl text-gray-500 text-sm cursor-pointer hover:bg-white/5 transition-colors"
                >
                  Toque para adicionar exames, diagnósticos ou laudos (PDF ou imagem)
                </div>
              )}

              {docs.map((doc) => {
                const isDeleting = deletingFiles.has(doc.storagePath);
                const isPdf = doc.mimeType === 'application/pdf';
                return (
                  <div key={doc.storagePath} className="flex items-center justify-between bg-[#121212] p-3 rounded-lg border border-white/5">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`p-2 rounded-lg ${isPdf ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
                        {isPdf ? <FileText size={18} /> : <ImageIcon size={18} />}
                      </div>
                      <div className="overflow-hidden">
                        <span className="text-sm truncate text-gray-200 block max-w-[180px]">{doc.name}</span>
                        <span className="text-[10px] text-gray-500">
                          {new Date(doc.uploadedAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <FileCheck size={14} className="text-primary shrink-0" aria-label="Salvo na nuvem" />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveDoc(doc)}
                      disabled={isDeleting}
                      className="p-1 hover:bg-white/10 rounded-full text-gray-500 hover:text-red-400 transition-colors shrink-0"
                    >
                      {isDeleting
                        ? <Loader2 size={16} className="animate-spin" />
                        : <X size={16} />}
                    </button>
                  </div>
                );
              })}

              {/* Upload spinners for in-progress uploads */}
              {Array.from(uploadingFiles).map((key) => (
                <div key={key} className="flex items-center gap-3 bg-[#121212] p-3 rounded-lg border border-primary/20 animate-pulse">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Loader2 size={18} className="animate-spin" />
                  </div>
                  <span className="text-sm text-gray-400">Enviando para a nuvem...</span>
                </div>
              ))}
            </div>
          </section>

          <div className="pb-8 space-y-3">
            <Button type="submit" disabled={isUploading}>
              <Save size={18} className="mr-2" />
              SALVAR PERFIL
            </Button>
            {profile.name && (
              <button
                type="button"
                onClick={handleGenerateReport}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-white/10 bg-white/5 text-gray-400 hover:text-primary hover:border-primary/30 transition-all text-sm font-medium"
              >
                <Download size={16} />
                Baixar Relatório para Profissional
              </button>
            )}

            {/* LGPD — dados e exclusão de conta */}
            <div className="border-t border-white/5 pt-3 space-y-2">
              <p className="text-xs text-gray-600 text-center mb-1">Seus dados (LGPD)</p>
              <button
                type="button"
                onClick={handleExportData}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-white/10 bg-white/5 text-gray-500 hover:text-primary hover:border-primary/20 transition-all text-sm"
              >
                <PackageOpen size={15} />
                Exportar meus dados (JSON)
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-red-900/40 bg-red-950/20 text-red-600 hover:text-red-400 hover:border-red-700/40 transition-all text-sm"
              >
                <Trash2 size={15} />
                Excluir minha conta permanentemente
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
