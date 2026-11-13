import React, { useState, useEffect } from 'react';
import { Recipe } from '../types';
import { calculateCosting } from '../utils/bakersMath';
import {
  DollarSign,
  TrendingUp,
  Percent,
  Package,
  Flame,
  Briefcase,
  Award,
} from 'lucide-react';

interface CostingTabProps {
  recipe: Recipe;
  setRecipe: React.Dispatch<React.SetStateAction<Recipe>>;
}

export const CostingTab: React.FC<CostingTabProps> = ({ recipe, setRecipe }) => {
  const { costing } = recipe;

  const costingAnalysis = calculateCosting(
    recipe.ingredients,
    costing,
    recipe.targetUnits,
    recipe.targetBakedWeightPerUnit
  );

  const [unitsDraft, setUnitsDraft] = useState<string>(String(recipe.targetUnits));

  useEffect(() => {
    setUnitsDraft(String(recipe.targetUnits));
  }, [recipe.targetUnits]);

  const handleCostingChange = (field: keyof typeof costing, value: any) => {
    setRecipe((prev) => ({
      ...prev,
      costing: {
        ...prev.costing,
        [field]: value,
      },
    }));
  };

  const handleTargetUnitsChange = (units: number) => {
    const safeUnits = Math.max(1, Math.min(40, units));
    setRecipe((prev) => {
      const rawTotal = prev.ingredients.reduce((s, i) => s + i.weight, 0);
      const bakeLoss = prev.costing.bakeLossPercentage || 12;
      const newBakedPerUnit = Math.round((rawTotal * (1 - bakeLoss / 100)) / safeUnits);
      return {
        ...prev,
        targetUnits: safeUnits,
        targetBakedWeightPerUnit: newBakedPerUnit,
      };
    });
  };

  const totalRevenue = costingAnalysis.suggestedSalePriceMarkup * costingAnalysis.unitsYield;
  const totalNetProfit =
    (costingAnalysis.suggestedSalePriceMarkup - costingAnalysis.unitTotalCost) *
    costingAnalysis.unitsYield;

  const isCuca = recipe.name.toLowerCase().includes('cuca');
  const unitLabel = isCuca
    ? costingAnalysis.unitsYield === 1
      ? 'cuca'
      : 'cucas'
    : recipe.type === 'cake'
    ? costingAnalysis.unitsYield === 1
      ? 'bolo'
      : 'bolos'
    : costingAnalysis.unitsYield === 1
    ? 'pão'
    : 'pães';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-stone-400">
              <span className="font-semibold text-emerald-400">Custos & Preço de Venda</span>
              <span aria-hidden="true">·</span>
              <span>Planejamento para Casa ou Venda</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              Quanto Custa Fazer, Quanto Rende e Por Quanto Vender
            </h2>
            <p className="text-xs text-stone-400 mt-1 max-w-2xl">
              Calcule o gasto com os ingredientes, o gás do forno e a embalagem, veja o peso real depois de assado e descubra um preço justo se quiser vender para vizinhos e clientes.
            </p>
          </div>
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Batch Cost */}
        <div className="bg-stone-900 border border-stone-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>Custo Total da Receita</span>
            <DollarSign className="w-4 h-4 text-stone-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-white">
            <span className="text-sm font-normal text-stone-400">R$ </span>
            {costingAnalysis.totalBatchCost.toFixed(2)}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">
            Só ingredientes: R$ {costingAnalysis.directIngredientsCost.toFixed(2)}
          </div>
        </div>

        {/* Unit Total Cost */}
        <div className="bg-stone-900 border border-stone-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>Custo por Unidade</span>
            <Package className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-amber-400">
            <span className="text-sm font-normal text-stone-400">R$ </span>
            {costingAnalysis.unitTotalCost.toFixed(2)}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">
            {costingAnalysis.unitsYield} {unitLabel} (~{Math.round(costingAnalysis.bakedUnitWeight)}g cada)
          </div>
        </div>

        {/* Suggested Sale Price */}
        <div className="bg-stone-900 border border-stone-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>Preço Sugerido para Venda</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-emerald-400">
            <span className="text-sm font-normal text-stone-400">R$ </span>
            {costingAnalysis.suggestedSalePriceMarkup.toFixed(2)}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">
            Multiplicador {costing.markupMultiplier}x sobre os ingredientes
          </div>
        </div>

        {/* Gross Margin % */}
        <div className="bg-stone-900 border border-stone-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>Sobra Limpa por Unidade</span>
            <Percent className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-cyan-400">
            {costingAnalysis.grossMarginPercent.toFixed(0)}
            <span className="text-sm font-normal text-stone-400">%</span>
          </div>
          <div className="text-[11px] text-stone-400 mt-1">
            Ganho de R$ {costingAnalysis.grossProfitPerUnit.toFixed(2)} em cada {unitLabel}
          </div>
        </div>
      </div>

      {/* Yield & Oven Evaporation Metrics */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
        <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
          <Flame className="w-4 h-4 text-amber-400" />
          <span>Quanto Rende e Quanto Pesa Depois de Assado</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Evaporation Slider */}
          <div className="bg-stone-950/70 border border-stone-800 p-4 rounded-xl">
            <div className="flex justify-between items-center text-xs text-stone-400 mb-1">
              <span className="text-white font-medium">Água que Evapora no Forno</span>
              <span className="font-mono text-amber-400 font-bold">{costing.bakeLossPercentage}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="25"
              step="1"
              value={costing.bakeLossPercentage}
              onChange={(e) => {
                const nextLoss = parseInt(e.target.value, 10);
                setRecipe((prev) => {
                  const rawTotal = prev.ingredients.reduce((s, i) => s + i.weight, 0);
                  const units = Math.max(1, prev.targetUnits || 1);
                  return {
                    ...prev,
                    targetBakedWeightPerUnit: Math.round((rawTotal * (1 - nextLoss / 100)) / units),
                    costing: {
                      ...prev.costing,
                      bakeLossPercentage: nextLoss,
                    },
                  };
                });
              }}
              className="w-full accent-amber-400"
            />
            <div className="flex justify-between text-[10px] text-stone-400 mt-1">
              <span>Bolo/Forma (9-10%)</span>
              <span>Pão Caseiro (12-14%)</span>
              <span>Casca Crocante (18%)</span>
            </div>
            <p className="text-[11px] text-stone-400 mt-2">
              No forno, um pouco da água evapora em vapor. Por isso o pão assado sempre pesa um pouco menos que a massa crua.
            </p>
          </div>

          {/* Mass Balance Card */}
          <div className="bg-stone-950/70 border border-stone-800 p-4 rounded-xl flex flex-col justify-between">
            <div className="text-xs text-stone-400 font-medium">Resumo do Peso da Receita</div>
            <div className="space-y-2 mt-2 text-xs tabular-nums">
              <div className="flex justify-between text-stone-300">
                <span>Massa Crua Total:</span>
                <span className="font-mono text-white font-bold">
                  {Math.round(costingAnalysis.rawBatchWeight)} g
                </span>
              </div>
              <div className="flex justify-between text-stone-300">
                <span>Total Depois de Assado:</span>
                <span className="font-mono text-amber-300 font-bold">
                  {Math.round(costingAnalysis.bakedBatchWeight)} g
                </span>
              </div>
              <div className="flex justify-between text-stone-400 text-[11px] pt-1 border-t border-stone-800">
                <span>Vapor perdido no forno:</span>
                <span className="font-mono text-red-400">
                  -{Math.round(costingAnalysis.rawBatchWeight - costingAnalysis.bakedBatchWeight)} g
                </span>
              </div>
            </div>
          </div>

          {/* Units Configuration */}
          <div className="bg-stone-950/70 border border-stone-800 p-4 rounded-xl flex flex-col justify-between">
            <div className="text-xs text-stone-400 font-medium">Divisão dos Pães / Bolos</div>
            <div className="space-y-2 mt-2 text-xs tabular-nums">
              <div className="flex justify-between items-center text-stone-300">
                <span>Quantas Unidades Dividir:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    max="40"
                    value={unitsDraft}
                    onChange={(e) => {
                      const val = e.target.value;
                      setUnitsDraft(val);
                      const num = parseInt(val, 10);
                      if (!isNaN(num) && num >= 1 && num <= 40) {
                        handleTargetUnitsChange(num);
                      }
                    }}
                    onBlur={() => setUnitsDraft(String(recipe.targetUnits))}
                    className="w-16 bg-stone-900 border border-stone-700 rounded px-2 py-0.5 text-right font-mono text-amber-400 font-bold focus:outline-none"
                  />
                  <span className="text-stone-400">un</span>
                </div>
              </div>
              <div className="flex justify-between text-stone-300">
                <span>Cada Pedaço na Balança (Cru):</span>
                <span className="font-mono text-white font-bold">
                  ~{Math.round(costingAnalysis.rawUnitWeight)} g
                </span>
              </div>
              <div className="flex justify-between text-stone-400 text-[11px] pt-1 border-t border-stone-800">
                <span>Peso de Cada Unidade Assada:</span>
                <span className="font-mono text-emerald-400 font-bold">
                  ~{Math.round(costingAnalysis.bakedUnitWeight)} g
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Indirect Costs */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
        <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
          <Briefcase className="w-4 h-4 text-emerald-400" />
          <span>Gastos Extras: Embalagem, Gás e Seu Trabalho</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-stone-950/70 border border-stone-800 p-4 rounded-xl">
            <span className="text-xs text-stone-400 block mb-1">Saquinho / Embalagem por Unidade</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-stone-400 font-mono">R$</span>
              <input
                type="number"
                step="0.10"
                min="0"
                value={costing.packagingCostPerUnit}
                onChange={(e) =>
                  handleCostingChange('packagingCostPerUnit', parseFloat(e.target.value) || 0)
                }
                className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 font-mono text-white text-sm font-semibold focus:outline-none focus:border-amber-500"
              />
            </div>
            <span className="text-[10px] text-stone-400 mt-1 block">Saquinho, fitinha ou forma descartável</span>
          </div>

          <div className="bg-stone-950/70 border border-stone-800 p-4 rounded-xl">
            <span className="text-xs text-stone-400 block mb-1">Gás e Energia da Fornada</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-stone-400 font-mono">R$</span>
              <input
                type="number"
                step="0.50"
                min="0"
                value={costing.energyGasCostPerBatch}
                onChange={(e) =>
                  handleCostingChange('energyGasCostPerBatch', parseFloat(e.target.value) || 0)
                }
                className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 font-mono text-white text-sm font-semibold focus:outline-none focus:border-amber-500"
              />
            </div>
            <span className="text-[10px] text-stone-400 mt-1 block">Gás do forno para pré-aquecer e assar</span>
          </div>

          <div className="bg-stone-950/70 border border-stone-800 p-4 rounded-xl">
            <span className="text-xs text-stone-400 block mb-1">Adicional pelo Seu Tempo e Trabalho</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="5"
                min="0"
                max="100"
                value={costing.laborOverheadPercentage}
                onChange={(e) =>
                  handleCostingChange('laborOverheadPercentage', parseFloat(e.target.value) || 0)
                }
                className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 font-mono text-white text-sm font-semibold focus:outline-none focus:border-amber-500"
              />
              <span className="text-xs text-stone-400 font-mono">%</span>
            </div>
            <span className="text-[10px] text-stone-400 mt-1 block">
              Calculado sobre o valor dos ingredientes
            </span>
          </div>
        </div>
      </div>

      {/* Pricing Matrix */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <span>Sugestões de Preço para Venda</span>
          </h3>

          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-400">Quanto Multiplicar:</span>
            <select
              value={costing.markupMultiplier}
              onChange={(e) => handleCostingChange('markupMultiplier', parseFloat(e.target.value))}
              className="bg-stone-950 border border-stone-700 rounded-lg px-2.5 py-1 text-xs font-mono text-amber-400 font-bold focus:outline-none"
            >
              <option value="2.5">2.5x (Preço Amigo / Família)</option>
              <option value="3.0">3.0x (Justo para Vender em Casa)</option>
              <option value="3.5">3.5x (Recomendado para Encomendas)</option>
              <option value="4.0">4.0x (Receita Especial / Recheada)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-stone-950/60 border border-stone-800">
            <div className="flex items-center justify-between text-xs text-stone-400 mb-2">
              <span className="font-bold text-stone-300">1. Preço Mínimo (Custo + Gás)</span>
              <span className="text-[10px] text-stone-400 font-mono">2.5x</span>
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-stone-300">
              R$ {(costingAnalysis.unitDirectCost * 2.5 + costing.packagingCostPerUnit).toFixed(2)}
            </div>
            <p className="text-xs text-stone-400 mt-2 leading-relaxed">
              Ideal para cobrar apenas dos amigos próximos e vizinhos sem ter prejuízo com gás e embalagem.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 relative">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-amber-300">2. Preço Recomendado</span>
              <span className="text-[10px] text-amber-300 font-mono font-bold">
                {costing.markupMultiplier}x
              </span>
            </div>
            <div className="text-3xl font-extrabold font-mono tabular-nums text-amber-400">
              R$ {costingAnalysis.suggestedSalePriceMarkup.toFixed(2)}
            </div>
            <p className="text-xs text-amber-200/80 mt-2 leading-relaxed">
              Dá um ganho justo (~{costingAnalysis.grossMarginPercent.toFixed(0)}%) para recompensar o seu tempo e pagar os ingredientes da próxima fornada.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-stone-950/60 border border-stone-800">
            <div className="flex items-center justify-between text-xs text-stone-400 mb-2">
              <span className="font-bold text-emerald-400">3. Preço Caprichado (Presente)</span>
              <span className="text-[10px] text-emerald-400 font-mono">4.2x</span>
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-400">
              R$ {(costingAnalysis.unitDirectCost * 4.2 + costing.packagingCostPerUnit + 1).toFixed(2)}
            </div>
            <p className="text-xs text-stone-400 mt-2 leading-relaxed">
              Ótimo quando o pão ou bolo vai embrulhado bem bonito para presente, festas ou encomendas especiais.
            </p>
          </div>
        </div>

        {/* Projection Row */}
        <div className="mt-4 p-4 rounded-xl bg-stone-950/90 border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs tabular-nums">
          <div className="text-stone-300">
            <span>Se vender toda a fornada ({costingAnalysis.unitsYield} {unitLabel}): </span>
            <strong className="text-white font-mono text-sm">R$ {totalRevenue.toFixed(2)}</strong>
          </div>
          <div className="text-stone-300">
            <span>Sobra limpa no bolso: </span>
            <strong className="text-emerald-400 font-mono text-sm">R$ {totalNetProfit.toFixed(2)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
