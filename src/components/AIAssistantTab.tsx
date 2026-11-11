import React, { useState, useRef, useEffect } from 'react';
import { Recipe } from '../types';
import { 
  Bot, 
  Send, 
  Sparkles, 
  Loader2, 
  Zap, 
  Layers, 
  Scale, 
  Thermometer, 
  DollarSign, 
  ClipboardCopy, 
  Check,
  ArrowRight
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
      content: `Olá! Sou o DoughCraft, seu assistente e amigo para pães e bolos caseiros deliciosos.\n\nMinha missão é descomplicar a cozinha com receitas práticas e fáceis:\n• Digite apenas o nome do que você quer fazer (ex: "pão caseiro", "bolo de fubá", "pão doce", "pão de forma") e eu monto a receita completa para 1.000g (1 kg) de farinha, com medidas exatas em gramas e ingredientes simples de mercado;\n• Quer mudar algo? Basta me pedir (ex: "faz metade com 500g", "deixa mais fofinho", "troca o óleo por manteiga") que eu recalculo tudo e entrego a receita inteira atualizada na hora!\n• Passos fáceis e diretos (misturar, sovar, descansar e assar).\n\nO que vamos assar hoje?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);

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
        throw new Error(data.error || 'Erro na resposta do DoughCraft Core.');
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: data.text || 'Processamento concluído sem texto retornado.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `ERRO DE PROCESSAMENTO: ${err.message || 'Falha na comunicação com o servidor.'}`,
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

  // Quick import from chat to workbench
  const handleImportToWorkbench = async (productKeyword: string, msgId: string) => {
    if (!onLoadRecipeToWorkbench) return;
    setImportingId(msgId);
    try {
      const response = await fetch('/api/gemini/quick-formulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName: productKeyword }),
      });
      const data = await response.json();

      const baseFlourWeight = 1000;
      const formattedIngredients = (data.ingredients || []).map((ing: any, idx: number) => ({
        id: `ing-${Date.now()}-${idx}`,
        name: ing.name,
        category: ing.category || 'other',
        percentage: ing.percentage ?? 0,
        weight: ing.weight ?? Math.round((baseFlourWeight * (ing.percentage || 0)) / 100),
        isFlour: ing.isFlour ?? false,
        isPreferment: ing.isPreferment ?? false,
        prefermentHydration: ing.prefermentHydration,
        costPerKg: ing.costPerKg ?? 5.0,
        notes: ing.notes,
      }));

      const flourIdx = formattedIngredients.findIndex((i: any) => i.isFlour || i.category === 'flour');
      if (flourIdx >= 0) {
        formattedIngredients[flourIdx].weight = 1000;
        formattedIngredients[flourIdx].percentage = 100;
        formattedIngredients[flourIdx].isFlour = true;
      }

      const newRec: Recipe = {
        id: `rec-${Date.now()}`,
        name: data.name || productKeyword,
        type: data.type || 'bread',
        category: data.category || 'Formulação Rápida',
        description: data.description || 'Fórmula calibrada para 1.000g de farinha base.',
        baseFlourWeight: 1000,
        targetUnits: data.targetUnits || 2,
        targetBakedWeightPerUnit: data.targetBakedWeightPerUnit || 700,
        ingredients: formattedIngredients,
        climate: {
          roomTemp: data.climate?.roomTemp ?? 24,
          flourTemp: data.climate?.flourTemp ?? 22,
          desiredDoughTemp: data.climate?.desiredDoughTemp ?? 25,
          prefermentTemp: data.climate?.prefermentTemp ?? 22,
          hasPreferment: data.climate?.hasPreferment ?? false,
          relativeHumidity: data.climate?.relativeHumidity ?? 65,
          mixerType: data.climate?.mixerType || 'spiral_slow',
          frictionFactor: data.climate?.frictionFactor ?? 5,
          tapWaterTemp: data.climate?.tapWaterTemp ?? 20,
        },
        costing: {
          bakeLossPercentage: data.costing?.bakeLossPercentage ?? 14,
          packagingCostPerUnit: data.costing?.packagingCostPerUnit ?? 1.5,
          energyGasCostPerBatch: data.costing?.energyGasCostPerBatch ?? 5.0,
          laborOverheadPercentage: data.costing?.laborOverheadPercentage ?? 18,
          markupMultiplier: data.costing?.markupMultiplier ?? 3.5,
          targetMarginPercent: data.costing?.targetMarginPercent ?? 70,
        },
        steps: (data.steps || []).map((st: any, idx: number) => ({
          id: `step-${Date.now()}-${idx}`,
          name: st.name,
          durationMinutes: st.durationMinutes ?? 15,
          temperature: st.temperature,
          description: st.description,
          criticalControlPoint: st.criticalControlPoint ?? 'Controle térmico.',
        })),
      };

      onLoadRecipeToWorkbench(newRec, data.activeReformulationQuestion || 'Fórmula carregada na bancada com 1kg de farinha.');
    } catch (e: any) {
      console.error(e);
      alert('Erro ao carregar na bancada: ' + e.message);
    } finally {
      setImportingId(null);
    }
  };

  const smartDefaultsPicks = [
    'Pão caseiro fofinho',
    'Bolo de fubá cremoso',
    'Pão de forma macio',
    'Pão doce de padaria',
    'Bolo de cenoura fofinho',
    'Quero fazer metade (500g)',
  ];

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-12rem)] min-h-[550px]">
      {/* Quick Prompts Carousel */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[11px] text-stone-400 shrink-0 font-medium flex items-center gap-1">
          <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          Pedir Receita (1kg):
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
          onClick={() => handleSendMessage(`Como deixar meu pão caseiro mais fofinho e macio por mais dias? Me passe a receita atualizada com as gramas exatas.`)}
          disabled={isLoading}
          className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-medium border border-stone-800 hover:border-stone-700 whitespace-nowrap transition shrink-0"
        >
          Dica para Pão Mais Macio
        </button>
      </div>

      {/* Chat Messages Log */}
      <div className="flex-1 bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-6 overflow-y-auto space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const hasTableOrFormula = !isUser && (msg.content.includes('|') || msg.content.includes('1000g') || msg.content.includes('100%'));

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

                {/* If formula detected in assistant response, offer 1-click import */}
                {hasTableOrFormula && onLoadRecipeToWorkbench && (
                  <div className="mt-3 pt-3 border-t border-stone-800/80 flex items-center justify-between">
                    <span className="text-[11px] text-stone-400 font-mono">
                      Deseja abrir esta formulação completa na bancada interativa?
                    </span>
                    <button
                      onClick={() => handleImportToWorkbench(msg.content.slice(0, 40), msg.id)}
                      disabled={importingId === msg.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition shadow-sm"
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
            <span className="font-mono">DoughCraft Core calculando cinética e formulação (Smart Defaults 1kg)...</span>
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
          placeholder='Digite apenas o nome do produto (ex: "Pão caseiro", "Bolo de fubá") ou pergunte...'
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
