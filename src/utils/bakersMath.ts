import { ClimateSettings, CostingSettings, Ingredient } from '../types';

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

  ingredients.forEach((ing) => {
    if (ing.isFlour) {
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

  const formulaHydrationPct = baseFlourWeight > 0 ? (formulaWaterWeight / baseFlourWeight) * 100 : 0;
  const trueGlobalHydrationPct = totalFlourWeight > 0 ? (totalLiquidWeight / totalFlourWeight) * 100 : 0;

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
      // Very high friction or hot ambient: water alone cannot reach DDT
      warningMessage = `Alerta Térmico: A temperatura teórica calculada da água (${waterTempTarget.toFixed(1)}°C) é abaixo de zero! Refrigere a farinha para 10-15°C ou coloque a tigela/gancho no freezer antes da sova.`;
      // Use 100% ice or near 100% ice
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
    if (Math.abs(weight - 15) <= 2) return '1 colher de sopa cheia (ou a própria tampa)';
    if (Math.abs(weight - 10) <= 1) return '1 colher de sopa rasa';
    if (Math.abs(weight - 5) <= 1) return '1 colher de chá';
  }

  // Sal
  if (category === 'salt' || lowerName.includes('sal')) {
    if (weight <= 3) return '1 pitada generosa (ou 1 colherinha de café)';
    if (weight <= 6) return '1 colher de chá rasa';
    if (weight <= 10) return '1 colher de sobremesa rasa';
    if (weight <= 15) return '1 colher de sopa rasa';
    const spoons = (weight / 15).toFixed(1);
    return `~${spoons} colheres de sopa`;
  }

  // Açúcar
  if (category === 'sugar' || lowerName.includes('açúcar') || lowerName.includes('acucar')) {
    if (weight < 25) {
      const spoons = Math.max(1, Math.round(weight / 15));
      return `~${spoons} colher${spoons > 1 ? 'es' : ''} de sopa`;
    }
    const cups = (weight / 180);
    if (Math.abs(cups - 1) < 0.15) return '~1 xícara de chá';
    if (Math.abs(cups - 0.5) < 0.1) return '~meia xícara de chá';
    if (Math.abs(cups - 0.25) < 0.1) return '~1/4 de xícara de chá (ou 2 colheres de sopa cheias)';
    if (Math.abs(cups - 1.5) < 0.15) return '~1 xícara e meia de chá';
    if (Math.abs(cups - 2) < 0.15) return '~2 xícaras de chá';
    return `~${cups.toFixed(1)} xícaras de chá`;
  }

  // Farinha de trigo / Fubá / Amido
  if (category === 'flour' || lowerName.includes('farinha') || lowerName.includes('fubá') || lowerName.includes('fuba')) {
    const cups = weight / 125;
    if (Math.abs(weight - 500) < 15) return '~4 xícaras de chá (bem niveladas)';
    if (Math.abs(weight - 1000) < 20) return '~8 xícaras de chá (1 pacote de 1kg)';
    if (Math.abs(weight - 250) < 15) return '~2 xícaras de chá';
    if (Math.abs(cups - 1) < 0.15) return '~1 xícara de chá cheia';
    if (Math.abs(cups - 0.5) < 0.1) return '~meia xícara de chá';
    if (Math.abs(cups - 1.5) < 0.15) return '~1 xícara e meia de chá';
    if (Math.abs(cups - 3) < 0.15) return '~3 xícaras de chá';
    return `~${cups.toFixed(1)} xícaras de chá`;
  }

  // Líquidos (Água / Leite)
  if (category === 'liquid' || lowerName.includes('água') || lowerName.includes('agua') || lowerName.includes('leite')) {
    if (Math.abs(weight - 300) < 15) return '~1 xícara e 1/4 (ou 1 copo e meio americano)';
    if (Math.abs(weight - 240) < 15) return '~1 xícara de chá cheia (240ml)';
    if (Math.abs(weight - 200) < 15) return '~1 copo americano (200ml)';
    if (Math.abs(weight - 120) < 10) return '~meia xícara de chá';
    if (Math.abs(weight - 500) < 20) return '~2 xícaras cheias (500ml)';
    const cups = weight / 240;
    return `~${cups.toFixed(1)} xícara${cups > 1 ? 's' : ''} de chá`;
  }

  // Gorduras (Óleo / Manteiga / Banha)
  if (category === 'fat' || lowerName.includes('óleo') || lowerName.includes('oleo') || lowerName.includes('manteiga') || lowerName.includes('banha')) {
    if (weight <= 15) return '~1 colher de sopa rasa';
    if (weight <= 30) return '~2 colheres de sopa cheias';
    if (Math.abs(weight - 40) <= 8) return '~3 colheres de sopa cheias (ou 1/4 de xícara)';
    if (Math.abs(weight - 50) <= 8) return '~1/4 de xícara (ou 3 colheres de sopa bem cheias)';
    if (Math.abs(weight - 100) <= 10) return '~meia xícara de chá';
    const spoons = (weight / 15).toFixed(1);
    return `~${spoons} colheres de sopa`;
  }

  // Ovos
  if (category === 'egg' || lowerName.includes('ovo')) {
    const eggs = Math.max(1, Math.round(weight / 50));
    return `~${eggs} ovo${eggs > 1 ? 's' : ''} médio${eggs > 1 ? 's' : ''}`;
  }

  // Genérico
  if (weight < 20) return `~${Math.max(1, Math.round(weight / 5))} colher(es) de chá`;
  if (weight < 100) return `~${Math.max(1, Math.round(weight / 15))} colher(es) de sopa`;
  return `~${(weight / 150).toFixed(1)} xícara(s)`;
}
