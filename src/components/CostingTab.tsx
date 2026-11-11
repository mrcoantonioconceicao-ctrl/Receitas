import React from 'react';
import { Recipe } from '../types';
import { calculateCosting } from '../utils/bakersMath';
import { 
  DollarSign, 
  TrendingUp, 
  Percent, 
  Package, 
  Flame, 
  Briefcase, 
  ShieldCheck, 
  Award,
  ChevronRight,
  Info
} from 'lucide-react';

interface CostingTabProps {
  recipe: Recipe;
  setRecipe: React.Dispatch<React.SetStateAction<Recipe>>;
}

export const CostingTab: React.FC<CostingTabProps> = ({
  recipe,
  setRecipe,
}) => {
  const { costing } = recipe;

  const costingAnalysis = calculateCosting(
    recipe.ingredients,
    costing,
    recipe.targetUnits,
    recipe.targetBakedWeightPerUnit
  );

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
    setRecipe((prev) => ({
      ...prev,
      targetUnits: Math.max(1, units),
    }));
  };

  const totalRevenue = costingAnalysis.suggestedSalePriceMarkup * costingAnalysis.unitsYield;
  const totalNetProfit = (costingAnalysis.suggestedSalePriceMarkup - costingAnalysis.unitTotalCost) * costingAnalysis.unitsYield;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                ENGENHARIA FINANCEIRA & PRECIFICAÇÃO
              </span>
              <span className="text-xs text-stone-400">Professional Bakery Cost & Margin Engine</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              Custos Operacionais, Perda de Forno & Formação de Preço
            </h2>
            <p className="text-xs text-stone-400 mt-1 max-w-2xl">
              Cálculo de custos direto e indireto, evaporação pós-forneamento (Bake Loss) e precificação com multiplicadores profissionais (3x a 4x de Markup).
            </p>
          </div>
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Batch Cost */}
        <div className="bg-stone-900 border border-stone-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>Custo Total da Fornada</span>
            <DollarSign className="w-4 h-4 text-stone-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white">
            <span className="text-sm font-normal text-stone-400">R$ </span>
            {costingAnalysis.totalBatchCost.toFixed(2)}
          </div>
          <div className="text-[10px] text-stone-400 mt-1">
            Insumos: R$ {costingAnalysis.directIngredientsCost.toFixed(2)}
          </div>
        </div>

        {/* Unit Total Cost */}
        <div className="bg-stone-900 border border-stone-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>Custo por Unidade</span>
            <Package className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-amber-400">
            <span className="text-sm font-normal text-stone-400">R$ </span>
            {costingAnalysis.unitTotalCost.toFixed(2)}
          </div>
          <div className="text-[10px] text-stone-400 mt-1">
            {costingAnalysis.unitsYield} un assadas ({Math.round(costingAnalysis.bakedUnitWeight)}g cada)
          </div>
        </div>

        {/* Suggested Sale Price (Markup) */}
        <div className="bg-stone-900 border border-stone-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>Preço de Venda Sugerido</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-400">
            <span className="text-sm font-normal text-stone-400">R$ </span>
            {costingAnalysis.suggestedSalePriceMarkup.toFixed(2)}
          </div>
          <div className="text-[10px] text-stone-400 mt-1">
            Markup {costing.markupMultiplier}x sobre insumo direto
          </div>
        </div>

        {/* Gross Margin % */}
        <div className="bg-stone-900 border border-stone-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>Margem Bruta Unitária</span>
            <Percent className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-cyan-400">
            {costingAnalysis.grossMarginPercent.toFixed(1)} <span className="text-sm font-normal text-stone-400">%</span>
          </div>
          <div className="text-[10px] text-stone-400 mt-1">
            Lucro Bruto: R$ {costingAnalysis.grossProfitPerUnit.toFixed(2)} / un
          </div>
        </div>
      </div>

      {/* Yield & Bake Loss Technical Metrics */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
        <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
          <Flame className="w-4 h-4 text-amber-400" />
          <span>Fator de Perda no Forno (Bake Loss) & Rendimento Físico</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Bake Loss Slider */}
          <div className="bg-stone-950/70 border border-stone-800 p-4 rounded-xl">
            <div className="flex justify-between items-center text-xs text-stone-400 mb-1">
              <span className="text-white font-medium">Perda de Evaporação no Forno</span>
              <span className="font-mono text-amber-400 font-bold">{costing.bakeLossPercentage}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="25"
              step="1"
              value={costing.bakeLossPercentage}
              onChange={(e) => handleCostingChange('bakeLossPercentage', parseInt(e.target.value))}
              className="w-full accent-amber-400"
            />
            <div className="flex justify-between text-[10px] text-stone-400 mt-1">
              <span>Bolo/Forma (8-10%)</span>
              <span>Padrão (14-16%)</span>
              <span>Baguete/Seco (18-22%)</span>
            </div>
            <p className="text-[11px] text-stone-400 mt-2">
              Durante o forneamento, a água da crosta e miolo evapora. O peso final assado é sempre menor que a massa crua boleada.
            </p>
          </div>

          {/* Mass Balance Card */}
          <div className="bg-stone-950/70 border border-stone-800 p-4 rounded-xl flex flex-col justify-between">
            <div className="text-xs text-stone-400 font-medium">Balanço de Massa do Lote</div>
            <div className="space-y-2 mt-2 text-xs">
              <div className="flex justify-between text-stone-300">
                <span>Peso Total da Fornada Crua:</span>
                <span className="font-mono text-white font-bold">{Math.round(costingAnalysis.rawBatchWeight)} g</span>
              </div>
              <div className="flex justify-between text-stone-300">
                <span>Peso Total Assado (Pronto):</span>
                <span className="font-mono text-amber-300 font-bold">{Math.round(costingAnalysis.bakedBatchWeight)} g</span>
              </div>
              <div className="flex justify-between text-stone-400 text-[11px] pt-1 border-t border-stone-800">
                <span>Água evaporada no vapor:</span>
                <span className="font-mono text-red-400">-{Math.round(costingAnalysis.rawBatchWeight - costingAnalysis.bakedBatchWeight)} g</span>
              </div>
            </div>
          </div>

          {/* Units Configuration */}
          <div className="bg-stone-950/70 border border-stone-800 p-4 rounded-xl flex flex-col justify-between">
            <div className="text-xs text-stone-400 font-medium">Divisão de Unidades</div>
            <div className="space-y-2 mt-2 text-xs">
              <div className="flex justify-between items-center text-stone-300">
                <span>Quantidade de Peças:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    value={recipe.targetUnits}
                    onChange={(e) => handleTargetUnitsChange(parseInt(e.target.value) || 1)}
                    className="w-16 bg-stone-900 border border-stone-700 rounded px-2 py-0.5 text-right font-mono text-amber-400 font-bold focus:outline-none"
                  />
                  <span className="text-stone-400">un</span>
                </div>
              </div>
              <div className="flex justify-between text-stone-300">
                <span>Peso da Bola Crua na Balança:</span>
                <span className="font-mono text-white font-bold">{Math.round(costingAnalysis.rawUnitWeight)} g</span>
              </div>
              <div className="flex justify-between text-stone-400 text-[11px] pt-1 border-t border-stone-800">
                <span>Peso Médio do Pão Assado:</span>
                <span className="font-mono text-emerald-400 font-bold">~{Math.round(costingAnalysis.bakedUnitWeight)} g</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Indirect Costs & Overhead Parameters */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
        <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
          <Briefcase className="w-4 h-4 text-emerald-400" />
          <span>Custos Indiretos, Embalagem e Mão de Obra</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Packaging */}
          <div className="bg-stone-950/70 border border-stone-800 p-4 rounded-xl">
            <span className="text-xs text-stone-400 block mb-1">Custo de Embalagem por Unidade</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-stone-400 font-mono">R$</span>
              <input
                type="number"
                step="0.10"
                min="0"
                value={costing.packagingCostPerUnit}
                onChange={(e) => handleCostingChange('packagingCostPerUnit', parseFloat(e.target.value) || 0)}
                className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 font-mono text-white text-sm font-semibold focus:outline-none focus:border-amber-500"
              />
            </div>
            <span className="text-[10px] text-stone-400 mt-1 block">Saquinho Kraft, etiqueta, lacre</span>
          </div>

          {/* Energy & Gas */}
          <div className="bg-stone-950/70 border border-stone-800 p-4 rounded-xl">
            <span className="text-xs text-stone-400 block mb-1">Energia & Gás por Fornada (Batch)</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-stone-400 font-mono">R$</span>
              <input
                type="number"
                step="0.50"
                min="0"
                value={costing.energyGasCostPerBatch}
                onChange={(e) => handleCostingChange('energyGasCostPerBatch', parseFloat(e.target.value) || 0)}
                className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 font-mono text-white text-sm font-semibold focus:outline-none focus:border-amber-500"
              />
            </div>
            <span className="text-[10px] text-stone-400 mt-1 block">Pré-aquecimento e tempo de lastro</span>
          </div>

          {/* Overhead % */}
          <div className="bg-stone-950/70 border border-stone-800 p-4 rounded-xl">
            <span className="text-xs text-stone-400 block mb-1">Mão de Obra & Overhead Operacional</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="5"
                min="0"
                max="100"
                value={costing.laborOverheadPercentage}
                onChange={(e) => handleCostingChange('laborOverheadPercentage', parseFloat(e.target.value) || 0)}
                className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 font-mono text-white text-sm font-semibold focus:outline-none focus:border-amber-500"
              />
              <span className="text-xs text-stone-400 font-mono">%</span>
            </div>
            <span className="text-[10px] text-stone-400 mt-1 block">Taxa sobre custo de insumos diretos</span>
          </div>
        </div>
      </div>

      {/* Pricing Matrix & Strategy Comparison */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <span>Matriz de Precificação & Faixas de Margem</span>
          </h3>

          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-400">Markup Base:</span>
            <select
              value={costing.markupMultiplier}
              onChange={(e) => handleCostingChange('markupMultiplier', parseFloat(e.target.value))}
              className="bg-stone-950 border border-stone-700 rounded-lg px-2.5 py-1 text-xs font-mono text-amber-400 font-bold focus:outline-none"
            >
              <option value="2.8">2.8x (Mínimo Comercial)</option>
              <option value="3.2">3.2x (Panificação Padrão)</option>
              <option value="3.5">3.5x (Artesanal Recomendado)</option>
              <option value="4.0">4.0x (Alta Confeitaria / Boutique)</option>
              <option value="4.5">4.5x (Premium / Eventos)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Minimum Price */}
          <div className="p-4 rounded-xl bg-stone-950/60 border border-stone-800">
            <div className="flex items-center justify-between text-xs text-stone-400 mb-2">
              <span className="font-bold uppercase tracking-wider text-stone-400">1. Preço Mínimo (Sobrevivência)</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-stone-800 text-stone-300 font-mono">Markup 2.5x</span>
            </div>
            <div className="text-2xl font-bold font-mono text-stone-300">
              R$ {(costingAnalysis.unitDirectCost * 2.5 + costing.packagingCostPerUnit).toFixed(2)}
            </div>
            <p className="text-xs text-stone-400 mt-2 leading-relaxed">
              Cobre insumos, embalagem e custos variáveis. Margem de segurança baixa para atacado ou revenda para cafeterias.
            </p>
          </div>

          {/* Recommended Retail Price */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 relative">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold uppercase tracking-wider text-amber-300">2. Preço Sugerido (Recomendado)</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/30">
                Markup {costing.markupMultiplier}x
              </span>
            </div>
            <div className="text-3xl font-extrabold font-mono text-amber-400">
              R$ {costingAnalysis.suggestedSalePriceMarkup.toFixed(2)}
            </div>
            <p className="text-xs text-amber-200/80 mt-2 leading-relaxed">
              Proporciona margem bruta saudável (~{costingAnalysis.grossMarginPercent.toFixed(0)}%), permitindo reinvestimento em equipamentos, folha de pagamento e lucro sustentável.
            </p>
          </div>

          {/* Premium Boutique Price */}
          <div className="p-4 rounded-xl bg-stone-950/60 border border-stone-800">
            <div className="flex items-center justify-between text-xs text-stone-400 mb-2">
              <span className="font-bold uppercase tracking-wider text-emerald-400">3. Preço Premium (Boutique)</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono border border-emerald-500/20">Markup 4.2x</span>
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              R$ {(costingAnalysis.unitDirectCost * 4.2 + costing.packagingCostPerUnit + 1).toFixed(2)}
            </div>
            <p className="text-xs text-stone-400 mt-2 leading-relaxed">
              Posicionamento gourmet em lojas de nicho, empórios de produtos orgânicos ou pães especiais com fermentação natural de 36 horas.
            </p>
          </div>
        </div>

        {/* Projection Row */}
        <div className="mt-4 p-4 rounded-xl bg-stone-950/90 border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="text-stone-300">
            <span>Faturamento Bruto Projetado da Fornada: </span>
            <strong className="text-white font-mono text-sm">R$ {totalRevenue.toFixed(2)}</strong>
          </div>
          <div className="text-stone-300">
            <span>Lucro Líquido Operacional do Lote: </span>
            <strong className="text-emerald-400 font-mono text-sm">R$ {totalNetProfit.toFixed(2)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
