import React, { useState } from 'react';
import { Recipe } from '../types';
import { 
  Zap, 
  Search, 
  Loader2, 
  Sparkles, 
  CheckCircle2, 
  RotateCcw,
  SlidersHorizontal,
  Layers,
  ArrowRight
} from 'lucide-react';

interface QuickEntryBarProps {
  onRecipeLoaded: (recipe: Recipe, activeQuestion: string) => void;
  onOpenAuditTab?: (prompt: string) => void;
}

export const QuickEntryBar: React.FC<QuickEntryBarProps> = ({
  onRecipeLoaded,
  onOpenAuditTab,
}) => {
  const [productName, setProductName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastFormulated, setLastFormulated] = useState<{
    name: string;
    question: string;
  } | null>(null);

  const quickPicks = [
    'Pão Caseiro Fofinho',
    'Bolo de Fubá',
    'Pão de Forma Macio',
    'Pão Doce Tradicional',
    'Bolo de Cenoura',
    'Pão Francês Caseiro',
  ];

  const handleQuickFormulate = async (nameToUse?: string) => {
    const targetName = nameToUse || productName;
    if (!targetName.trim() || isLoading) return;

    setIsLoading(true);

    try {
      const response = await fetch('/api/gemini/quick-formulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName: targetName }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Falha ao buscar receita.');
      }

      // Ensure 1000g base flour as strict rule
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

      // Make sure primary flour has 1000g and 100%
      const flourIndex = formattedIngredients.findIndex((i: any) => i.isFlour || i.category === 'flour');
      if (flourIndex >= 0) {
        formattedIngredients[flourIndex].weight = 1000;
        formattedIngredients[flourIndex].percentage = 100;
        formattedIngredients[flourIndex].isFlour = true;
      }

      const newRecipe: Recipe = {
        id: `smart-${Date.now()}`,
        name: data.name || targetName,
        type: data.type || (targetName.toLowerCase().includes('bolo') ? 'cake' : 'bread'),
        category: data.category || 'Receitas Caseiras',
        description: data.description || `Receita caseira clara e deliciosa calculada com 1.000g de farinha como base.`,
        baseFlourWeight: 1000,
        targetUnits: data.targetUnits || 2,
        targetBakedWeightPerUnit: data.targetBakedWeightPerUnit || 750,
        ingredients: formattedIngredients,
        climate: {
          roomTemp: data.climate?.roomTemp ?? 24,
          flourTemp: data.climate?.flourTemp ?? 22,
          desiredDoughTemp: data.climate?.desiredDoughTemp ?? 26,
          prefermentTemp: data.climate?.prefermentTemp ?? 22,
          hasPreferment: false,
          relativeHumidity: 60,
          mixerType: 'manual',
          frictionFactor: 2,
          tapWaterTemp: 22,
        },
        costing: {
          bakeLossPercentage: data.costing?.bakeLossPercentage ?? 14,
          packagingCostPerUnit: data.costing?.packagingCostPerUnit ?? 1.0,
          energyGasCostPerBatch: data.costing?.energyGasCostPerBatch ?? 4.0,
          laborOverheadPercentage: data.costing?.laborOverheadPercentage ?? 15,
          markupMultiplier: data.costing?.markupMultiplier ?? 3.0,
          targetMarginPercent: data.costing?.targetMarginPercent ?? 65,
        },
        steps: (data.steps || []).map((st: any, idx: number) => ({
          id: `step-${Date.now()}-${idx}`,
          name: st.name,
          durationMinutes: st.durationMinutes ?? 15,
          temperature: st.temperature,
          description: st.description,
          criticalControlPoint: st.criticalControlPoint ?? 'Dica de ponto.',
        })),
      };

      const activeQuestion = data.activeReformulationQuestion || 
        'Quer adaptar essa receita para você? Se quiser fazer apenas metade com 500g de farinha, deixar mais docinho, mais fofinho ou trocar algum ingrediente, é só me falar que recalculo na hora!';

      setLastFormulated({
        name: newRecipe.name,
        question: activeQuestion,
      });

      onRecipeLoaded(newRecipe, activeQuestion);
      setProductName('');
    } catch (err: any) {
      console.error(err);
      alert(`Ops, ocorreu um erro ao carregar a receita: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 fill-amber-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase font-sans tracking-wide flex items-center gap-1.5">
              <span>O que você quer assar hoje?</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/20">
                Base 1.000g de farinha
              </span>
            </h3>
          </div>
        </div>
        <span className="text-[11px] text-stone-400">
          Digite apenas o nome (ex: "pão caseiro") para receber a receita completa e ingredientes em gramas
        </span>
      </div>

      {/* Input bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleQuickFormulate();
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder='Digite o que tem vontade de fazer (ex: "pão caseiro", "bolo de fubá", "pão fofinho")...'
            disabled={isLoading}
            className="w-full bg-stone-950 border border-stone-700 rounded-xl pl-9 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-stone-400 focus:outline-none focus:border-amber-500"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !productName.trim()}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 text-xs font-bold transition shrink-0 shadow-sm"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Preparando receita...</span>
            </>
          ) : (
            <>
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Ver Receita (1 kg)</span>
            </>
          )}
        </button>
      </form>

      {/* Quick Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-1">
        <span className="text-[11px] text-stone-400 shrink-0 font-medium">Sugestões queridinhas:</span>
        {quickPicks.map((pick, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleQuickFormulate(pick)}
            disabled={isLoading}
            className="px-2.5 py-1 rounded-lg bg-stone-950 hover:bg-stone-800 text-stone-300 text-xs font-medium border border-stone-800 hover:border-amber-500/40 whitespace-nowrap transition shrink-0"
          >
            {pick}
          </button>
        ))}
      </div>

      {/* Active Reformulation Question Banner */}
      {lastFormulated && (
        <div className="mt-2 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl animate-in fade-in duration-200">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 tracking-wide">
                  Receita Pronta: {lastFormulated.name} (1.000g de farinha)
                </span>
                <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Aberta na bancada
                </span>
              </div>
              <p className="text-xs text-amber-100 font-medium leading-relaxed">
                {lastFormulated.question}
              </p>

              {/* Actionable Reformulation Chips */}
              {onOpenAuditTab && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px]">
                  <span className="text-stone-400">Quer ajustar?</span>
                  <button
                    onClick={() => onOpenAuditTab(`Quero fazer só metade da receita de ${lastFormulated.name} com 500g de farinha. Recalcule todas as quantidades em gramas e me mostre a receita completa pronta para fazer!`)}
                    className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-amber-300 border border-amber-500/30 font-medium transition"
                  >
                    ⚖️ Fazer Metade (500g)
                  </button>
                  <button
                    onClick={() => onOpenAuditTab(`Quero deixar o ${lastFormulated.name} ainda mais fofinho e macio. O que posso ajustar na água/leite ou gordura? Entregue a receita inteira atualizada com as gramas exatas.`)}
                    className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-amber-300 border border-amber-500/30 font-medium transition"
                  >
                    ☁️ Deixar Mais Fofinho
                  </button>
                  <button
                    onClick={() => onOpenAuditTab(`Quero que o ${lastFormulated.name} fique mais docinho. Aumente o açúcar de forma equilibrada e me entregue a receita inteira recalculada com passo a passo.`)}
                    className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-amber-300 border border-amber-500/30 font-medium transition"
                  >
                    🍯 Mais Docinho
                  </button>
                  <button
                    onClick={() => onOpenAuditTab(`Quero trocar o óleo por manteiga na receita de ${lastFormulated.name}. Calcule a quantidade exata de manteiga e entregue a receita completa pronta.`)}
                    className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-amber-300 border border-amber-500/30 font-medium transition"
                  >
                    🧈 Trocar por Manteiga
                  </button>
                  <button
                    onClick={() => onOpenAuditTab(`Quero usar leite integral no lugar da água em ${lastFormulated.name}. Me entregue a receita completa recalculada com o passo a passo.`)}
                    className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-amber-300 border border-amber-500/30 font-medium transition"
                  >
                    🥛 Usar Leite
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
