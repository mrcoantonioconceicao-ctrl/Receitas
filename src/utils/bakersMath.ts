import { ClimateSettings, CostingSettings, Ingredient, Recipe } from '../types';

export interface HydrationAnalysis {
  formulaWaterWeight: number;
  formulaHydrationPct: number;
  totalFlourWeight: number; // including preferments
  totalLiquidWeight: number; // including preferments, eggs (75% water), milk (88% water)
  trueGlobalHydrationPct: number;
  flourFromPreferment: number;
  liquidFromPreferment: number;
}

export interface DDTResult {
  waterTempTarget: number;
  needsIce: boolean;
  iceWeight: number; // grams
  liquidWaterWeight: number; // grams
  warningMessage?: string;
}

export interface CostingAnalysis {
  directIngredientsCost: number; // R$
  packagingTotalCost: number; // R$
  energyGasCost: number; // R$
  laborOverheadCost: number; // R$
  totalBatchCost: number; // R$
  rawBatchWeight: number; // grams
  bakedBatchWeight: number; // grams after bake loss
  unitsYield: number;
  rawUnitWeight: number; // grams
  bakedUnitWeight: number; // grams
  unitDirectCost: number; // R$ insumos por unidade
  unitTotalCost: number; // R$ custo total por unidade
  suggestedSalePriceMarkup: number; // R$ (markup formula)
  suggestedSalePriceMargin: number; // R$ (target margin % formula)
  grossProfitPerUnit: number; // R$
  grossMarginPercent: number; // %
}

/**
 * Calculates hydration metrics including true global hydration with preferments
 */
export function calculateHydrationMetrics(
  ingredients: Ingredient[],
  baseFlourWeight: number
): HydrationAnalysis {
  let formulaWaterWeight = 0;
  let totalFlourWeight = 0;
  let totalLiquidWeight = 0;
  let flourFromPreferment = 0;
  let liquidFromPreferment = 0;

  let directFlourWeight = 0;

  ingredients.forEach((ing) => {
    if (ing.isFlour) {
      directFlourWeight += ing.weight;
      totalFlourWeight += ing.weight;
    }

    if (ing.category === 'liquid') {
      formulaWaterWeight += ing.weight;
      // Milk has ~88% water, but standard assumption is 100% liquid unless specified
      totalLiquidWeight += ing.weight;
    } else if (ing.category === 'egg') {
      // Whole egg is approximately 75% water
      totalLiquidWeight += ing.weight * 0.75;
    }

    if (ing.isPreferment) {
      const hydr = ing.prefermentHydration || 100; // default 100% hydration (e.g. 50% flour, 50% water)
      // weight = flour + water => water = flour * (hydr/100) => weight = flour * (1 + hydr/100)
      const pFlour = ing.weight / (1 + hydr / 100);
      const pWater = ing.weight - pFlour;
      flourFromPreferment += pFlour;
      liquidFromPreferment += pWater;
      totalFlourWeight += pFlour;
      totalLiquidWeight += pWater;
    }
  });

  const effectiveBaseFlour = directFlourWeight > 0 ? directFlourWeight : baseFlourWeight;
  const effectiveTotalFlour = totalFlourWeight > 0 ? totalFlourWeight : effectiveBaseFlour;

  const formulaHydrationPct = effectiveBaseFlour > 0 ? (formulaWaterWeight / effectiveBaseFlour) * 100 : 0;
  const trueGlobalHydrationPct = effectiveTotalFlour > 0 ? (totalLiquidWeight / effectiveTotalFlour) * 100 : 0;

  return {
    formulaWaterWeight,
    formulaHydrationPct,
    totalFlourWeight,
    totalLiquidWeight,
    trueGlobalHydrationPct,
    flourFromPreferment,
    liquidFromPreferment,
  };
};

/**
 * Calculates water temperature based on Desired Dough Temperature (DDT)
 * and ice requirement if tap water is too warm.
 */
export function calculateDDT(
  climate: ClimateSettings,
  totalWaterWeight: number
): DDTResult {
  const {
    roomTemp,
    flourTemp,
    desiredDoughTemp,
    hasPreferment,
    prefermentTemp,
    frictionFactor,
    tapWaterTemp,
  } = climate;

  let waterTempTarget = 0;

  if (hasPreferment) {
    // 4-factor formula: (4 * DDT) - (Room + Flour + Preferment + Friction)
    waterTempTarget = 4 * desiredDoughTemp - (roomTemp + flourTemp + prefermentTemp + frictionFactor);
  } else {
    // 3-factor formula: (3 * DDT) - (Room + Flour + Friction)
    waterTempTarget = 3 * desiredDoughTemp - (roomTemp + flourTemp + frictionFactor);
  }

  // Check if ice is needed
  // If required water temp is lower than tap water temp
  let needsIce = waterTempTarget < tapWaterTemp;
  let iceWeight = 0;
  let liquidWaterWeight = totalWaterWeight;
  let warningMessage: string | undefined;

  if (needsIce && totalWaterWeight > 0) {
    if (waterTempTarget < 0) {
      // Dia muito quente ou sova forte: explique em linguagem simples de cozinha
      warningMessage = `Hoje está bem calor! Para a massa não esquentar demais, use água bem geladinha da geladeira (e até umas pedrinhas de gelo) ou deixe a tigela uns minutinhos na geladeira antes de começar.`;
      iceWeight = Math.min(totalWaterWeight * 0.85, totalWaterWeight);
      liquidWaterWeight = totalWaterWeight - iceWeight;
    } else {
      // Latent heat of fusion formula:
      // Ice mass = Total water * (Tap temp - Target water temp) / (80 + Tap temp)
      const denominator = 80 + tapWaterTemp;
      const numerator = tapWaterTemp - waterTempTarget;
      const iceRatio = Math.max(0, numerator / denominator);
      iceWeight = Math.round(totalWaterWeight * Math.min(iceRatio, 0.95));
      liquidWaterWeight = Math.max(0, totalWaterWeight - iceWeight);
    }
  }

  return {
    waterTempTarget,
    needsIce,
    iceWeight,
    liquidWaterWeight,
    warningMessage,
  };
};

/**
 * Calculates complete batch costs, yield, bake loss, and pricing margins
 */
export function calculateCosting(
  ingredients: Ingredient[],
  costing: CostingSettings,
  targetUnits: number,
  targetBakedWeightPerUnit: number
): CostingAnalysis {
  let directIngredientsCost = 0;
  let rawBatchWeight = 0;

  ingredients.forEach((ing) => {
    rawBatchWeight += ing.weight;
    const costKg = ing.costPerKg || 0;
    directIngredientsCost += (ing.weight / 1000) * costKg;
  });

  const bakeLossFactor = Math.max(0.5, 1 - costing.bakeLossPercentage / 100);
  const bakedBatchWeight = rawBatchWeight * bakeLossFactor;

  // If user provided a target baked weight, compute how many units the batch really yields
  const computedUnitsFromWeight = targetBakedWeightPerUnit > 0 
    ? bakedBatchWeight / targetBakedWeightPerUnit 
    : targetUnits;

  const unitsYield = targetUnits > 0 ? targetUnits : Math.max(1, Math.round(computedUnitsFromWeight));
  const rawUnitWeight = unitsYield > 0 ? rawBatchWeight / unitsYield : 0;
  const bakedUnitWeight = unitsYield > 0 ? bakedBatchWeight / unitsYield : 0;

  const packagingTotalCost = unitsYield * (costing.packagingCostPerUnit || 0);
  const energyGasCost = costing.energyGasCostPerBatch || 0;
  const laborOverheadCost = directIngredientsCost * ((costing.laborOverheadPercentage || 0) / 100);

  const totalBatchCost = directIngredientsCost + packagingTotalCost + energyGasCost + laborOverheadCost;

  const unitDirectCost = unitsYield > 0 ? directIngredientsCost / unitsYield : 0;
  const unitTotalCost = unitsYield > 0 ? totalBatchCost / unitsYield : 0;

  // Suggested price based on Professional Bakery Markup (e.g. 3.5x over direct ingredients + packaging)
  const markupMultiplier = costing.markupMultiplier || 3.5;
  const suggestedSalePriceMarkup = (unitDirectCost * markupMultiplier) + (costing.packagingCostPerUnit || 0) + (unitTotalCost * 0.1);

  // Suggested price based on Target Margin % (e.g. 70%)
  const marginTargetDecimal = Math.min(0.95, (costing.targetMarginPercent || 70) / 100);
  const suggestedSalePriceMargin = unitTotalCost > 0 ? unitTotalCost / (1 - marginTargetDecimal) : suggestedSalePriceMarkup;

  const grossProfitPerUnit = suggestedSalePriceMarkup - unitTotalCost;
  const grossMarginPercent = suggestedSalePriceMarkup > 0 
    ? (grossProfitPerUnit / suggestedSalePriceMarkup) * 100 
    : 0;

  return {
    directIngredientsCost,
    packagingTotalCost,
    energyGasCost,
    laborOverheadCost,
    totalBatchCost,
    rawBatchWeight,
    bakedBatchWeight,
    unitsYield,
    rawUnitWeight,
    bakedUnitWeight,
    unitDirectCost,
    unitTotalCost,
    suggestedSalePriceMarkup,
    suggestedSalePriceMargin,
    grossProfitPerUnit,
    grossMarginPercent,
  };
};

/**
 * Scales an entire recipe's weights based on a new base flour weight
 */
export function scaleRecipeByBaseFlour(
  ingredients: Ingredient[],
  newBaseFlourWeight: number
): Ingredient[] {
  return ingredients.map((ing) => {
    const weight = Math.round((newBaseFlourWeight * ing.percentage) / 100 * 10) / 10;
    return {
      ...ing,
      weight,
    };
  });
};

/**
 * Scales recipe to reach an exact desired total raw dough weight
 */
export function scaleRecipeByTotalDoughWeight(
  ingredients: Ingredient[],
  targetTotalDoughWeight: number
): { ingredients: Ingredient[]; newBaseFlourWeight: number } {
  // Sum of percentages of all ingredients relative to base flour
  const sumPercentages = ingredients.reduce((sum, ing) => sum + ing.percentage, 0);
  if (sumPercentages <= 0) return { ingredients, newBaseFlourWeight: targetTotalDoughWeight };

  // Total Dough = BaseFlour * (sumPercentages / 100)
  // BaseFlour = Total Dough / (sumPercentages / 100)
  const newBaseFlourWeight = Math.round((targetTotalDoughWeight / (sumPercentages / 100)) * 10) / 10;
  const scaledIngredients = scaleRecipeByBaseFlour(ingredients, newBaseFlourWeight);

  return {
    ingredients: scaledIngredients,
    newBaseFlourWeight,
  };
};

/**
 * Recalculates baseFlourWeight from the sum of flour ingredients (isFlour === true)
 * and keeps every ingredient's percentage mathematically exact relative to total flour (100%).
 */
export function syncFloursAndPercentages(
  ingredients: Ingredient[],
  fallbackBaseFlour: number
): { ingredients: Ingredient[]; baseFlourWeight: number } {
  const flourSum = ingredients
    .filter((i) => i.isFlour)
    .reduce((sum, i) => sum + (i.weight || 0), 0);

  const baseFlourWeight = flourSum > 0 ? Math.round(flourSum * 10) / 10 : fallbackBaseFlour;

  const synced = ingredients.map((ing) => ({
    ...ing,
    percentage: baseFlourWeight > 0
      ? Math.round(((ing.weight / baseFlourWeight) * 100) * 10) / 10
      : 0,
  }));

  return { ingredients: synced, baseFlourWeight };
}

/**
 * Calculates a coherent, realistic domestic yield (number of loaves/cakes/rolls)
 * so recipes never show absurd tiny 2g units or unrealistic counts.
 * Example: ~1700g-1800g bread dough -> 2 medium/large home loaves of ~850g-900g each.
 */
export function calculateCoherentTargetUnits(
  recipeType: 'bread' | 'pastry' | 'cake',
  totalRawWeight: number,
  currentUnits?: number,
  previousRawWeight?: number
): number {
  if (totalRawWeight <= 0) return Math.max(1, currentUnits || 1);

  if (recipeType === 'cake') {
    return totalRawWeight > 1900 ? Math.max(1, Math.round(totalRawWeight / 1350)) : 1;
  }

  if (recipeType === 'pastry') {
    return totalRawWeight > 1150 ? Math.max(2, Math.round(totalRawWeight / 750)) : 1;
  }

  // Small dinner rolls / pastries (e.g. Pão de Minuto: ~45g-110g per roll)
  if (currentUnits && currentUnits >= 6 && previousRawWeight && previousRawWeight > 0) {
    const prevPerUnit = previousRawWeight / currentUnits;
    if (prevPerUnit >= 35 && prevPerUnit <= 150) {
      return Math.max(1, Math.round(totalRawWeight / prevPerUnit));
    }
  }

  // Standard home loaves: keep realistic loaf weights (~380g to ~950g raw dough per loaf)
  if (totalRawWeight <= 580) {
    return 1;
  }
  if (totalRawWeight <= 1900) {
    return 2; // 880g -> 2 loaves of ~440g; 1700g-1800g -> 2 loaves of ~850g-900g
  }
  return Math.max(2, Math.round(totalRawWeight / 850));
}

/**
 * Normalizes an AI-generated quick-formulate response so that:
 * - baseFlourWeight is strictly 500g (or data.baseFlourWeight if valid)
 * - Every ingredient weight & percentage is scaled consistently with zero 2x mismatch
 * - targetBakedWeightPerUnit matches raw batch weight and bakeLossPercentage
 */
export function normalizeQuickRecipe(
  data: any,
  fallbackName: string,
  defaultBaseFlour = 500
): Recipe {
  const targetBaseFlour =
    typeof data?.baseFlourWeight === 'number' && data.baseFlourWeight > 0
      ? data.baseFlourWeight
      : defaultBaseFlour;

  const rawIngredients: Ingredient[] = (data?.ingredients || []).map((ing: any, idx: number) => ({
    id: `ing-${Date.now()}-${idx}`,
    name: ing.name || 'Ingrediente',
    category: ing.category || 'other',
    percentage: Number(ing.percentage) || 0,
    weight: Number(ing.weight) || 0,
    isFlour: Boolean(ing.isFlour || ing.category === 'flour'),
    isPreferment: Boolean(ing.isPreferment),
    prefermentHydration: ing.prefermentHydration,
    costPerKg: Number(ing.costPerKg) || 5.0,
    notes: ing.notes,
  }));

  // Ensure at least one flour ingredient exists if AI omitted isFlour
  if (rawIngredients.length > 0 && !rawIngredients.some((i) => i.isFlour)) {
    rawIngredients[0].isFlour = true;
    rawIngredients[0].category = 'flour';
  }

  // Compute total flour weight returned by AI (or fallback from percentages)
  const aiFlourWeightSum = rawIngredients
    .filter((i) => i.isFlour)
    .reduce((s, i) => s + i.weight, 0);

  const aiFlourPctSum = rawIngredients
    .filter((i) => i.isFlour)
    .reduce((s, i) => s + i.percentage, 0);

  let normalizedIngredients: Ingredient[];

  if (aiFlourWeightSum > 0) {
    // Scale proportionally from AI weights so sum of flours === targetBaseFlour
    const scaleFactor = targetBaseFlour / aiFlourWeightSum;
    normalizedIngredients = rawIngredients.map((ing) => {
      const scaledWeight = Math.round(ing.weight * scaleFactor * 10) / 10;
      const pct = Math.round(((scaledWeight / targetBaseFlour) * 100) * 10) / 10;
      return {
        ...ing,
        weight: scaledWeight,
        percentage: pct,
      };
    });
  } else if (aiFlourPctSum > 0) {
    // Derive weights directly from percentages normalized so flours sum to 100%
    const pctScale = 100 / aiFlourPctSum;
    normalizedIngredients = rawIngredients.map((ing) => {
      const pct = Math.round(ing.percentage * pctScale * 10) / 10;
      const weight = Math.round(((targetBaseFlour * pct) / 100) * 10) / 10;
      return {
        ...ing,
        percentage: pct,
        weight,
      };
    });
  } else {
    normalizedIngredients = rawIngredients;
  }

  const normalizedFallback = fallbackName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const looksLikeCake =
    normalizedFallback.includes('bolo') ||
    normalizedFallback.includes('cuca') ||
    normalizedFallback.includes('pao de lo') ||
    normalizedFallback.includes('nega maluca') ||
    normalizedFallback.includes('prestigio') ||
    normalizedFallback.includes('milho cremoso') ||
    normalizedFallback.includes('laranja') ||
    normalizedFallback.includes('cenoura');

  const looksLikePastry =
    normalizedFallback.includes('massa podre') ||
    normalizedFallback.includes('empada') ||
    normalizedFallback.includes('empad') ||
    normalizedFallback.includes('torta') ||
    normalizedFallback.includes('lasanha') ||
    normalizedFallback.includes('macarrao');

  const recipeType: 'bread' | 'pastry' | 'cake' =
    data?.type || (looksLikeCake ? 'cake' : looksLikePastry ? 'pastry' : 'bread');
  const totalRawWeight = normalizedIngredients.reduce((s, i) => s + i.weight, 0);
  const rawAiUnits = Number(data?.targetUnits) || 0;
  const rawPerAiUnit = rawAiUnits > 0 && totalRawWeight > 0 ? totalRawWeight / rawAiUnits : 0;

  // Accept AI unit count only if each piece has a coherent weight (>= 40g for rolls, >= 200g for regular bread/cake/pastry)
  const minPieceWeight = recipeType === 'cake' ? 300 : rawAiUnits >= 6 ? 40 : 200;
  const targetUnits =
    rawAiUnits >= 1 && rawPerAiUnit >= minPieceWeight && rawPerAiUnit <= 1500
      ? Math.round(rawAiUnits)
      : calculateCoherentTargetUnits(recipeType, totalRawWeight);

  const bakeLossPercentage = Number(data?.costing?.bakeLossPercentage) || 12;
  const computedBakedUnitWeight =
    totalRawWeight > 0
      ? Math.round((totalRawWeight * (1 - bakeLossPercentage / 100)) / targetUnits)
      : Number(data?.targetBakedWeightPerUnit) || 389;

  return {
    id: `smart-${Date.now()}`,
    name: data?.name || fallbackName,
    type: recipeType,
    category: data?.category || 'Receita Tradicional de Vó',
    description:
      data?.description ||
      `Receita caseira simples e deliciosa feita com ${targetBaseFlour}g de farinha, rendendo ${targetUnits} ${targetUnits === 1 ? 'unidade' : 'pães médios'}.`,
    baseFlourWeight: targetBaseFlour,
    targetUnits,
    targetBakedWeightPerUnit: computedBakedUnitWeight,
    ingredients: normalizedIngredients,
    climate: {
      roomTemp: data?.climate?.roomTemp ?? 24,
      flourTemp: data?.climate?.flourTemp ?? 22,
      desiredDoughTemp: data?.climate?.desiredDoughTemp ?? 26,
      prefermentTemp: data?.climate?.prefermentTemp ?? 22,
      hasPreferment: false,
      relativeHumidity: data?.climate?.relativeHumidity ?? 60,
      mixerType: 'manual',
      frictionFactor: 2,
      tapWaterTemp: data?.climate?.tapWaterTemp ?? 22,
    },
    costing: {
      bakeLossPercentage,
      packagingCostPerUnit: data?.costing?.packagingCostPerUnit ?? 0.5,
      energyGasCostPerBatch: data?.costing?.energyGasCostPerBatch ?? 3.5,
      laborOverheadPercentage: data?.costing?.laborOverheadPercentage ?? 15,
      markupMultiplier: data?.costing?.markupMultiplier ?? 3.0,
      targetMarginPercent: data?.costing?.targetMarginPercent ?? 65,
    },
    steps: (data?.steps || []).map((st: any, idx: number) => ({
      id: `step-${Date.now()}-${idx}`,
      name: st.name,
      durationMinutes: st.durationMinutes ?? 15,
      temperature: st.temperature,
      description: st.description,
      criticalControlPoint: st.criticalControlPoint ?? 'Dica de vó.',
    })),
  };
}

/**
 * Tangzhong / Yudane Scald Calculator
 */
export function calculateTangzhong(
  totalFlourWeight: number,
  tangzhongFlourPct = 7, // 7% is the golden standard
  ratio = 5 // 1:5 ratio (1 part flour to 5 parts water or milk)
) {
  const flourInTangzhong = Math.round((totalFlourWeight * tangzhongFlourPct) / 100);
  const liquidInTangzhong = Math.round(flourInTangzhong * ratio);
  const totalTangzhongWeight = flourInTangzhong + liquidInTangzhong;
  const remainingFlour = totalFlourWeight - flourInTangzhong;

  return {
    flourInTangzhong,
    liquidInTangzhong,
    totalTangzhongWeight,
    remainingFlour,
  };
};

/**
 * Yeast Conversion Engine
 * Instant Dry Yeast (1x) <=> Active Dry Yeast (1.25x) <=> Fresh Compressed Yeast (3x) <=> Liquid Levain 100% (approx 15-20x)
 */
export function convertYeast(
  amount: number,
  from: 'instant_dry' | 'active_dry' | 'fresh' | 'levain_100'
) {
  // Normalize everything to Instant Dry Yeast (IDY = 1.0)
  let instantDry = 0;
  switch (from) {
    case 'instant_dry':
      instantDry = amount;
      break;
    case 'active_dry':
      instantDry = amount / 1.25;
      break;
    case 'fresh':
      instantDry = amount / 3.0;
      break;
    case 'levain_100':
      instantDry = amount / 18.0; // rough equivalent in gas power
      break;
  }

  return {
    instantDry: Math.round(instantDry * 10) / 10,
    activeDry: Math.round(instantDry * 1.25 * 10) / 10,
    fresh: Math.round(instantDry * 3.0 * 10) / 10,
    levain100: Math.round(instantDry * 18.0 * 10) / 10,
  };
};

/**
 * Converte gramas em medidas caseiras da vovó (xícaras, colheres, copos, pacotinhos)
 */
export function getHouseholdMeasureEstimate(name: string, category: string, weight: number): string {
  const lowerName = (name || '').toLowerCase();
  
  if (weight <= 0) return '0';

  // Fermento seco de pacotinho
  if (lowerName.includes('fermento') && (lowerName.includes('seco') || lowerName.includes('instant') || lowerName.includes('biol'))) {
    if (Math.abs(weight - 10) <= 1) return '1 pacotinho fechado (10g) ou 1 colher de sopa cheia';
    if (Math.abs(weight - 5) <= 1) return 'meio pacotinho (5g) ou 1 colher de sobremesa';
    if (weight > 10) {
      const packets = (weight / 10).toFixed(1);
      return `~${packets} pacotinhos de 10g`;
    }
    return `~${(weight / 3).toFixed(1)} colheres de chá`;
  }

  // Fermento químico em pó (bolo)
  if (lowerName.includes('químico') || lowerName.includes('quimico') || (category === 'ferment' && lowerName.includes('pó'))) {
    if (Math.abs(weight - 15) <= 3) return '1 colher de sopa cheia (ou a própria tampa)';
    if (Math.abs(weight - 10) <= 1.5) return '1 colher de sopa rasa';
    if (Math.abs(weight - 5) <= 1.5) return '1 colher de chá';
    const spoons = (weight / 15).toFixed(1).replace('.', ',');
    return `~${spoons} colheres de sopa cheias (tampas)`;
  }

  // Sal
  if (category === 'salt' || lowerName.includes('sal')) {
    if (weight <= 3) return '1 pitada generosa (ou 1 colherinha de café)';
    if (weight <= 6) return '1 colher de chá rasa';
    if (weight <= 10) return '1 colher de sobremesa rasa';
    if (weight <= 15) return '1 colher de sopa rasa';
    const spoons = (weight / 15).toFixed(1).replace('.', ',');
    return `~${spoons} colheres de sopa`;
  }

  // Açúcar (1 xícara padrão = 200g)
  if (category === 'sugar' || lowerName.includes('açúcar') || lowerName.includes('acucar')) {
    if (weight < 35) {
      const spoons = Math.max(1, Math.round(weight / 15));
      return `~${spoons} colher${spoons > 1 ? 'es' : ''} de sopa`;
    }
    const cups = weight / 200;
    if (Math.abs(cups - 1) < 0.15) return '~1 xícara de chá cheia';
    if (Math.abs(cups - 0.5) < 0.1) return '~meia xícara de chá';
    if (Math.abs(cups - 0.25) < 0.1) return '~1/4 de xícara de chá (ou 3 colheres de sopa)';
    if (Math.abs(cups - 1.5) < 0.15) return '~1 xícara e meia de chá';
    if (Math.abs(cups - 2) < 0.15) return '~2 xícaras de chá';
    return `~${cups.toFixed(1).replace('.', ',')} xícaras de chá`;
  }

  // Farinha de trigo / Fubá / Amido (1 xícara = 125g)
  if (category === 'flour' || lowerName.includes('farinha') || lowerName.includes('fubá') || lowerName.includes('fuba')) {
    const cups = weight / 125;
    if (Math.abs(weight - 500) < 15) return '~4 xícaras de chá (bem niveladas)';
    if (Math.abs(weight - 1000) < 20) return '~8 xícaras de chá (1 pacote de 1kg)';
    if (Math.abs(weight - 250) < 15) return '~2 xícaras de chá';
    if (Math.abs(cups - 1) < 0.15) return '~1 xícara de chá cheia';
    if (Math.abs(cups - 0.5) < 0.1) return '~meia xícara de chá';
    if (Math.abs(cups - 1.5) < 0.15) return '~1 xícara e meia de chá';
    if (Math.abs(cups - 3) < 0.15) return '~3 xícaras de chá';
    return `~${cups.toFixed(1).replace('.', ',')} xícaras de chá`;
  }

  // Leite condensado (1 lata/caixinha = 395g)
  if (lowerName.includes('leite condensado') || lowerName.includes('condensado')) {
    const cans = weight / 395;
    if (Math.abs(cans - 1) < 0.12) return '1 lata ou caixinha (395g)';
    if (Math.abs(cans - 0.5) < 0.1) return 'meia lata/caixinha (~200g)';
    if (Math.abs(cans - 2) < 0.15) return '2 latas ou caixinhas';
    return `~${cans.toFixed(1).replace('.', ',')} lata(s) de 395g`;
  }

  // Creme de leite (1 caixinha = 200g)
  if (lowerName.includes('creme de leite')) {
    const boxes = weight / 200;
    if (Math.abs(boxes - 1) < 0.12) return '1 caixinha (200g)';
    if (Math.abs(boxes - 0.5) < 0.1) return 'meia caixinha (~100g)';
    if (Math.abs(boxes - 2) < 0.15) return '2 caixinhas (400g)';
    return `~${boxes.toFixed(1).replace('.', ',')} caixinha(s) de 200g`;
  }

  // Chocolate em pó / Cacau / Achocolatado (1 xícara = ~90g, 1 colher sopa = ~10g)
  if (lowerName.includes('chocolate') || lowerName.includes('cacau') || lowerName.includes('achocolatado')) {
    if (weight < 35) {
      const spoons = Math.max(1, Math.round(weight / 10));
      return `~${spoons} colher${spoons > 1 ? 'es' : ''} de sopa`;
    }
    const cups = weight / 90;
    if (Math.abs(cups - 1) < 0.15) return '~1 xícara de chá cheia';
    if (Math.abs(cups - 0.5) < 0.12) return '~meia xícara de chá';
    if (Math.abs(cups - 1.5) < 0.15) return '~1 xícara e meia de chá';
    if (Math.abs(cups - 2) < 0.15) return '~2 xícaras de chá';
    return `~${cups.toFixed(1).replace('.', ',')} xícara(s) de chá`;
  }

  // Líquidos (Água / Leite / Suco — 1 xícara = 240ml)
  if (
    category === 'liquid' ||
    lowerName.includes('água') ||
    lowerName.includes('agua') ||
    lowerName.includes('leite') ||
    lowerName.includes('suco')
  ) {
    if (weight <= 75) {
      const spoons = Math.max(1, Math.round(weight / 15));
      return `~${spoons} colher${spoons > 1 ? 'es' : ''} de sopa`;
    }
    if (Math.abs(weight - 300) < 15) return '~1 xícara e 1/4 (ou 1 copo e meio americano)';
    if (Math.abs(weight - 240) < 15) return '~1 xícara de chá cheia (240ml)';
    if (Math.abs(weight - 200) < 15) return '~1 copo americano (200ml)';
    if (Math.abs(weight - 120) < 10) return '~meia xícara de chá';
    if (Math.abs(weight - 500) < 20) return '~2 xícaras cheias (500ml)';
    const cups = weight / 240;
    return `~${cups.toFixed(1).replace('.', ',')} xícara${cups >= 1.5 ? 's' : ''} de chá`;
  }

  // Gorduras (Óleo / Manteiga / Azeite / Banha — 1 xícara óleo = 220g, 1 colher sopa = 15g)
  if (
    category === 'fat' ||
    lowerName.includes('óleo') ||
    lowerName.includes('oleo') ||
    lowerName.includes('manteiga') ||
    lowerName.includes('azeite') ||
    lowerName.includes('banha')
  ) {
    if (weight <= 18) return '~1 colher de sopa';
    if (weight <= 34) return '~2 colheres de sopa cheias';
    if (Math.abs(weight - 40) <= 7) return '~3 colheres de sopa cheias (ou 1/4 de xícara)';
    if (Math.abs(weight - 55) <= 8) return '~1/4 de xícara (ou 3 a 4 colheres de sopa)';
    if (Math.abs(weight - 110) <= 12) return '~meia xícara de chá';
    if (Math.abs(weight - 160) <= 15) return '~3/4 de xícara de chá';
    if (Math.abs(weight - 220) <= 15) return '~1 xícara de chá cheia';
    if (Math.abs(weight - 250) <= 15) return '~1 xícara e 1/4 (ou 1 tablete e 1/4 de 200g)';
    const spoons = (weight / 15).toFixed(1).replace('.', ',');
    return `~${spoons} colheres de sopa`;
  }

  // Gemas e Ovos
  if (lowerName.includes('gema') && !lowerName.includes('açúcar cristal') && !lowerName.includes('acucar cristal')) {
    const yolks = Math.max(1, Math.round(weight / 20));
    return `~${yolks} gema${yolks > 1 ? 's' : ''}`;
  }
  if (category === 'egg' || lowerName.includes('ovo')) {
    const eggs = Math.max(1, Math.round(weight / 50));
    return `~${eggs} ovo${eggs > 1 ? 's' : ''} médio${eggs > 1 ? 's' : ''}`;
  }

  // Milho verde (sem confundir com fubá/amido)
  if (lowerName.includes('milho') && !lowerName.includes('fubá') && !lowerName.includes('fuba') && !lowerName.includes('amido')) {
    const cans = weight / 170;
    if (Math.abs(cans - 1) <= 0.25) return '1 latinha escorrida (ou ~1 xícara cheia)';
    if (Math.abs(cans - 2) <= 0.35) return '2 latinhas escorridas (ou ~2 xícaras)';
    return `~${(weight / 160).toFixed(1).replace('.', ',')} xícara(s) de chá de milho`;
  }

  // Cenoura
  if (lowerName.includes('cenoura')) {
    const carrots = Math.max(1, Math.round(weight / 90));
    return `~${carrots} cenoura${carrots > 1 ? 's' : ''} média${carrots > 1 ? 's' : ''} picada${carrots > 1 ? 's' : ''}`;
  }

  // Laranja fruta
  if (lowerName.includes('laranja') && !lowerName.includes('suco')) {
    const oranges = Math.max(1, Math.round(weight / 160));
    return `~${oranges} laranja${oranges > 1 ? 's' : ''} descascada${oranges > 1 ? 's' : ''} sem sementes`;
  }

  // Gema + açúcar cristal para pincelar rosca
  if (lowerName.includes('gema') && (lowerName.includes('açúcar') || lowerName.includes('acucar'))) {
    return '1 gema batida + 2 colheres de sopa de açúcar cristal';
  }

  // Frutas (Uva e Banana para Cuca)
  if (lowerName.includes('uva') && lowerName.includes('banana')) {
    const cups = (weight / 175).toFixed(1).replace('.', ',');
    const bananas = Math.max(1, Math.round(weight / 110));
    return `~${cups} xícaras de uvas ou ${bananas} bananas médias`;
  }
  if (lowerName.includes('uva')) {
    const cups = (weight / 175).toFixed(1).replace('.', ',');
    return `~${cups.replace(',0', '')} xícara${weight >= 260 ? 's' : ''} de chá bem cheia${weight >= 260 ? 's' : ''}`;
  }
  if (lowerName.includes('banana')) {
    const bananas = Math.max(1, Math.round(weight / 110));
    return `~${bananas} banana${bananas > 1 ? 's' : ''} média${bananas > 1 ? 's' : ''} fatiada${bananas > 1 ? 's' : ''}`;
  }

  // Canela em pó / Erva-doce
  if (lowerName.includes('canela') || lowerName.includes('erva-doce') || lowerName.includes('erva doce')) {
    if (weight <= 6) return '~1 colher de chá cheia';
    if (weight <= 15) return '~1 colher de sopa';
    return `~${Math.round(weight / 15)} colheres de sopa`;
  }

  // Queijo Parmesão / Coco Ralado
  if (lowerName.includes('queijo') || lowerName.includes('parmes') || lowerName.includes('coco')) {
    if (Math.abs(weight - 50) <= 10) return '1 pacotinho (50g) ou ~meia xícara';
    if (Math.abs(weight - 100) <= 15) return '1 pacotinho grande (100g) ou ~1 xícara de chá';
    return `~${(weight / 80).toFixed(1).replace('.', ',')} xícara(s)`;
  }

  // Genérico
  if (weight < 20) return `~${Math.max(1, Math.round(weight / 5))} colher(es) de chá`;
  if (weight < 100) return `~${Math.max(1, Math.round(weight / 15))} colher(es) de sopa`;
  return `~${(weight / 150).toFixed(1).replace('.', ',')} xícara(s)`;
}
