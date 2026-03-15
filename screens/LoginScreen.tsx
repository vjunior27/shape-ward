import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/Button';
import { TrainovaLogo } from '../components/TrainovaLogo';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';

interface LoginScreenProps {
  onLogin: () => void;
  onDemoLogin: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onDemoLogin }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!email || !password) {
      setError("Preencha todos os campos.");
      setIsLoading(false);
      return;
    }

    if (isRegistering) {
      if (password !== confirmPassword) {
        setError("As senhas não coincidem.");
        setIsLoading(false);
        return;
      }
      if (password.length < 6) {
        setError("A senha deve ter pelo menos 6 caracteres.");
        setIsLoading(false);
        return;
      }
    }

    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onLogin();
    } catch (err: any) {
      console.error(err);
      let msg = "Ocorreu um erro. Tente novamente.";
      if (err.code === 'auth/invalid-email') msg = "E-mail inválido.";
      if (err.code === 'auth/user-not-found') msg = "Usuário não encontrado.";
      if (err.code === 'auth/wrong-password') msg = "Senha incorreta.";
      if (err.code === 'auth/email-already-in-use') msg = "E-mail já cadastrado.";
      if (err.code === 'auth/weak-password') msg = "Senha muito fraca.";
      if (err.message && err.message.includes('identity-toolkit-api-has-not-been-used-in-project')) {
        msg = "A autenticação não está ativada no Firebase Console. Ative o provedor de Email/Senha.";
      }
      if (err.message && err.message.includes('requests-to-this-api-identitytoolkit-method-google.cloud.identitytoolkit.v1.authenticationservice.signinwithpassword-are-blocked')) {
        msg = "LOGIN_BLOCKED";
      }
      if (err.message && err.message.includes('requests-to-this-api-identitytoolkit-method-google.cloud.identitytoolkit.v1.authenticationservice.signup-are-blocked')) {
        msg = "SIGNUP_BLOCKED";
      }
      if (err.code === 'auth/configuration-not-found') msg = "AUTH_NOT_CONFIGURED";
      if (err.code === 'auth/unauthorized-domain') msg = "UNAUTHORIZED_DOMAIN";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setError(null);
    setPassword('');
    setConfirmPassword('');
  };

  const currentDomain = window.location.hostname;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-white relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-15%] left-[-10%] w-80 h-80 bg-primary/8 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-72 h-72 bg-primary/5 rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute top-[40%] left-[60%] w-48 h-48 bg-primary/4 rounded-full blur-[80px] pointer-events-none" />

      <div className="w-full max-w-sm z-10 flex flex-col items-center">
        {/* Logo */}
        <div className="mb-6 relative">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl scale-150" />
          <TrainovaLogo variant="full" lang="pt" size="lg" className="relative w-64 h-auto" />
        </div>

        {isRegistering && (
          <p className="text-gray-400 mb-6 text-center font-sans text-sm">Crie sua conta e comece agora.</p>
        )}
        {!isRegistering && <div className="mb-6" />}

        {/* Glass form card */}
        <div className="w-full glass-card rounded-3xl p-6 animate-slideUp">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3 text-red-400 text-sm text-center flex flex-col gap-2">
                {error === "LOGIN_BLOCKED" || error === "SIGNUP_BLOCKED" || error === "AUTH_NOT_CONFIGURED" || error === "UNAUTHORIZED_DOMAIN" ? (
                  <>
                    <span>
                      {error === "AUTH_NOT_CONFIGURED"
                        ? "O serviço de Autenticação não foi iniciado no Firebase."
                        : error === "UNAUTHORIZED_DOMAIN"
                        ? "Este domínio não está autorizado no Firebase."
                        : (error === "LOGIN_BLOCKED" ? "O login" : "O cadastro") + " por senha está desativado no Firebase."}
                    </span>
                    {error === "UNAUTHORIZED_DOMAIN" && (
                      <div className="bg-black/20 p-2 rounded-xl text-xs break-all font-mono select-all">
                        {currentDomain}
                      </div>
                    )}
                    <a
                      href={error === "UNAUTHORIZED_DOMAIN"
                        ? `https://console.firebase.google.com/project/${import.meta.env.VITE_FIREBASE_PROJECT_ID}/authentication/settings`
                        : `https://console.firebase.google.com/project/${import.meta.env.VITE_FIREBASE_PROJECT_ID}/authentication/users`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-bold hover:text-red-300"
                    >
                      {error === "AUTH_NOT_CONFIGURED" ? "Iniciar Autenticação" :
                       error === "UNAUTHORIZED_DOMAIN" ? "Adicionar Domínio Autorizado" :
                       "Ativar no Firebase"}
                    </a>
                    <div className="my-1 text-xs text-gray-400">- OU -</div>
                    <button
                      type="button"
                      onClick={onDemoLogin}
                      className="glass text-white py-2 px-4 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-white/10 transition-colors"
                    >
                      Entrar no Modo Demo (Offline)
                    </button>
                  </>
                ) : error}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400 ml-1 uppercase tracking-wider">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full glass-input rounded-2xl px-4 py-3.5 text-white placeholder-gray-600 text-sm"
                placeholder="usuario@exemplo.com"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400 ml-1 uppercase tracking-wider">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full glass-input rounded-2xl px-4 py-3.5 text-white placeholder-gray-600 text-sm"
                placeholder="••••••••"
              />
            </div>

            {isRegistering && (
              <div className="space-y-1 animate-fadeIn">
                <label className="text-xs font-semibold text-gray-400 ml-1 uppercase tracking-wider">Confirmar Senha</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full glass-input rounded-2xl px-4 py-3.5 text-white placeholder-gray-600 text-sm"
                  placeholder="••••••••"
                />
              </div>
            )}

            <div className="pt-2 space-y-3">
              <Button type="submit" isLoading={isLoading}>
                {isRegistering ? 'CRIAR CONTA' : 'ENTRAR'}
              </Button>
              <Button type="button" variant="ghost" onClick={toggleMode}>
                {isRegistering ? 'Já tenho uma conta' : 'Criar Conta'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
