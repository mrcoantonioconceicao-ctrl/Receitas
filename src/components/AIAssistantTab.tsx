import React, { useState, useRef, useEffect } from 'react';
import { Recipe } from '../types';
import { normalizeQuickRecipe } from '../utils/bakersMath';
import { findPresetRecipeMatch } from '../utils/recipeMatcher';
import {
  Send,
  Loader2,
  Zap,
  ClipboardCopy,
  Check,
  AlertCircle,
} from 'lucide-react';

interface AIAssistantTabProps {
  currentRecipe: Recipe;
  onLoadRecipeToWorkbench?: (recipe: Recipe, activeQuestion: string) => void;
  externalPrompt?: string | null;
  onClearExternalPrompt?: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export const AIAssistantTab: React.FC<AIAssistantTabProps> = ({
  currentRecipe,
  onLoadRecipeToWorkbench,
  externalPrompt,
  onClearExternalPrompt,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Olá! Sou o DoughCraft, seu assistente carinhoso para pães, bolos e massas caseiras perfeitas.\n\nMinha missão é descomplicar a cozinha com receitas práticas e fáceis:\n• Digite apenas o nome do que você quer fazer (ex: "pão caseiro", "rosca doce", "bolo de cenoura", "bolo de laranja", "bolo de milho cremoso", "massa podre", "lasanha") e eu monto a receita completa já com xícaras, colheres e gramas exatas;\n• Quer mudar algo? Basta me pedir (ex: "dobra para 1 kg", "faz metade com 250g", "deixa mais fofinho", "troca o óleo por manteiga") que eu recalculo tudinho e entrego a receita inteira atualizada na hora!\n• Passo a passo bem mastigado com os truques da vovó.\n\nO que vamos fazer na cozinha hoje?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (externalPrompt && externalPrompt.trim()) {
      handleSendMessage(externalPrompt);
      if (onClearExternalPrompt) onClearExternalPrompt();
    }
  }, [externalPrompt]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);
    setImportError(null);

    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-8).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          context: {
            recipeName: currentRecipe.name,
            recipeType: currentRecipe.type,
            baseFlourWeight: currentRecipe.baseFlourWeight,
            targetUnits: currentRecipe.targetUnits,
            ingredients: currentRecipe.ingredients.map((i) => ({
              name: i.name,
              category: i.category,
              percentage: i.percentage,
              weight: i.weight,
              isFlour: i.isFlour,
              costPerKg: i.costPerKg,
            })),
            climate: currentRecipe.climate,
            costing: currentRecipe.costing,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao conversar com o assistente.');
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: data.text || 'Receita preparada sem texto retornado.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Ops, tive um probleminha de conexão: ${err.message || 'Falha na comunicação com o servidor.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const extractRecipeTopic = (msgIndex: number, fallbackContent: string): string => {
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user' && messages[i].content.trim()) {
        return messages[i].content.trim().slice(0, 80);
      }
    }
    const firstHeading = fallbackContent
      .split('\n')
      .map((line) => line.replace(/^[#*\s-]+/, '').trim())
      .find((line) => line.length > 3 && !line.toLowerCase().startsWith('olá'));
    return firstHeading?.slice(0, 60) || currentRecipe.name;
  };

  // Quick import from chat to workbench
  const handleImportToWorkbench = async (productKeyword: string, msgId: string) => {
    if (!onLoadRecipeToWorkbench) return;
    setImportError(null);

    const presetMatch = findPresetRecipeMatch(productKeyword);
    if (presetMatch) {
      onLoadRecipeToWorkbench(presetMatch.recipe, presetMatch.activeReformulationQuestion);
      return;
    }

    setImportingId(msgId);
    try {
      const response = await fetch('/api/gemini/quick-formulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName: productKeyword }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Não foi possível carregar na bancada.');
      }

      const newRec = normalizeQuickRecipe(data, productKeyword, 500);

      onLoadRecipeToWorkbench(
        newRec,
        data.activeReformulationQuestion ||
          `Receita carregada na bancada com ${Math.round(newRec.baseFlourWeight)}g de farinha!`
      );
    } catch (e: any) {
      console.error(e);
      setImportError('Erro ao carregar na bancada: ' + (e.message || 'Tente novamente.'));
    } finally {
      setImportingId(null);
    }
  };

  const smartDefaultsPicks = [
    'Pão caseiro fofinho',
    'Rosca doce trançada',
    'Bolo de cenoura com calda de chocolate',
    'Bolo de laranja fofinho',
    'Bolo de milho cremoso',
    'Massa podre de empada',
    'Massa de lasanha caseira',
    'Pão de ló clássico',
    'Nega maluca',
    'Bolo Prestígio',
    'Cuca de uva com farofinha',
    'Bolo de fubá cremoso',
    'Quero dobrar a receita (1 kg de farinha)',
  ];

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-12rem)] min-h-[550px]">
      {/* Quick Prompts Carousel */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[11px] text-stone-400 shrink-0 font-medium flex items-center gap-1">
          <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          Pedir Receita (500g):
        </span>
        {smartDefaultsPicks.map((pick, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(pick)}
            disabled={isLoading}
            className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-amber-300 text-xs font-semibold border border-amber-500/20 hover:border-amber-500/50 whitespace-nowrap transition shrink-0"
          >
            {pick}
          </button>
        ))}

        <span className="text-stone-700">|</span>

        <button
          onClick={() =>
            handleSendMessage(
              `Como deixar meu pão caseiro mais fofinho e macio por mais dias? Me passe a receita atualizada com xícaras e gramas exatas.`
            )
          }
          disabled={isLoading}
          className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-medium border border-stone-800 hover:border-stone-700 whitespace-nowrap transition shrink-0"
        >
          Dica para Pão Mais Macio
        </button>
      </div>

      {importError && (
        <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-xl text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{importError}</span>
        </div>
      )}

      {/* Chat Messages Log */}
      <div className="flex-1 bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-6 overflow-y-auto space-y-4">
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          const lower = msg.content.toLowerCase();
          const hasTableOrFormula =
            !isUser &&
            msg.id !== 'welcome' &&
            (msg.content.includes('|') ||
              lower.includes('500g') ||
              lower.includes('1000g') ||
              lower.includes('1.000g') ||
              lower.includes('1 kg') ||
              lower.includes('o que você vai precisar') ||
              msg.content.includes('100%'));

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-2 mb-1 px-1">
                <span className="text-[11px] font-sans text-stone-400 font-semibold">
                  {isUser ? 'Você' : 'DoughCraft'}
                </span>
                <span className="text-[10px] text-stone-400 font-mono">{msg.timestamp}</span>
              </div>

              <div
                className={`max-w-[90%] sm:max-w-[80%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed relative group ${
                  isUser
                    ? 'bg-amber-500 text-stone-950 font-medium rounded-tr-none shadow-sm'
                    : 'bg-stone-950 border border-stone-800 text-stone-200 rounded-tl-none font-sans whitespace-pre-wrap'
                }`}
              >
                {!isUser && (
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => copyToClipboard(msg.content, msg.id)}
                      className="p-1.5 rounded bg-stone-800 text-stone-400 hover:text-white transition"
                      title="Copiar resposta"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <ClipboardCopy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                )}

                {msg.content}

                {/* If recipe detected in assistant response, offer 1-click import */}
                {hasTableOrFormula && onLoadRecipeToWorkbench && (
                  <div className="mt-3 pt-3 border-t border-stone-800/80 flex items-center justify-between gap-3">
                    <span className="text-[11px] text-stone-400 font-sans">
                      Quer abrir esta receita na bancada para ajustar medidas e custos?
                    </span>
                    <button
                      onClick={() =>
                        handleImportToWorkbench(extractRecipeTopic(idx, msg.content), msg.id)
                      }
                      disabled={importingId === msg.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition shadow-sm shrink-0"
                    >
                      {importingId === msg.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Zap className="w-3.5 h-3.5 fill-current" />
                      )}
                      <span>Carregar na Bancada</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-amber-400 bg-stone-950/80 border border-stone-800 rounded-xl p-3 w-fit">
            <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            <span className="font-sans">Preparando sua receita caseira com medidas exatas (base 500g)...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Message Area */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="flex items-center gap-2 bg-stone-900 border border-stone-800 rounded-2xl p-2"
      >
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder='Digite o que quer fazer (ex: "Bolo de cenoura", "Massa podre", "Lasanha", "Rosca doce") ou peça um ajuste...'
          disabled={isLoading}
          className="flex-1 bg-transparent px-4 py-2.5 text-xs sm:text-sm text-white placeholder-stone-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={isLoading || !inputMessage.trim()}
          className="inline-flex items-center justify-center p-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 transition font-bold"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
