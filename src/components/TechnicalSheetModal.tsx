import React, { useState } from 'react';
import { Recipe } from '../types';
import { calculateHydrationMetrics, calculateDDT, calculateCosting, getHouseholdMeasureEstimate } from '../utils/bakersMath';
import { 
  X, 
  Printer, 
  ClipboardCopy, 
  Check, 
  FlaskConical, 
  Thermometer, 
  DollarSign, 
  Clock 
} from 'lucide-react';

interface TechnicalSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: Recipe;
}

export const TechnicalSheetModal: React.FC<TechnicalSheetModalProps> = ({
  isOpen,
  onClose,
  recipe,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const hydration = calculateHydrationMetrics(recipe.ingredients, recipe.baseFlourWeight);
  const totalWater = hydration.formulaWaterWeight;
  const ddt = calculateDDT(recipe.climate, totalWater);
  const costing = calculateCosting(
    recipe.ingredients,
    recipe.costing,
    recipe.targetUnits,
    recipe.targetBakedWeightPerUnit
  );

  const totalRawWeight = recipe.ingredients.reduce((s, i) => s + i.weight, 0);
  const isCuca = recipe.name.toLowerCase().includes('cuca');
  const unitLabel = isCuca
    ? `${recipe.targetUnits} cuca${recipe.targetUnits === 1 ? ' grande' : 's'}`
    : recipe.type === 'cake'
    ? `${recipe.targetUnits} bolo${recipe.targetUnits === 1 ? '' : 's'}`
    : `${recipe.targetUnits} pã${recipe.targetUnits === 1 ? 'o médio' : 'es médios'}`;

  // Deterministic reference code from recipe id (avoids Math.random() during render)
  const recipeCode = Array.from(recipe.id || 'receita')
    .reduce((acc, ch) => ((acc * 31 + ch.charCodeAt(0)) % 9000) + 1000, 1234);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    const text = `=====================================================
🧺 DOUGHCRAFT - RECEITA CASEIRA DA VOVÓ
=====================================================
RECEITA: ${recipe.name.toUpperCase()}
RENDIMENTO: ${unitLabel} (~${Math.round(costing.bakedUnitWeight)}g cada assado)
PESO TOTAL DA MASSA: ~${Math.round(totalRawWeight)}g

-----------------------------------------------------
🧺 O QUE VOCÊ VAI PRECISAR:
-----------------------------------------------------
${recipe.ingredients.map(i => {
  const measure = getHouseholdMeasureEstimate(i.name, i.category, i.weight);
  return `• ${i.name}: ${Math.round(i.weight)}g (${measure})${i.notes ? ` - ${i.notes}` : ''}`;
}).join('\n')}

-----------------------------------------------------
👩‍🍳 COMO FAZER:
-----------------------------------------------------
${recipe.steps.map((s, idx) => `${idx + 1}. ${s.name} (${s.durationMinutes} min)\n${s.description}${s.criticalControlPoint ? `\n💡 Segredo da Vovó: ${s.criticalControlPoint}` : ''}`).join('\n\n')}

-----------------------------------------------------
💰 CUSTO E RENDIMENTO:
• Custo dos Ingredientes: R$ ${costing.directIngredientsCost.toFixed(2)}
• Custo por Unidade: R$ ${costing.unitTotalCost.toFixed(2)}
• Preço Sugerido para Venda: R$ ${costing.suggestedSalePriceMarkup.toFixed(2)} cada
=====================================================`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header - Visible in UI, hidden in Print */}
        <div className="no-print p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <FlaskConical className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Receita Completa para Fazer em Casa</h3>
              <p className="text-xs text-stone-400">Prontinha para imprimir ou salvar com medidas exatas em gramas</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyText}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium border border-stone-700 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado!' : 'Copiar Receita'}
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Specification Body */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-stone-950 text-stone-100 font-sans print:p-0 print:bg-white print:text-black">
          {/* Header of technical sheet */}
          <div className="border-b-2 border-stone-800 print:border-black pb-4 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <span className="font-sans text-xs uppercase tracking-wider text-amber-400 print:text-black font-bold">
                  DOUGHCRAFT - PÃES E BOLOS CASEIROS
                </span>
                <h1 className="text-2xl font-bold text-white print:text-black mt-1">
                  {recipe.name}
                </h1>
                <p className="text-xs text-stone-400 print:text-gray-600 mt-1">
                  Categoria: <strong>{recipe.category}</strong> | Tipo: <strong>{recipe.type}</strong>
                </p>
              </div>
              <div className="text-right font-mono text-xs text-stone-400 print:text-gray-600">
                <div>DATA: {new Date().toLocaleDateString('pt-BR')}</div>
                <div>RECEITA: #{recipeCode}</div>
                <div className="text-amber-400 print:text-black font-bold">MEDIDAS EXATAS EM GRAMAS</div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 print:border print:border-black print:p-2">
            <div className="bg-stone-900 print:bg-white p-3 rounded-lg border border-stone-800 print:border-0">
              <span className="text-[11px] text-stone-400 print:text-gray-700 block font-mono">Farinha Base:</span>
              <strong className="text-lg font-mono text-white print:text-black">{Math.round(recipe.baseFlourWeight)}g</strong>
            </div>
            <div className="bg-stone-900 print:bg-white p-3 rounded-lg border border-stone-800 print:border-0">
              <span className="text-[11px] text-stone-400 print:text-gray-700 block font-mono">Massa Crua Total:</span>
              <strong className="text-lg font-mono text-amber-400 print:text-black">{Math.round(totalRawWeight)}g</strong>
            </div>
            <div className="bg-stone-900 print:bg-white p-3 rounded-lg border border-stone-800 print:border-0">
              <span className="text-[11px] text-stone-400 print:text-gray-700 block font-mono">Água e Líquidos:</span>
              <strong className="text-lg font-mono text-cyan-400 print:text-black">{Math.round(hydration.formulaWaterWeight)} ml</strong>
            </div>
            <div className="bg-stone-900 print:bg-white p-3 rounded-lg border border-stone-800 print:border-0">
              <span className="text-[11px] text-stone-400 print:text-gray-700 block font-mono">Rendimento:</span>
              <strong className="text-lg font-mono text-emerald-400 print:text-black">{unitLabel} (~{Math.round(costing.bakedUnitWeight)}g)</strong>
            </div>
          </div>

          {/* Table of Formulation */}
          <div className="mb-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-300 print:text-black font-mono mb-2">
              🧺 1. O que Você Vai Precisar (Ingredientes & Medidas Caseiras)
            </h4>
            <table className="w-full text-xs text-left border border-stone-800 print:border-black">
              <thead className="bg-stone-900 print:bg-gray-100 font-mono text-stone-400 print:text-black border-b border-stone-800 print:border-black">
                <tr>
                  <th className="py-2 px-3">Ingrediente</th>
                  <th className="py-2 px-3">Medida da Vovó</th>
                  <th className="py-2 px-3 text-right">Peso Exato (g)</th>
                  <th className="py-2 px-3 text-right">Custo Estimado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800 print:divide-black">
                {recipe.ingredients.map((ing) => (
                  <tr key={ing.id} className="font-mono">
                    <td className="py-1.5 px-3 font-sans text-stone-200 print:text-black">
                      {ing.name}
                      {ing.notes && <div className="text-[10px] text-stone-400 print:text-gray-600 font-sans">{ing.notes}</div>}
                    </td>
                    <td className="py-1.5 px-3 font-sans text-amber-300 print:text-black font-medium">
                      {getHouseholdMeasureEstimate(ing.name, ing.category, ing.weight)}
                    </td>
                    <td className="py-1.5 px-3 text-right text-white print:text-black font-bold">
                      {Math.round(ing.weight)} g
                    </td>
                    <td className="py-1.5 px-3 text-right text-stone-400 print:text-black">
                      R$ {((ing.weight / 1000) * (ing.costPerKg || 0)).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Water Temperature Guidance */}
          <div className="mb-6 p-4 rounded-xl bg-stone-900/60 print:bg-white border border-stone-800 print:border-black">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-300 print:text-black font-mono mb-2 flex items-center gap-1.5">
              <Thermometer className="w-4 h-4 text-cyan-400 print:text-black" />
              2. O Segredo da Água Morninha
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div>
                <span className="text-stone-400 print:text-gray-600 block">Calor Ideal da Massa:</span>
                <strong className="text-emerald-400 print:text-black">{recipe.climate.desiredDoughTemp}°C</strong>
              </div>
              <div>
                <span className="text-stone-400 print:text-gray-600 block">Cozinha Hoje:</span>
                <strong className="text-white print:text-black">{recipe.climate.roomTemp}°C</strong>
              </div>
              <div>
                <span className="text-stone-400 print:text-gray-600 block">Calor da Sova:</span>
                <strong className="text-white print:text-black">+{recipe.climate.frictionFactor}°C</strong>
              </div>
              <div>
                <span className="text-stone-400 print:text-gray-600 block">Temperatura da Água:</span>
                <strong className="text-cyan-400 print:text-black text-sm">{ddt.waterTempTarget.toFixed(0)}°C</strong>
              </div>
            </div>
            {ddt.needsIce ? (
              <div className="mt-2 text-xs font-sans text-sky-300 print:text-black font-bold pt-2 border-t border-stone-800 print:border-black">
                ❄️ Dia muito quente! Use {ddt.iceWeight}g de gelo + {ddt.liquidWaterWeight}g de água gelada para a massa não amolecer.
              </div>
            ) : (
              <div className="mt-2 text-xs font-sans text-amber-300/90 print:text-black pt-2 border-t border-stone-800 print:border-black">
                💡 Teste no pulso: água morninha como banho de bebê (nunca quente demais para não queimar o fermento).
              </div>
            )}
          </div>

          {/* Process Schedule & Critical Points */}
          <div className="mb-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-300 print:text-black font-mono mb-2 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400 print:text-black" />
              👩‍🍳 3. Como Fazer (Passo a Passo da Vovó)
            </h4>
            <div className="space-y-2">
              {recipe.steps.map((st, i) => (
                <div key={st.id} className="text-xs p-2.5 rounded bg-stone-900/40 print:bg-white border border-stone-800/80 print:border-black flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full border border-stone-600 print:border-black shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white print:text-black font-mono mr-2">
                      {i + 1}. {st.name} ({st.durationMinutes} min):
                    </span>
                    <span className="text-stone-300 print:text-black">{st.description}</span>
                    {st.criticalControlPoint && (
                      <span className="block text-[11px] text-amber-400 print:text-gray-700 mt-0.5">
                        💡 Segredo da Vovó: {st.criticalControlPoint}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Costing Summary */}
          <div className="p-4 rounded-xl bg-stone-900/60 print:bg-white border border-stone-800 print:border-black text-xs font-mono">
            <div className="flex justify-between items-center text-stone-300 print:text-black">
              <span>Custo Total da Receita: <strong>R$ {costing.totalBatchCost.toFixed(2)}</strong></span>
              <span>Custo por Unidade: <strong>R$ {costing.unitTotalCost.toFixed(2)}</strong></span>
              <span className="text-emerald-400 print:text-black font-bold">
                Preço de Venda Sugerido ({recipe.costing.markupMultiplier}x): R$ {costing.suggestedSalePriceMarkup.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
