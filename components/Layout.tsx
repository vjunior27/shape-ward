import React from 'react';
import { Screen } from '../context/AppContext';
import { MessageSquare, List, Dumbbell, LogOut, UserCircle, Utensils } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentScreen: Screen;
  userAvatar?: string;
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentScreen, userAvatar, onNavigate, onLogout }) => {
  return (
    <div className="flex flex-col h-screen bg-background text-white">
      {/* Header */}
      <header className="px-6 py-4 glass-nav border-b border-white/[0.06] flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-primary/10 border border-primary/20">
            <Dumbbell className="text-primary w-5 h-5" />
          </div>
          <h1 className="font-display text-xl tracking-wider font-bold">SHAPE WARD</h1>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={onLogout} className="text-gray-500 hover:text-white flex items-center gap-2 text-xs font-medium uppercase tracking-wider transition-colors">
            <span>Sair</span>
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="glass-nav border-t border-white/[0.06] pb-safe">
        <div className="flex justify-around items-center h-16">
          {[
            { screen: 'chat' as Screen, icon: <MessageSquare size={22} />, label: 'Coach' },
            { screen: 'workouts' as Screen, icon: <List size={22} />, label: 'Treinos' },
            { screen: 'diet' as Screen, icon: <Utensils size={22} />, label: 'Nutrição' },
          ].map(({ screen, icon, label }) => (
            <button
              key={screen}
              onClick={() => onNavigate(screen)}
              className={`flex flex-col items-center justify-center w-full h-full transition-all duration-200 relative ${
                currentScreen === screen ? 'text-primary' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {currentScreen === screen && (
                <span className="absolute top-1.5 w-5 h-0.5 rounded-full bg-primary shadow-[0_0_8px_rgba(0,255,148,0.8)]" />
              )}
              {icon}
              <span className="text-[10px] mt-1 font-medium">{label}</span>
            </button>
          ))}

          <button
            onClick={() => onNavigate('profile')}
            className={`flex flex-col items-center justify-center w-full h-full transition-all duration-200 relative ${
              currentScreen === 'profile' ? 'text-primary' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {currentScreen === 'profile' && (
              <span className="absolute top-1.5 w-5 h-0.5 rounded-full bg-primary shadow-[0_0_8px_rgba(0,255,148,0.8)]" />
            )}
            {userAvatar ? (
              <img
                src={`data:image/jpeg;base64,${userAvatar}`}
                alt="Avatar"
                className={`w-6 h-6 rounded-full object-cover border-2 transition-colors ${
                  currentScreen === 'profile' ? 'border-primary' : 'border-transparent'
                }`}
              />
            ) : (
              <UserCircle size={22} />
            )}
            <span className="text-[10px] mt-1 font-medium">Perfil</span>
          </button>
        </div>
      </nav>
    </div>
  );
};
