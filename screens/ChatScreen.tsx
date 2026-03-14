import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, BrainCircuit, Sparkles } from 'lucide-react';
import { Message } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatScreenProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (text: string) => void;
  showAnalysisPopup?: boolean;
  onRunAnalysis?: () => void;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({
  messages,
  isLoading,
  onSendMessage,
  showAnalysisPopup,
  onRunAnalysis
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

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
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  ) : (
                    <div className="markdown-content prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                  )}
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

      {/* Input bar */}
      <div className="p-4 glass-nav border-t border-white/[0.06] z-10 pb-safe">
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
  );
};
