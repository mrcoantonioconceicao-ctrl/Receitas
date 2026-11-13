import {
  Recipe,
  RecipeASTNode,
  EvaluatedAST,
  ClimateSettings,
  CostingSettings,
} from '../types';
import { calculateDDT } from './bakersMath';

/**
 * Organizes a recipe into clean ingredient groups without altering weights.
 * The sum of all flour ingredients acts as the 100% reference base.
 */
export function buildRecipeAST(recipe: Recipe): RecipeASTNode {
  const flourIngredients = recipe.ingredients.filter((i) => i.isFlour);
  const sumFlours = flourIngredients.reduce((sum, f) => sum + (f.weight || 0), 0);
  const baseFlourWeight = sumFlours > 0 ? Math.round(sumFlours * 10) / 10 : recipe.baseFlourWeight || 500;

  const primaryFlour = flourIngredients[0] || {
    id: 'flour-root',
    name: 'Farinha de Trigo Comum',
    category: 'flour' as const,
    percentage: 100,
    weight: baseFlourWeight,
    isFlour: true,
    costPerKg: 4.5,
  };

  const totalFlourCost =
    flourIngredients.length > 0
      ? flourIngredients.reduce((sum, f) => sum + (f.weight / 1000) * (f.costPerKg || 0), 0)
      : (baseFlourWeight / 1000) * (primaryFlour.costPerKg || 0);
  const effectiveFlourCostPerKg = baseFlourWeight > 0 ? (totalFlourCost * 1000) / baseFlourWeight : 0;

  const isBlend = flourIngredients.length > 1;

  const rootNode: RecipeASTNode = {
    id: `ast-root-${primaryFlour.id}`,
    type: 'ROOT_FLOUR',
    name: isBlend ? 'Farinhas da Receita (Mistura)' : primaryFlour.name,
    percentage: 100,
    weight: baseFlourWeight,
    costPerKg: Math.round(effectiveFlourCostPerKg * 100) / 100,
    isRootFlour: true,
    children: [],
    metadata: {
      flourContribution: baseFlourWeight,
      hydrationContribution: 0,
      notes: 'Base principal de farinha da receita',
    },
  };

  if (isBlend) {
    const blendBranch: RecipeASTNode = {
      id: 'ast-branch-flour-blend',
      type: 'ROOT_FLOUR',
      name: 'Farinhas usadas na mistura',
      percentage: 100,
      weight: baseFlourWeight,
      costPerKg: Math.round(effectiveFlourCostPerKg * 100) / 100,
      children: flourIngredients.map((f) => ({
        id: `ast-flour-leaf-${f.id}`,
        type: 'LEAF_INGREDIENT',
        name: f.name,
        percentage: baseFlourWeight > 0 ? Math.round(((f.weight / baseFlourWeight) * 100) * 10) / 10 : f.percentage,
        weight: f.weight,
        costPerKg: f.costPerKg,
        metadata: { flourContribution: f.weight },
      })),
    };
    rootNode.children!.push(blendBranch);
  }

  // Esponjas / misturas prévias (caso o usuário adicione manualmente)
  const preferments = recipe.ingredients.filter((i) => i.isPreferment);
  if (preferments.length > 0) {
    preferments.forEach((pref) => {
      const hydr = pref.prefermentHydration || 100;
      const flourPart = pref.weight / (1 + hydr / 100);
      const waterPart = pref.weight - flourPart;

      const prefermentSubtree: RecipeASTNode = {
        id: `ast-subtree-pref-${pref.id}`,
        type: 'SUBTREE_PREFERMENT',
        name: pref.name,
        percentage: pref.percentage,
        weight: pref.weight,
        costPerKg: pref.costPerKg,
        children: [
          {
            id: `pref-sub-flour-${pref.id}`,
            type: 'LEAF_INGREDIENT',
            name: 'Farinha na mistura prévia',
            percentage: Math.round(((flourPart / baseFlourWeight) * 100) * 10) / 10,
            weight: Math.round(flourPart * 10) / 10,
            costPerKg: pref.costPerKg,
            metadata: { flourContribution: flourPart },
          },
          {
            id: `pref-sub-water-${pref.id}`,
            type: 'LEAF_INGREDIENT',
            name: 'Água na mistura prévia',
            percentage: Math.round(((waterPart / baseFlourWeight) * 100) * 10) / 10,
            weight: Math.round(waterPart * 10) / 10,
            costPerKg: 0.05,
            metadata: { hydrationContribution: waterPart },
          },
        ],
        metadata: {
          flourContribution: flourPart,
          hydrationContribution: waterPart,
          proteolyticRisk: pref.percentage > 30,
        },
      };

      rootNode.children!.push(prefermentSubtree);
    });
  }

  // Líquidos
  const liquids = recipe.ingredients.filter(
    (i) => !i.isFlour && !i.isPreferment && i.category === 'liquid'
  );
  if (liquids.length > 0) {
    const liquidWeightSum = liquids.reduce((sum, l) => sum + l.weight, 0);
    const liquidBranch: RecipeASTNode = {
      id: 'ast-branch-liquid',
      type: 'BRANCH_LIQUID',
      name: 'Água, Leite e Líquidos',
      percentage: liquids.reduce((sum, l) => sum + l.percentage, 0),
      weight: liquidWeightSum,
      costPerKg: 0,
      children: liquids.map((l) => ({
        id: `ast-leaf-${l.id}`,
        type: 'LEAF_INGREDIENT',
        name: l.name,
        percentage: l.percentage,
        weight: l.weight,
        costPerKg: l.costPerKg,
        metadata: { hydrationContribution: l.weight },
      })),
      metadata: { hydrationContribution: liquidWeightSum },
    };
    rootNode.children!.push(liquidBranch);
  }

  // Sal
  const salts = recipe.ingredients.filter((i) => !i.isFlour && !i.isPreferment && i.category === 'salt');
  if (salts.length > 0) {
    const saltBranch: RecipeASTNode = {
      id: 'ast-branch-salt',
      type: 'BRANCH_SALT',
      name: 'Sal (Tempero)',
      percentage: salts.reduce((sum, s) => sum + s.percentage, 0),
      weight: salts.reduce((sum, s) => sum + s.weight, 0),
      costPerKg: 0,
      children: salts.map((s) => ({
        id: `ast-leaf-${s.id}`,
        type: 'LEAF_INGREDIENT',
        name: s.name,
        percentage: s.percentage,
        weight: s.weight,
        costPerKg: s.costPerKg,
      })),
    };
    rootNode.children!.push(saltBranch);
  }

  // Fermentos
  const ferments = recipe.ingredients.filter(
    (i) => !i.isFlour && !i.isPreferment && i.category === 'ferment'
  );
  if (ferments.length > 0) {
    const fermentBranch: RecipeASTNode = {
      id: 'ast-branch-ferment',
      type: 'BRANCH_FERMENT',
      name: 'Fermento (Para Crescer)',
      percentage: ferments.reduce((sum, f) => sum + f.percentage, 0),
      weight: ferments.reduce((sum, f) => sum + f.weight, 0),
      costPerKg: 0,
      children: ferments.map((f) => ({
        id: `ast-leaf-${f.id}`,
        type: 'LEAF_INGREDIENT',
        name: f.name,
        percentage: f.percentage,
        weight: f.weight,
        costPerKg: f.costPerKg,
      })),
    };
    rootNode.children!.push(fermentBranch);
  }

  // Gorduras
  const fats = recipe.ingredients.filter((i) => !i.isFlour && !i.isPreferment && i.category === 'fat');
  if (fats.length > 0) {
    const fatBranch: RecipeASTNode = {
      id: 'ast-branch-lipid',
      type: 'BRANCH_LIPID',
      name: 'Óleo ou Manteiga (Maciez)',
      percentage: fats.reduce((sum, f) => sum + f.percentage, 0),
      weight: fats.reduce((sum, f) => sum + f.weight, 0),
      costPerKg: 0,
      children: fats.map((f) => ({
        id: `ast-leaf-${f.id}`,
        type: 'LEAF_INGREDIENT',
        name: f.name,
        percentage: f.percentage,
        weight: f.weight,
        costPerKg: f.costPerKg,
      })),
    };
    rootNode.children!.push(fatBranch);
  }

  // Açúcares
  const sugars = recipe.ingredients.filter((i) => !i.isFlour && !i.isPreferment && i.category === 'sugar');
  if (sugars.length > 0) {
    const sugarBranch: RecipeASTNode = {
      id: 'ast-branch-sweetener',
      type: 'BRANCH_SWEETENER',
      name: 'Açúcar (Sabor e Cor Dourada)',
      percentage: sugars.reduce((sum, s) => sum + s.percentage, 0),
      weight: sugars.reduce((sum, s) => sum + s.weight, 0),
      costPerKg: 0,
      children: sugars.map((s) => ({
        id: `ast-leaf-${s.id}`,
        type: 'LEAF_INGREDIENT',
        name: s.name,
        percentage: s.percentage,
        weight: s.weight,
        costPerKg: s.costPerKg,
      })),
    };
    rootNode.children!.push(sugarBranch);
  }

  // Ovos, recheios e complementos
  const enrichments = recipe.ingredients.filter(
    (i) =>
      !i.isFlour &&
      !i.isPreferment &&
      (i.category === 'egg' || i.category === 'enrichment' || i.category === 'inclusion' || i.category === 'other')
  );
  if (enrichments.length > 0) {
    const enrichBranch: RecipeASTNode = {
      id: 'ast-branch-enrichment',
      type: 'BRANCH_ENRICHMENT',
      name: 'Ovos, Especiarias e Recheios',
      percentage: enrichments.reduce((sum, e) => sum + e.percentage, 0),
      weight: enrichments.reduce((sum, e) => sum + e.weight, 0),
      costPerKg: 0,
      children: enrichments.map((e) => ({
        id: `ast-leaf-${e.id}`,
        type: 'LEAF_INGREDIENT',
        name: e.name,
        percentage: e.percentage,
        weight: e.weight,
        costPerKg: e.costPerKg,
        metadata: {
          hydrationContribution: e.category === 'egg' ? e.weight * 0.75 : 0,
        },
      })),
    };
    rootNode.children!.push(enrichBranch);
  }

  return rootNode;
}

/**
 * Evaluates recipe totals, water temp, and costing consistently across all groups.
 */
export function evaluateDeterministicAST(
  root: RecipeASTNode,
  climate: ClimateSettings,
  costing: CostingSettings,
  targetUnits = 2
): EvaluatedAST {
  const rootFlourWeight = root.weight;
  let totalRawDoughWeight = root.weight;
  let directWaterWeight = 0;
  let totalFlourWeight = root.weight;
  let totalLiquidWeight = 0;
  let directCost = (root.weight / 1000) * (root.costPerKg || 0);

  let nodesCount = 1;
  const validationMessages: string[] = [];

  function traverse(node: RecipeASTNode) {
    if (!node.children || node.children.length === 0) return;

    for (const child of node.children) {
      nodesCount++;

      const isBlendBreakdown = node.id === 'ast-branch-flour-blend' || child.id === 'ast-branch-flour-blend';
      const isPrefermentBreakdown = node.type === 'SUBTREE_PREFERMENT';

      if (!isBlendBreakdown && !isPrefermentBreakdown) {
        if (child.type === 'LEAF_INGREDIENT' || child.type === 'SUBTREE_PREFERMENT') {
          totalRawDoughWeight += child.weight;
          directCost += (child.weight / 1000) * (child.costPerKg || 0);
        }

        if (child.type === 'SUBTREE_PREFERMENT' && child.metadata?.flourContribution) {
          totalFlourWeight += child.metadata.flourContribution;
        }

        if (child.metadata?.hydrationContribution) {
          if (child.type === 'LEAF_INGREDIENT' || child.type === 'SUBTREE_PREFERMENT') {
            totalLiquidWeight += child.metadata.hydrationContribution;
          }
          if (node.type === 'BRANCH_LIQUID' && child.type === 'LEAF_INGREDIENT') {
            directWaterWeight += child.metadata.hydrationContribution;
          }
        }
      }

      traverse(child);
    }
  }

  traverse(root);

  const formulaHydrationPct = rootFlourWeight > 0 ? (directWaterWeight / rootFlourWeight) * 100 : 0;
  const realGlobalHydrationPct = totalFlourWeight > 0 ? (totalLiquidWeight / totalFlourWeight) * 100 : 0;

  const ddt = calculateDDT(climate, directWaterWeight);

  const units = Math.max(1, targetUnits);
  const packagingTotal = units * (costing.packagingCostPerUnit || 0);
  const totalBatchCost =
    directCost +
    packagingTotal +
    (costing.energyGasCostPerBatch || 0) +
    directCost * ((costing.laborOverheadPercentage || 0) / 100);
  const unitDirectCost = directCost / units;
  const unitTotalCost = totalBatchCost / units;
  const suggestedSalePrice =
    unitDirectCost * (costing.markupMultiplier || 3.0) +
    (costing.packagingCostPerUnit || 0) +
    unitTotalCost * 0.1;

  const isValid = rootFlourWeight > 0;
  if (rootFlourWeight === 500) {
    validationMessages.push('Receita calibrada na medida prática de 500g de farinha (ideal para 2 pães médios).');
  } else {
    validationMessages.push(`Receita ajustada para ${Math.round(rootFlourWeight)}g de farinha, rendendo ~${Math.round(totalRawDoughWeight)}g de massa no total.`);
  }

  if (realGlobalHydrationPct < 50) {
    validationMessages.push('Massa mais firme e sequinha, fácil de sovar sem grudar.');
  } else if (realGlobalHydrationPct > 85) {
    validationMessages.push('Massa bem molinha ou líquida — ponto típico de bolo ou pão de forma bem úmido.');
  } else {
    validationMessages.push('Quantidade equilibrada de água/leite para a massa ficar bem fofinha e macia.');
  }

  const rawPerUnit = Math.round(totalRawDoughWeight / units);
  validationMessages.push(
    `Dividindo em ${units} ${units === 1 ? 'unidade' : 'unidades'}, cada peça fica com cerca de ${rawPerUnit}g antes de ir ao forno.`
  );

  return {
    rootFlourWeight,
    totalRawDoughWeight,
    formulaHydrationPct,
    realGlobalHydrationPct,
    totalBatchCost,
    unitTotalCost,
    suggestedSalePrice,
    ddtWaterTarget: ddt.waterTempTarget,
    astDepth: 3,
    nodesCount,
    isValid,
    validationMessages,
  };
}
