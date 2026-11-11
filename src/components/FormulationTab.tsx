import React, { useState } from 'react';
import { 
  Recipe, 
  Ingredient, 
  CalculationMode, 
  CategoryType 
} from '../types';
import { 
  calculateHydrationMetrics, 
  scaleRecipeByBaseFlour, 
  scaleRecipeByTotalDoughWeight,
  getHouseholdMeasureEstimate
} from '../utils/bakersMath';
import { 
  Plus, 
  Trash2, 
  Droplet, 
  Layers, 
  Scale, 
  Sparkles, 
  Info,
  Clock,
  RotateCcw,
  CheckCircle2,
  GitFork,
  Table
} from 'lucide-react';
import { ASTVisualizer } from './ASTVisualizer';

interface FormulationTabProps {
  recipe: Recipe;
  setRecipe: React.Dispatch<React.SetStateAction<Recipe>>;
  onOpenAudit: () => void;
}

export const FormulationTab: React.FC<FormulationTabProps> = ({
  recipe,
  setRecipe,
  onOpenAudit,
}) => {
  const [calcMode, setCalcMode] = useState<CalculationMode>('flour-basis');
  const [viewMode, setViewMode] = useState<'table' | 'ast'>('table');
  const [totalDoughInput, setTotalDoughInput] = useState<number>(() => {
    return recipe.ingredients.reduce((acc, curr) => acc + curr.weight, 0);
  });

  const hydration = calculateHydrationMetrics(recipe.ingredients, recipe.baseFlourWeight);
  const totalRawDoughWeight = recipe.ingredients.reduce((sum, ing) => sum + ing.weight, 0);

  // Handle base flour weight change
  const handleBaseFlourChange = (newFlour: number) => {
    if (newFlour <= 0) return;
    const updatedIngredients = scaleRecipeByBaseFlour(recipe.ingredients, newFlour);
    setRecipe((prev) => ({
      ...prev,
      baseFlourWeight: newFlour,
      ingredients: updatedIngredients,
    }));
    setTotalDoughInput(updatedIngredients.reduce((s, i) => s + i.weight, 0));
  };

  // Handle total dough weight change
  const handleTotalDoughChange = (newTotal: number) => {
    setTotalDoughInput(newTotal);
    if (newTotal <= 0) return;
    const { ingredients: scaled, newBaseFlourWeight } = scaleRecipeByTotalDoughWeight(
      recipe.ingredients,
      newTotal
    );
    setRecipe((prev) => ({
      ...prev,
      baseFlourWeight: newBaseFlourWeight,
      ingredients: scaled,
    }));
  };

  // Handle units yield change
  const handleUnitsYieldChange = (units: number, targetBakedWeight: number) => {
    const bakeLoss = recipe.costing.bakeLossPercentage || 15;
    const rawUnitWeight = targetBakedWeight / (1 - bakeLoss / 100);
    const newTotalDough = units * rawUnitWeight;
    handleTotalDoughChange(Math.round(newTotalDough));
    setRecipe((prev) => ({
      ...prev,
      targetUnits: units,
      targetBakedWeightPerUnit: targetBakedWeight,
    }));
  };

  // Update single ingredient percentage or weight
  const handleIngredientChange = (
    id: string,
    field: keyof Ingredient,
    value: any
  ) => {
    setRecipe((prev) => {
      const updated = prev.ingredients.map((ing) => {
        if (ing.id !== id) return ing;

        const updatedIng = { ...ing, [field]: value };

        // If percentage changed, recalculate weight
        if (field === 'percentage') {
          const numPct = parseFloat(value) || 0;
          updatedIng.weight = Math.round(((prev.baseFlourWeight * numPct) / 100) * 10) / 10;
        }

        // If weight changed, recalculate percentage
        if (field === 'weight') {
          const numWeight = parseFloat(value) || 0;
          updatedIng.percentage = prev.baseFlourWeight > 0 
            ? Math.round(((numWeight / prev.baseFlourWeight) * 100) * 10) / 10 
            : 0;
        }

        return updatedIng;
      });

      return {
        ...prev,
        ingredients: updated,
      };
    });
  };

  // Add new ingredient
  const handleAddIngredient = (preset?: Partial<Ingredient>) => {
    const newId = `ing-${Date.now()}`;
    const newIng: Ingredient = {
      id: newId,
      name: preset?.name || 'Novo Ingrediente',
      category: preset?.category || 'other',
      percentage: preset?.percentage || 0,
      weight: preset?.percentage ? Math.round((recipe.baseFlourWeight * preset.percentage) / 100) : 0,
      isFlour: preset?.isFlour ?? false,
      isPreferment: preset?.isPreferment ?? false,
      prefermentHydration: preset?.prefermentHydration,
      costPerKg: preset?.costPerKg || 0,
      notes: preset?.notes,
    };

    setRecipe((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, newIng],
    }));
  };

  // Remove ingredient
  const handleRemoveIngredient = (id: string) => {
    setRecipe((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((i) => i.id !== id),
    }));
  };

  // Quick preset ingredients to add
  const quickPicks: { label: string; data: Partial<Ingredient> }[] = [
    { label: '+ Água', data: { name: 'Água Filtrada', category: 'liquid', percentage: 70, costPerKg: 0.05 } },
    { label: '+ Sal', data: { name: 'Sal Marinho', category: 'salt', percentage: 2.0, costPerKg: 4.0 } },
    { label: '+ Levain 100%', data: { name: 'Levain (100% Hidr.)', category: 'ferment', percentage: 20, isPreferment: true, prefermentHydration: 100, costPerKg: 6.0 } },
    { label: '+ Fermento Seco', data: { name: 'Fermento Biológico Seco', category: 'ferment', percentage: 0.8, costPerKg: 35.0 } },
    { label: '+ Manteiga', data: { name: 'Manteiga Sem Sal 82%', category: 'fat', percentage: 10, costPerKg: 46.0 } },
    { label: '+ Azeite', data: { name: 'Azeite de Oliva Extra Virgem', category: 'fat', percentage: 4, costPerKg: 42.0 } },
    { label: '+ Açúcar', data: { name: 'Açúcar Cristal', category: 'sugar', percentage: 4, costPerKg: 4.8 } },
    { label: '+ Farinha Integral', data: { name: 'Farinha de Trigo Integral', category: 'flour', percentage: 20, isFlour: true, costPerKg: 8.5 } },
  ];

  return (
    <div className="space-y-6">
      {/* Formula Header & Metadata */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {recipe.category || 'Panificação Técnica'}
              </span>
              <span className="text-xs text-stone-400">
                Tipo: <strong className="text-stone-200 capitalize">{recipe.type}</strong>
              </span>
            </div>
            <input
              type="text"
              value={recipe.name}
              onChange={(e) => setRecipe({ ...recipe, name: e.target.value })}
              className="text-2xl font-bold bg-transparent text-white border-b border-transparent hover:border-stone-700 focus:border-amber-500 focus:outline-none w-full transition"
            />
            <p className="text-sm text-stone-400 line-clamp-2">
              {recipe.description}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenAudit}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold transition"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              Dicas do DoughCraft
            </button>
          </div>
        </div>

        {/* Calculation Mode Selector */}
        <div className="mt-6 pt-6 border-t border-stone-800/80">
          <label className="text-xs font-semibold text-stone-300 block mb-2.5">
            Como você prefere medir sua receita:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setCalcMode('flour-basis')}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold border transition ${
                calcMode === 'flour-basis'
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              <Layers className="w-4 h-4 text-amber-400" />
              <div>
                <div className="text-left font-bold">1. Pela Quantidade de Farinha</div>
                <div className="text-[10px] text-stone-400 font-normal">Base 1 kg, 500g, etc.</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setCalcMode('total-dough')}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold border transition ${
                calcMode === 'total-dough'
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              <Scale className="w-4 h-4 text-amber-400" />
              <div>
                <div className="text-left font-bold">2. Pelo Peso Total da Massa</div>
                <div className="text-[10px] text-stone-400 font-normal">Quero fazer 1,5 kg de massa</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setCalcMode('unit-yield')}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold border transition ${
                calcMode === 'unit-yield'
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              <div>
                <div className="text-left font-bold">3. Por Número de Pães / Peças</div>
                <div className="text-[10px] text-stone-400 font-normal">Ex: 2 pães médios de 700g</div>
              </div>
            </button>
          </div>

          {/* Dynamic Controller based on Mode */}
          <div className="mt-4 p-4 rounded-xl bg-stone-950/70 border border-stone-800/80">
            {calcMode === 'flour-basis' && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <span className="text-xs text-stone-200 font-semibold">Farinha de Trigo Principal:</span>
                    <p className="text-[11px] text-stone-400">Todos os outros ingredientes se ajustam automaticamente a esse peso.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="100"
                      step="50"
                      value={recipe.baseFlourWeight}
                      onChange={(e) => handleBaseFlourChange(parseFloat(e.target.value) || 0)}
                      className="w-32 bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-right font-mono text-base font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-sm font-mono text-stone-400">g</span>
                  </div>
                </div>

                {/* Quick scale shortcuts */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-stone-800/60 text-xs">
                  <span className="text-[11px] text-stone-400 font-medium">Tamanho da receita:</span>
                  <button
                    type="button"
                    onClick={() => handleBaseFlourChange(500)}
                    className="px-2.5 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold transition flex items-center gap-1"
                  >
                    <span>⭐ 500g</span>
                    <span className="text-[10px] text-amber-200/80">(Padrão: 2 pães médios)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBaseFlourChange(250)}
                    className="px-2.5 py-1 rounded-md bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 hover:border-amber-500/40 font-medium transition"
                  >
                    250g (1 pão pequeno ou bolo)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBaseFlourChange(1000)}
                    className="px-2.5 py-1 rounded-md bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 hover:border-amber-500/40 font-medium transition"
                  >
                    1.000g (1 kg - Fornada dupla)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBaseFlourChange(1500)}
                    className="px-2.5 py-1 rounded-md bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 hover:border-amber-500/40 font-medium transition"
                  >
                    1.500g (Fornada da família)
                  </button>
                </div>
              </div>
            )}

            {calcMode === 'total-dough' && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <span className="text-xs text-stone-300 font-medium">Peso Total da Massa Desejado (Crua):</span>
                  <p className="text-[11px] text-stone-400">O sistema recalcula a farinha e todos os insumos proporcionalmente.</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="200"
                    step="100"
                    value={Math.round(totalDoughInput)}
                    onChange={(e) => handleTotalDoughChange(parseFloat(e.target.value) || 0)}
                    className="w-36 bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-right font-mono text-base font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-sm font-mono text-stone-400">g</span>
                </div>
              </div>
            )}

            {calcMode === 'unit-yield' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center justify-between gap-2 bg-stone-900/60 p-2.5 rounded-lg border border-stone-800">
                  <span className="text-xs text-stone-300">Quantidade de Pães / Peças:</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      value={recipe.targetUnits}
                      onChange={(e) => handleUnitsYieldChange(parseInt(e.target.value) || 1, recipe.targetBakedWeightPerUnit)}
                      className="w-20 bg-stone-950 border border-stone-700 rounded-lg px-2 py-1 text-right font-mono text-sm font-bold text-amber-400 focus:outline-none"
                    />
                    <span className="text-xs text-stone-400">un</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 bg-stone-900/60 p-2.5 rounded-lg border border-stone-800">
                  <span className="text-xs text-stone-300">Peso Assado Alvo por Peça:</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="50"
                      step="50"
                      value={recipe.targetBakedWeightPerUnit}
                      onChange={(e) => handleUnitsYieldChange(recipe.targetUnits, parseFloat(e.target.value) || 100)}
                      className="w-24 bg-stone-950 border border-stone-700 rounded-lg px-2 py-1 text-right font-mono text-sm font-bold text-amber-400 focus:outline-none"
                    />
                    <span className="text-xs text-stone-400">g (assado)</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Key Laboratory Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-stone-900/80 border border-stone-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>Farinha de Trigo</span>
            <Layers className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white">
            {Math.round(recipe.baseFlourWeight)} <span className="text-sm font-normal text-stone-400">g</span>
          </div>
          <div className="text-[10px] text-amber-400/90 mt-1">
            {recipe.baseFlourWeight === 500 ? '⭐ Base 500g (2 Pães)' : `${recipe.baseFlourWeight}g (100%)`}
          </div>
        </div>

        <div className="bg-stone-900/80 border border-stone-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>Massa Crua Total</span>
            <Scale className="w-3.5 h-3.5 text-stone-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-amber-400">
            {Math.round(totalRawDoughWeight)} <span className="text-sm font-normal text-stone-400">g</span>
          </div>
          <div className="text-[10px] text-stone-400 mt-1">
            Rende {recipe.targetUnits} pães de ~{Math.round(totalRawDoughWeight / (recipe.targetUnits || 1))}g
          </div>
        </div>

        <div className="bg-stone-900/80 border border-stone-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>Água / Líquidos</span>
            <Droplet className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-cyan-400">
            {hydration.formulaHydrationPct.toFixed(0)} <span className="text-sm font-normal text-stone-400">%</span>
          </div>
          <div className="text-[10px] text-stone-400 mt-1">
            {hydration.formulaWaterWeight > 0 ? `${Math.round(hydration.formulaWaterWeight)}g de água/leite` : 'Sem líquidos extras'}
          </div>
        </div>

        <div className="bg-stone-900/80 border border-stone-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>Pães no Forno</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-400">
            {recipe.targetUnits} <span className="text-sm font-normal text-stone-400">{recipe.targetUnits === 1 ? 'unidade' : 'unidades'}</span>
          </div>
          <div className="text-[10px] text-stone-400 mt-1">
            ~{Math.round(recipe.targetBakedWeightPerUnit)}g cada assado
          </div>
        </div>
      </div>

      {/* Hydro-Engine Scientific Explanation */}
      {hydration.flourFromPreferment > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-200">
          <Info className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <strong className="font-semibold text-amber-300">Auditoria Hidro-Dinâmica de Pré-fermento:</strong>
            <p className="mt-0.5 text-amber-200/90 leading-relaxed">
              O pré-fermento (Levain/Poolish) contém <span className="font-mono font-bold">{hydration.flourFromPreferment.toFixed(0)}g</span> de farinha e <span className="font-mono font-bold">{hydration.liquidFromPreferment.toFixed(0)}g</span> de água. A hidratação de bancada sobe de <span className="font-mono font-bold">{hydration.formulaHydrationPct.toFixed(1)}%</span> para <span className="font-mono font-bold">{hydration.trueGlobalHydrationPct.toFixed(1)}%</span> global real.
            </p>
          </div>
        </div>
      )}

      {/* View Switcher: Table vs AST */}
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex p-1 rounded-xl bg-stone-900 border border-stone-800 text-xs">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
              viewMode === 'table'
                ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Tabela de Insumos</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('ast')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
              viewMode === 'ast'
                ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <GitFork className="w-3.5 h-3.5" />
            <span>Árvore AST Determinística (Nós & Ramos)</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-stone-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Nó Raiz: 1.000g = 100% (Motor AST Ativo)</span>
        </div>
      </div>

      {viewMode === 'ast' ? (
        <ASTVisualizer recipe={recipe} />
      ) : (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-6 border-b border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>🧺 O que Você Vai Precisar (Ingredientes & Medidas)</span>
              <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono border border-amber-500/20">
                {recipe.ingredients.length} itens simples
              </span>
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">
              Receita com medidas caseiras (xícaras e colheres) e o peso exato em gramas para não errar.
            </p>
          </div>

          <button
            onClick={() => handleAddIngredient()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar Ingrediente
          </button>
        </div>

        {/* Quick Add Presets Bar */}
        <div className="bg-stone-950/60 px-4 py-2 border-b border-stone-800/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs">
          <span className="text-[11px] text-stone-400 shrink-0 font-medium">Adicionar Rápido:</span>
          {quickPicks.map((pick, idx) => (
            <button
              key={idx}
              onClick={() => handleAddIngredient(pick.data)}
              className="px-2.5 py-1 rounded-md bg-stone-800/70 hover:bg-stone-700/80 text-stone-300 text-[11px] font-medium border border-stone-700/60 whitespace-nowrap transition"
            >
              {pick.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-950/90 text-stone-400 border-b border-stone-800 uppercase font-mono tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Ingrediente</th>
                <th className="py-3 px-3">Medida Caseira da Vovó</th>
                <th className="py-3 px-3 text-right">Peso Exato (g)</th>
                <th className="py-3 px-3 text-right">Proporção (%)</th>
                <th className="py-3 px-3 text-right">Preço (R$/kg)</th>
                <th className="py-3 px-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60 font-sans">
              {recipe.ingredients.map((ing) => {
                const isBaseFlour = ing.isFlour && ing.percentage === 100;
                const householdEstimate = getHouseholdMeasureEstimate(ing.name, ing.category, ing.weight);
                return (
                  <tr 
                    key={ing.id}
                    className="hover:bg-stone-800/30 transition group"
                  >
                    {/* Name */}
                    <td className="py-2.5 px-4 min-w-[180px]">
                      <input
                        type="text"
                        value={ing.name}
                        onChange={(e) => handleIngredientChange(ing.id, 'name', e.target.value)}
                        className="w-full bg-transparent text-white font-medium focus:outline-none focus:text-amber-300"
                      />
                      {ing.notes && (
                        <div className="text-[11px] text-stone-400 mt-0.5">{ing.notes}</div>
                      )}
                    </td>

                    {/* Household Measure */}
                    <td className="py-2.5 px-3 min-w-[200px]">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 font-medium text-xs border border-amber-500/20">
                        {householdEstimate}
                      </span>
                    </td>

                    {/* Weight (g) */}
                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <input
                          type="number"
                          step="1"
                          value={Math.round(ing.weight * 10) / 10}
                          onChange={(e) => handleIngredientChange(ing.id, 'weight', e.target.value)}
                          className="w-20 bg-stone-950 border border-stone-800 rounded px-2 py-1 text-right font-mono text-white font-bold focus:outline-none focus:border-amber-500"
                        />
                        <span className="font-mono text-stone-400 text-[11px]">g</span>
                      </div>
                    </td>

                    {/* Baker's % */}
                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <input
                          type="number"
                          step="0.1"
                          value={ing.percentage}
                          disabled={isBaseFlour && recipe.ingredients.filter(i => i.isFlour).length === 1}
                          onChange={(e) => handleIngredientChange(ing.id, 'percentage', e.target.value)}
                          className="w-16 bg-stone-950 border border-stone-800 rounded px-2 py-1 text-right font-mono text-amber-400 font-bold focus:outline-none focus:border-amber-500 disabled:opacity-75"
                        />
                        <span className="font-mono text-stone-400 text-[11px]">%</span>
                      </div>
                    </td>

                    {/* Cost per Kg */}
                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <span className="text-[10px] text-stone-400">R$</span>
                        <input
                          type="number"
                          step="0.5"
                          value={ing.costPerKg}
                          onChange={(e) => handleIngredientChange(ing.id, 'costPerKg', parseFloat(e.target.value) || 0)}
                          className="w-16 bg-stone-950 border border-stone-800 rounded px-2 py-1 text-right font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveIngredient(ing.id)}
                        className="p-1 rounded text-stone-400 hover:text-red-400 hover:bg-red-500/10 transition"
                        title="Remover ingrediente"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-stone-950/90 font-mono text-xs border-t border-stone-800 font-bold">
              <tr>
                <td className="py-3 px-4 text-stone-300">
                  PESO TOTAL DA MASSA:
                </td>
                <td className="py-3 px-3 text-amber-300 font-sans text-xs font-normal">
                  Rendimento: {recipe.targetUnits} pães médios caseiros
                </td>
                <td className="py-3 px-3 text-right text-white">
                  {Math.round(totalRawDoughWeight)} g
                </td>
                <td className="py-3 px-3 text-right text-amber-400">
                  {recipe.ingredients.reduce((acc, i) => acc + i.percentage, 0).toFixed(1)}%
                </td>
                <td colSpan={2} className="py-3 px-3 text-stone-400 font-sans text-[11px] text-right font-normal">
                  ~{Math.round(totalRawDoughWeight / (recipe.targetUnits || 1))}g por pão cru
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      )}

      {/* Production Process Steps Timeline */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-amber-400" />
          <span>👩‍🍳 Como Fazer: Passo a Passo Detalhado da Vovó</span>
        </h3>

        <div className="space-y-3">
          {recipe.steps.map((step, idx) => (
            <div 
              key={step.id} 
              className="p-4 rounded-xl bg-stone-950/60 border border-stone-800/80 flex flex-col md:flex-row md:items-start justify-between gap-4"
            >
              <div className="flex items-start gap-3 flex-1">
                <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 font-mono text-xs font-bold flex items-center justify-center shrink-0 border border-amber-500/30">
                  {idx + 1}
                </span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-stone-200 text-sm">{step.name}</h4>
                    {step.durationMinutes > 0 && (
                      <span className="px-2 py-0.5 rounded bg-stone-800 text-stone-300 font-mono text-[11px]">
                        {step.durationMinutes >= 60 ? `${(step.durationMinutes / 60).toFixed(1)} h` : `${step.durationMinutes} min`}
                      </span>
                    )}
                    {step.temperature && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono text-[11px] border border-amber-500/20">
                        {step.temperature}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                    {step.description}
                  </p>
                  {step.criticalControlPoint && (
                    <div className="mt-2 text-[11px] text-amber-300/90 bg-amber-950/30 border border-amber-900/40 rounded px-2.5 py-1">
                      <strong className="text-amber-400">💡 Segredo da Vovó:</strong> {step.criticalControlPoint}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
