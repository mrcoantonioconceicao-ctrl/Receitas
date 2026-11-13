import React, { useState, useEffect } from 'react';
import {
  Recipe,
  Ingredient,
  CalculationMode,
} from '../types';
import {
  calculateHydrationMetrics,
  scaleRecipeByBaseFlour,
  scaleRecipeByTotalDoughWeight,
  syncFloursAndPercentages,
  calculateCoherentTargetUnits,
  getHouseholdMeasureEstimate,
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
  CheckCircle2,
  Table,
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

  const totalRawDoughWeight = recipe.ingredients.reduce((sum, ing) => sum + ing.weight, 0);

  // Local text drafts so typing multi-digit numbers (like "1000" or "850") never corrupts weights mid-keystroke
  const [flourDraft, setFlourDraft] = useState<string>(String(Math.round(recipe.baseFlourWeight)));
  const [totalDoughDraft, setTotalDoughDraft] = useState<string>(String(Math.round(totalRawDoughWeight)));
  const [unitsDraft, setUnitsDraft] = useState<string>(String(recipe.targetUnits));
  const [bakedWeightDraft, setBakedWeightDraft] = useState<string>(
    String(Math.round(recipe.targetBakedWeightPerUnit))
  );

  useEffect(() => {
    setFlourDraft(String(Math.round(recipe.baseFlourWeight)));
  }, [recipe.baseFlourWeight]);

  useEffect(() => {
    setTotalDoughDraft(String(Math.round(totalRawDoughWeight)));
  }, [totalRawDoughWeight]);

  useEffect(() => {
    setUnitsDraft(String(recipe.targetUnits));
  }, [recipe.targetUnits]);

  useEffect(() => {
    setBakedWeightDraft(String(Math.round(recipe.targetBakedWeightPerUnit)));
  }, [recipe.targetBakedWeightPerUnit]);

  const hydration = calculateHydrationMetrics(recipe.ingredients, recipe.baseFlourWeight);

  // Handle base flour weight change with coherent domestic unit yield
  const handleBaseFlourChange = (newFlour: number) => {
    if (newFlour < 50) return;
    setRecipe((prev) => {
      const prevRawTotal = prev.ingredients.reduce((s, i) => s + i.weight, 0);
      const updatedIngredients = scaleRecipeByBaseFlour(prev.ingredients, newFlour);
      const newRawTotal = updatedIngredients.reduce((s, i) => s + i.weight, 0);
      const coherentUnits = calculateCoherentTargetUnits(
        prev.type,
        newRawTotal,
        prev.targetUnits,
        prevRawTotal
      );
      const bakeLoss = prev.costing.bakeLossPercentage || 12;
      const newBakedUnitWeight = Math.round((newRawTotal * (1 - bakeLoss / 100)) / coherentUnits);
      return {
        ...prev,
        baseFlourWeight: newFlour,
        targetUnits: coherentUnits,
        targetBakedWeightPerUnit: newBakedUnitWeight,
        ingredients: updatedIngredients,
      };
    });
  };

  // Handle total dough weight change
  const applyTotalDoughScale = (
    newTotal: number,
    explicitUnits?: number,
    explicitBakedWeight?: number
  ) => {
    if (newTotal < 50) return;
    setRecipe((prev) => {
      const prevRawTotal = prev.ingredients.reduce((s, i) => s + i.weight, 0);
      const { ingredients: scaled, newBaseFlourWeight } = scaleRecipeByTotalDoughWeight(
        prev.ingredients,
        newTotal
      );
      const units =
        explicitUnits ??
        calculateCoherentTargetUnits(prev.type, newTotal, prev.targetUnits, prevRawTotal);
      const bakeLoss = prev.costing.bakeLossPercentage || 12;
      const bakedPerUnit =
        explicitBakedWeight ?? Math.round((newTotal * (1 - bakeLoss / 100)) / units);
      return {
        ...prev,
        baseFlourWeight: newBaseFlourWeight,
        targetUnits: units,
        targetBakedWeightPerUnit: bakedPerUnit,
        ingredients: scaled,
      };
    });
  };

  // Handle units yield change (keeps unit weights within realistic domestic range)
  const handleUnitsYieldChange = (units: number, targetBakedWeight: number) => {
    if (units < 1 || targetBakedWeight < 35) return;
    const safeUnits = Math.round(units);
    const bakeLoss = recipe.costing.bakeLossPercentage || 12;
    const rawUnitWeight = targetBakedWeight / Math.max(0.5, 1 - bakeLoss / 100);
    const newTotalDough = safeUnits * rawUnitWeight;
    applyTotalDoughScale(Math.round(newTotalDough), safeUnits, Math.round(targetBakedWeight));
  };

  // Update single ingredient percentage or weight
  const handleIngredientChange = (id: string, field: keyof Ingredient, value: any) => {
    setRecipe((prev) => {
      let editedFlourWeight = false;
      const updated = prev.ingredients.map((ing) => {
        if (ing.id !== id) return ing;

        const updatedIng = { ...ing, [field]: value };

        if (field === 'percentage') {
          const numPct = Math.max(0, parseFloat(value) || 0);
          updatedIng.percentage = numPct;
          updatedIng.weight = Math.round(((prev.baseFlourWeight * numPct) / 100) * 10) / 10;
        }

        if (field === 'weight') {
          const numWeight = Math.max(0, parseFloat(value) || 0);
          updatedIng.weight = numWeight;
          if (ing.isFlour) {
            editedFlourWeight = true;
          } else {
            updatedIng.percentage =
              prev.baseFlourWeight > 0
                ? Math.round(((numWeight / prev.baseFlourWeight) * 100) * 10) / 10
                : 0;
          }
        }

        return updatedIng;
      });

      const syncedResult = editedFlourWeight
        ? syncFloursAndPercentages(updated, prev.baseFlourWeight)
        : { ingredients: updated, baseFlourWeight: prev.baseFlourWeight };

      const newRawTotal = syncedResult.ingredients.reduce((s, i) => s + i.weight, 0);
      const bakeLoss = prev.costing.bakeLossPercentage || 12;
      const units = Math.max(1, prev.targetUnits || 1);

      return {
        ...prev,
        baseFlourWeight: syncedResult.baseFlourWeight,
        targetBakedWeightPerUnit: Math.round((newRawTotal * (1 - bakeLoss / 100)) / units),
        ingredients: syncedResult.ingredients,
      };
    });
  };

  // Add new ingredient
  const handleAddIngredient = (preset?: Partial<Ingredient>) => {
    setRecipe((prev) => {
      const newId = `ing-${Date.now()}`;
      const pct = preset?.percentage || 0;
      const newIng: Ingredient = {
        id: newId,
        name: preset?.name || 'Novo Ingrediente',
        category: preset?.category || 'other',
        percentage: pct,
        weight: pct ? Math.round(((prev.baseFlourWeight * pct) / 100) * 10) / 10 : 0,
        isFlour: preset?.isFlour ?? false,
        isPreferment: preset?.isPreferment ?? false,
        prefermentHydration: preset?.prefermentHydration,
        costPerKg: preset?.costPerKg || 0,
        notes: preset?.notes,
      };

      const nextList = [...prev.ingredients, newIng];
      const synced = newIng.isFlour
        ? syncFloursAndPercentages(nextList, prev.baseFlourWeight)
        : { ingredients: nextList, baseFlourWeight: prev.baseFlourWeight };

      const newRawTotal = synced.ingredients.reduce((s, i) => s + i.weight, 0);
      const bakeLoss = prev.costing.bakeLossPercentage || 12;
      const units = Math.max(1, prev.targetUnits || 1);

      return {
        ...prev,
        baseFlourWeight: synced.baseFlourWeight,
        targetBakedWeightPerUnit: Math.round((newRawTotal * (1 - bakeLoss / 100)) / units),
        ingredients: synced.ingredients,
      };
    });
  };

  // Remove ingredient
  const handleRemoveIngredient = (id: string) => {
    setRecipe((prev) => {
      const removed = prev.ingredients.find((i) => i.id === id);
      const remaining = prev.ingredients.filter((i) => i.id !== id);
      const synced =
        removed?.isFlour && remaining.some((i) => i.isFlour)
          ? syncFloursAndPercentages(remaining, prev.baseFlourWeight)
          : { ingredients: remaining, baseFlourWeight: prev.baseFlourWeight };

      const newRawTotal = synced.ingredients.reduce((s, i) => s + i.weight, 0);
      const bakeLoss = prev.costing.bakeLossPercentage || 12;
      const units = Math.max(1, prev.targetUnits || 1);

      return {
        ...prev,
        baseFlourWeight: synced.baseFlourWeight,
        targetBakedWeightPerUnit: Math.round((newRawTotal * (1 - bakeLoss / 100)) / units),
        ingredients: synced.ingredients,
      };
    });
  };

  // Quick preset ingredients (home kitchen friendly)
  const quickPicks: { label: string; data: Partial<Ingredient> }[] = [
    { label: '+ Água', data: { name: 'Água Morninha', category: 'liquid', percentage: 60, costPerKg: 0.05 } },
    { label: '+ Leite', data: { name: 'Leite Integral', category: 'liquid', percentage: 60, costPerKg: 5.5 } },
    { label: '+ Sal', data: { name: 'Sal de Cozinha', category: 'salt', percentage: 1.6, costPerKg: 2.5 } },
    { label: '+ Fermento Seco', data: { name: 'Fermento Biológico Seco', category: 'ferment', percentage: 1.0, costPerKg: 35.0 } },
    { label: '+ Fermento de Bolo', data: { name: 'Fermento Químico em Pó', category: 'ferment', percentage: 3.0, costPerKg: 28.0 } },
    { label: '+ Ovos', data: { name: 'Ovos Médios', category: 'egg', percentage: 20, costPerKg: 16.0 } },
    { label: '+ Manteiga', data: { name: 'Manteiga em Pomada', category: 'fat', percentage: 10, costPerKg: 28.0 } },
    { label: '+ Óleo', data: { name: 'Óleo de Cozinha', category: 'fat', percentage: 8, costPerKg: 8.0 } },
    { label: '+ Açúcar', data: { name: 'Açúcar Cristal', category: 'sugar', percentage: 6, costPerKg: 4.5 } },
    { label: '+ Farinha Integral', data: { name: 'Farinha de Trigo Integral', category: 'flour', percentage: 20, isFlour: true, costPerKg: 8.5 } },
  ];

  const safeUnits = Math.max(1, recipe.targetUnits || 1);
  const rawPerUnit = Math.round(totalRawDoughWeight / safeUnits);
  const isCuca = recipe.name.toLowerCase().includes('cuca');
  const unitWord = isCuca
    ? safeUnits === 1
      ? 'cuca'
      : 'cucas'
    : recipe.type === 'cake'
    ? safeUnits === 1
      ? 'bolo'
      : 'bolos'
    : safeUnits === 1
    ? 'pão médio'
    : 'pães médios';

  const typeLabel = isCuca
    ? 'Cuca Caseira'
    : recipe.type === 'cake'
    ? 'Bolo Caseiro'
    : recipe.type === 'pastry'
    ? 'Massa Doce / Rosca'
    : 'Pão Caseiro';

  return (
    <div className="space-y-6">
      {/* Recipe Header & Sizing */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2 text-xs text-stone-400">
              <span className="font-semibold text-amber-400">
                {recipe.category || 'Receita Caseira'}
              </span>
              <span aria-hidden="true">·</span>
              <span>{typeLabel}</span>
            </div>
            <input
              type="text"
              value={recipe.name}
              onChange={(e) => setRecipe({ ...recipe, name: e.target.value })}
              className="text-2xl font-bold bg-transparent text-white border-b border-transparent hover:border-stone-700 focus:border-amber-500 focus:outline-none w-full transition"
            />
            <p className="text-sm text-stone-400 line-clamp-2">{recipe.description}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenAudit}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold transition"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              Dicas da Vovó
            </button>
          </div>
        </div>

        {/* Calculation Mode Selector */}
        <div className="mt-6 pt-6 border-t border-stone-800/80">
          <label className="text-xs font-semibold text-stone-300 block mb-2.5">
            Como você prefere ajustar o tamanho da receita:
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
              <Layers className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <div className="text-left font-bold">1. Pela Quantidade de Farinha</div>
                <div className="text-[10px] text-stone-400 font-normal">500g (2 pães) ou 1 kg</div>
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
              <Scale className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <div className="text-left font-bold">2. Pelo Peso Total da Massa</div>
                <div className="text-[10px] text-stone-400 font-normal">Ex: 1.750g para 2 pães de ~875g</div>
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
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <div className="text-left font-bold">3. Por Número de Pães / Peças</div>
                <div className="text-[10px] text-stone-400 font-normal">Ex: 2 pães de 800g cada</div>
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
                    <p className="text-[11px] text-stone-400">
                      Todos os outros ingredientes se ajustam na medida exata desse peso.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="50"
                      step="50"
                      value={flourDraft}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFlourDraft(val);
                        const num = parseFloat(val);
                        if (!isNaN(num) && num >= 50) {
                          handleBaseFlourChange(num);
                        }
                      }}
                      onBlur={() => setFlourDraft(String(Math.round(recipe.baseFlourWeight)))}
                      className="w-32 bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-right font-mono text-base font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-sm font-mono text-stone-400">g</span>
                  </div>
                </div>

                {/* Quick scale shortcuts */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-stone-800/60 text-xs">
                  <span className="text-[11px] text-stone-400 font-medium">Tamanho rápido:</span>
                  <button
                    type="button"
                    onClick={() => handleBaseFlourChange(500)}
                    className="px-2.5 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold transition flex items-center gap-1"
                  >
                    <span>⭐ 500g</span>
                    <span className="text-[10px] text-amber-200/80">(2 pães de ~440g)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBaseFlourChange(250)}
                    className="px-2.5 py-1 rounded-md bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 hover:border-amber-500/40 font-medium transition"
                  >
                    250g (1 pão de ~440g)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBaseFlourChange(1000)}
                    className="px-2.5 py-1 rounded-md bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 hover:border-amber-500/40 font-medium transition"
                  >
                    1.000g / 1 kg (2 pães grandes de ~880g)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBaseFlourChange(1500)}
                    className="px-2.5 py-1 rounded-md bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 hover:border-amber-500/40 font-medium transition"
                  >
                    1.500g (3 pães grandes de ~880g)
                  </button>
                </div>
              </div>
            )}

            {calcMode === 'total-dough' && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <span className="text-xs text-stone-300 font-medium">
                    Peso Total da Massa Desejado (antes de assar):
                  </span>
                  <p className="text-[11px] text-stone-400">
                    Por exemplo: 1.750g de massa rende 2 pães médios de cerca de 875g cada.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="100"
                    step="50"
                    value={totalDoughDraft}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTotalDoughDraft(val);
                      const num = parseFloat(val);
                      if (!isNaN(num) && num >= 100) {
                        applyTotalDoughScale(num);
                      }
                    }}
                    onBlur={() => setTotalDoughDraft(String(Math.round(totalRawDoughWeight)))}
                    className="w-36 bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-right font-mono text-base font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-sm font-mono text-stone-400">g</span>
                </div>
              </div>
            )}

            {calcMode === 'unit-yield' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center justify-between gap-2 bg-stone-900/60 p-2.5 rounded-lg border border-stone-800">
                  <span className="text-xs text-stone-300">Quantos Pães / Bolos Fazer:</span>
                  <div className="flex items-center gap-1.5">
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
                          handleUnitsYieldChange(num, recipe.targetBakedWeightPerUnit);
                        }
                      }}
                      onBlur={() => setUnitsDraft(String(recipe.targetUnits))}
                      className="w-20 bg-stone-950 border border-stone-700 rounded-lg px-2 py-1 text-right font-mono text-sm font-bold text-amber-400 focus:outline-none"
                    />
                    <span className="text-xs text-stone-400">un</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 bg-stone-900/60 p-2.5 rounded-lg border border-stone-800">
                  <span className="text-xs text-stone-300">Peso de Cada Unidade Assada:</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="40"
                      step="50"
                      value={bakedWeightDraft}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBakedWeightDraft(val);
                        const num = parseFloat(val);
                        if (!isNaN(num) && num >= 40) {
                          handleUnitsYieldChange(recipe.targetUnits, num);
                        }
                      }}
                      onBlur={() =>
                        setBakedWeightDraft(String(Math.round(recipe.targetBakedWeightPerUnit)))
                      }
                      className="w-24 bg-stone-950 border border-stone-700 rounded-lg px-2 py-1 text-right font-mono text-sm font-bold text-amber-400 focus:outline-none"
                    />
                    <span className="text-xs text-stone-400">g</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Key Home Kitchen Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-stone-900/80 border border-stone-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>Farinha de Trigo</span>
            <Layers className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-white">
            {Math.round(recipe.baseFlourWeight)} <span className="text-sm font-normal text-stone-400">g</span>
          </div>
          <div className="text-[11px] text-amber-400/90 mt-1">
            {getHouseholdMeasureEstimate('Farinha de Trigo', 'flour', recipe.baseFlourWeight)}
          </div>
        </div>

        <div className="bg-stone-900/80 border border-stone-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>Massa Total (Crua)</span>
            <Scale className="w-3.5 h-3.5 text-stone-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-amber-400">
            {Math.round(totalRawDoughWeight)} <span className="text-sm font-normal text-stone-400">g</span>
          </div>
          <div className="text-[11px] text-stone-400 mt-1">
            {safeUnits} {unitWord} de ~{rawPerUnit}g cada
          </div>
        </div>

        <div className="bg-stone-900/80 border border-stone-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>Água ou Leite</span>
            <Droplet className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-cyan-400">
            {Math.round(hydration.formulaWaterWeight)}{' '}
            <span className="text-sm font-normal text-stone-400">ml</span>
          </div>
          <div className="text-[11px] text-stone-400 mt-1">
            {hydration.formulaWaterWeight > 0
              ? getHouseholdMeasureEstimate('Água/Leite', 'liquid', hydration.formulaWaterWeight)
              : 'Sem líquidos extras'}
          </div>
        </div>

        <div className="bg-stone-900/80 border border-stone-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>Rendimento Assado</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-emerald-400">
            {safeUnits} <span className="text-sm font-normal text-stone-400">{unitWord}</span>
          </div>
          <div className="text-[11px] text-stone-400 mt-1">
            ~{Math.round(recipe.targetBakedWeightPerUnit)}g cada depois de assado
          </div>
        </div>
      </div>

      {/* Gentle Pre-mix note if user manually adds a pre-ferment */}
      {hydration.flourFromPreferment > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-200">
          <Info className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <strong className="font-semibold text-amber-300">Mistura Prévia (Esponja Caseira):</strong>
            <p className="mt-0.5 text-amber-200/90 leading-relaxed">
              Essa misturinha prévia já leva{' '}
              <span className="font-mono font-bold">{hydration.flourFromPreferment.toFixed(0)}g</span> de
              farinha e{' '}
              <span className="font-mono font-bold">{hydration.liquidFromPreferment.toFixed(0)}g</span> de
              água para deixar a massa ainda mais macia e saborosa.
            </p>
          </div>
        </div>
      )}

      {/* View Switcher: Simple List vs Grouped Summary */}
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
            <span>Lista de Ingredientes</span>
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
            <Layers className="w-3.5 h-3.5" />
            <span>Resumo por Grupos</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-stone-400">
          <span>
            Receita ajustada para {Math.round(recipe.baseFlourWeight)}g de farinha ({safeUnits}{' '}
            {unitWord})
          </span>
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
                <span className="text-xs text-stone-400 font-normal">
                  · {recipe.ingredients.length} itens simples
                </span>
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                Medidas caseiras fáceis (xícaras e colheres) junto com o peso exato em gramas para não errar.
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
                  const householdEstimate = getHouseholdMeasureEstimate(
                    ing.name,
                    ing.category,
                    ing.weight
                  );
                  return (
                    <tr key={ing.id} className="hover:bg-stone-800/30 transition group">
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
                      <td className="py-2.5 px-3 text-right tabular-nums">
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

                      {/* Percentage */}
                      <td className="py-2.5 px-3 text-right tabular-nums">
                        <div className="inline-flex items-center justify-end gap-1">
                          <input
                            type="number"
                            step="0.1"
                            value={ing.percentage}
                            disabled={
                              isBaseFlour && recipe.ingredients.filter((i) => i.isFlour).length === 1
                            }
                            onChange={(e) =>
                              handleIngredientChange(ing.id, 'percentage', e.target.value)
                            }
                            className="w-16 bg-stone-950 border border-stone-800 rounded px-2 py-1 text-right font-mono text-amber-400 font-bold focus:outline-none focus:border-amber-500 disabled:opacity-75"
                          />
                          <span className="font-mono text-stone-400 text-[11px]">%</span>
                        </div>
                      </td>

                      {/* Cost per Kg */}
                      <td className="py-2.5 px-3 text-right tabular-nums">
                        <div className="inline-flex items-center justify-end gap-1">
                          <span className="text-[10px] text-stone-400">R$</span>
                          <input
                            type="number"
                            step="0.5"
                            value={ing.costPerKg}
                            onChange={(e) =>
                              handleIngredientChange(
                                ing.id,
                                'costPerKg',
                                parseFloat(e.target.value) || 0
                              )
                            }
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
              <tfoot className="bg-stone-950/90 font-mono text-xs border-t border-stone-800 font-bold tabular-nums">
                <tr>
                  <td className="py-3 px-4 text-stone-300">PESO TOTAL DA MASSA:</td>
                  <td className="py-3 px-3 text-amber-300 font-sans text-xs font-normal">
                    Rende {safeUnits} {unitWord} de ~{rawPerUnit}g cada
                  </td>
                  <td className="py-3 px-3 text-right text-white">
                    {Math.round(totalRawDoughWeight)} g
                  </td>
                  <td className="py-3 px-3 text-right text-amber-400">
                    {recipe.ingredients.reduce((acc, i) => acc + i.percentage, 0).toFixed(1)}%
                  </td>
                  <td
                    colSpan={2}
                    className="py-3 px-3 text-stone-400 font-sans text-[11px] text-right font-normal"
                  >
                    ~{Math.round(recipe.targetBakedWeightPerUnit)}g cada depois de assado
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
                        {step.durationMinutes >= 60
                          ? `${(step.durationMinutes / 60).toFixed(1)} h`
                          : `${step.durationMinutes} min`}
                      </span>
                    )}
                    {step.temperature && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono text-[11px] border border-amber-500/20">
                        {step.temperature}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-300 mt-1 leading-relaxed">{step.description}</p>
                  {step.criticalControlPoint && (
                    <div className="mt-2 text-[11px] text-amber-300/90 bg-amber-950/30 border border-amber-900/40 rounded px-2.5 py-1">
                      <strong className="text-amber-400">💡 Segredo da Vovó:</strong>{' '}
                      {step.criticalControlPoint}
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
