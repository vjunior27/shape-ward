import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, BrainCircuit, Sparkles, Mic, MicOff } from 'lucide-react';
import { Message } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useVoiceRecognition } from '../hooks/useVoice';

interface ChatScreenProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (text: string) => void;
  showAnalysisPopup?: boolean;
  onRunAnalysis?: () => void;
}

// ─── Quick suggestion chips ───────────────────────────────────────────────────

const QUICK_CHIPS = [
  'Monte meu treino de hoje',
  'Analise minha semana',
  'Sugestão de refeição',
  'Quanto de proteína devo comer?',
];

// ─── Workout JSON card ────────────────────────────────────────────────────────

interface WorkoutExercise {
  name: string;
  sets?: number | string;
  reps?: number | string;
  rest?: number | string;
}
interface WorkoutJSON {
  exercises: WorkoutExercise[];
  title?: string;
}

function WorkoutCard({
  workout,
  onUse,
}: {
  workout: WorkoutJSON;
  onUse: () => void;
}) {
  return (
    <div className="bg-[#1a1a28] border border-primary/20 rounded-2xl overflow-hidden">
      <div className="bg-primary/10 px-4 py-2.5 border-b border-primary/20 flex items-center gap-2">
        <span>🏋️</span>
        <p className="text-primary font-bold text-sm">{workout.title ?? 'Treino Gerado'}</p>
      </div>
      <div className="p-3 space-y-2">
        {workout.exercises.map((ex, i) => (
          <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-white/5 last:border-0">
            <span className="text-white font-medium">{ex.name}</span>
            <span className="text-[#A1A1AA] text-xs">
              {ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : ''}
              {ex.rest ? ` · ${ex.rest}s` : ''}
            </span>
          </div>
        ))}
      </div>
      <div className="px-3 pb-3">
        <button
          onClick={onUse}
          className="w-full py-2 bg-primary text-black font-bold text-sm rounded-xl hover:bg-[#00cc76] transition-colors"
        >
          Usar este treino
        </button>
      </div>
    </div>
  );
}

function tryParseWorkoutJSON(text: string): WorkoutJSON | null {
  const match = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    if (Array.isArray(parsed?.exercises)) return parsed as WorkoutJSON;
    return null;
  } catch {
    return null;
  }
}

// ─── Message renderer ─────────────────────────────────────────────────────────

function MessageContent({
  msg,
  onSendMessage,
}: {
  msg: Message;
  onSendMessage: (text: string) => void;
}) {
  if (msg.role !== 'model') {
    return <p className="whitespace-pre-wrap">{msg.text}</p>;
  }

  const workout = tryParseWorkoutJSON(msg.text);
  if (workout) {
    const textWithoutJson = msg.text.replace(/```json[\s\S]*?```/, '').trim();
    return (
      <div className="space-y-3">
        {textWithoutJson && (
          <div className="markdown-content prose prose-invert prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{textWithoutJson}</ReactMarkdown>
          </div>
        )}
        <WorkoutCard
          workout={workout}
          onUse={() => onSendMessage('Salvar treino: ' + JSON.stringify(workout))}
        />
      </div>
    );
  }

  return (
    <div className="markdown-content prose prose-invert prose-sm max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export const ChatScreen: React.FC<ChatScreenProps> = ({
  messages,
  isLoading,
  onSendMessage,
  showAnalysisPopup,
  onRunAnalysis,
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    isListening,
    isSupported: voiceSupported,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceRecognition();

  // When transcript arrives, set as input value
  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSendMessage(input);
    setInput('');
    resetTranscript();
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
    }
  };

  const showChips = messages.length <= 1 || !input;

  return (
    <div className="flex flex-col h-full bg-background relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/4 via-transparent to-transparent pointer-events-none" />

      <div className="flex-1 overflow-y-auto p-4 space-y-6 z-0">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fadeIn`}
            >
              <div className={`flex max-w-[90%] md:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end gap-2.5`}>
                <div className={`
                  w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-lg
                  ${isUser
                    ? 'glass border border-white/10'
                    : 'bg-gradient-to-br from-[#00FF94] to-[#00CC76] text-black shadow-[0_0_12px_rgba(0,255,148,0.3)]'}
                `}>
                  {isUser ? <User size={18} /> : <Bot size={18} />}
                </div>

                <div className={`
                  p-4 md:p-5 text-sm leading-relaxed shadow-xl transition-all
                  ${isUser
                    ? 'bg-primary/8 text-emerald-50 rounded-3xl rounded-tr-md border border-primary/15 backdrop-blur-sm'
                    : 'glass-card text-zinc-100 rounded-3xl rounded-tl-md'}
                `}>
                  <MessageContent msg={msg} onSendMessage={onSendMessage} />
                  <div className={`flex items-center gap-1.5 mt-2 opacity-30 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-[10px]">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex justify-start animate-fadeIn">
            <div className="flex flex-row items-start gap-2.5">
              <div className="w-9 h-9 rounded-2xl glass border border-primary/20 text-primary flex items-center justify-center shadow-lg">
                <BrainCircuit size={18} className="animate-pulse" />
              </div>
              <div className="glass-card px-5 py-4 rounded-3xl rounded-tl-md shadow-xl">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                  </div>
                  <span className="text-xs text-primary/80 font-medium ml-1">TitanAI está digitando...</span>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Analysis popup */}
      {showAnalysisPopup && !isLoading && (
        <div className="absolute bottom-24 left-4 right-4 animate-slideUp z-20">
          <button
            onClick={onRunAnalysis}
            className="w-full bg-gradient-to-r from-[#00FF94] to-[#00CC76] p-4 rounded-3xl shadow-[0_0_30px_rgba(0,255,148,0.45)] flex items-center justify-between group hover:scale-[1.02] active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="bg-black/20 p-2 rounded-2xl">
                <Sparkles className="text-black" size={22} />
              </div>
              <div className="text-left text-black">
                <p className="font-bold text-base">Análise de Perfil Pronta</p>
                <p className="text-xs font-medium opacity-80">Gerar dieta e treino com IA agora</p>
              </div>
            </div>
            <div className="bg-black/10 p-2 rounded-full group-hover:bg-black/20 transition-colors">
              <BrainCircuit className="text-black" size={20} />
            </div>
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="glass-nav border-t border-white/[0.06] z-10 pb-safe">
        {/* Quick suggestion chips */}
        {showChips && (
          <div className="overflow-x-auto flex gap-2 px-4 py-2 whitespace-nowrap">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => setInput(chip)}
                className="px-3 py-1.5 rounded-full bg-surface border border-[#1E1E2A] text-sm text-gray-400 hover:border-primary/40 hover:text-primary transition-colors shrink-0"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        <div className="p-4 pt-2">
          <div className="flex items-end gap-2 max-w-4xl mx-auto">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Pergunte sobre sua saúde, treino ou nutrição..."
              rows={1}
              className="flex-1 glass-input rounded-2xl px-5 py-3.5 text-white placeholder-gray-600 text-sm resize-none overflow-hidden min-h-[52px] max-h-[200px]"
              disabled={isLoading}
            />

            {/* Voice button */}
            {voiceSupported && (
              <button
                onClick={handleVoiceToggle}
                className={`rounded-xl bg-surface border border-[#1E1E2A] p-2.5 mb-[1px] shrink-0 transition-all ${
                  isListening ? 'text-primary animate-pulse' : 'text-gray-400 hover:text-primary'
                }`}
                title={isListening ? 'Parar gravação' : 'Gravar voz'}
              >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
            )}

            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className={`
                p-3.5 rounded-2xl transition-all shadow-lg mb-[1px] shrink-0
                ${!input.trim() || isLoading
                  ? 'glass text-gray-600 cursor-not-allowed'
                  : 'bg-primary text-black hover:bg-primaryDark hover:scale-105 active:scale-95 shadow-[0_0_16px_rgba(0,255,148,0.4)]'}
              `}
            >
              <Send size={20} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
