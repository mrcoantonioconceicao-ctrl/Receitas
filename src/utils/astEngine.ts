import { 
  Recipe, 
  RecipeASTNode, 
  ASTNodeType, 
  EvaluatedAST, 
  ClimateSettings, 
  CostingSettings, 
  Ingredient 
} from '../types';
import { calculateDDT, calculateCosting } from './bakersMath';

/**
 * Builds a deterministic Abstract Syntax Tree (AST) from a recipe.
 * The primary flour acts as the ROOT NODE (100% / 1000g base).
 */
export function buildRecipeAST(recipe: Recipe): RecipeASTNode {
  const baseFlourWeight = recipe.baseFlourWeight || 1000;

  // Identify root flour ingredients
  const flourIngredients = recipe.ingredients.filter((i) => i.isFlour);
  const primaryFlour = flourIngredients[0] || {
    id: 'flour-root',
    name: 'Farinha Base Principal (W 280-320)',
    category: 'flour',
    percentage: 100,
    weight: baseFlourWeight,
    isFlour: true,
    costPerKg: 7.0,
  };

  // Create Root Node
  const rootNode: RecipeASTNode = {
    id: `ast-root-${primaryFlour.id}`,
    type: 'ROOT_FLOUR',
    name: primaryFlour.name,
    percentage: 100,
    weight: baseFlourWeight,
    costPerKg: primaryFlour.costPerKg || 7.0,
    isRootFlour: true,
    children: [],
    metadata: {
      flourContribution: baseFlourWeight,
      hydrationContribution: 0,
      notes: 'Nó Raiz da AST: Farinha Base Determinística (100%)',
    },
  };

  // Branch 1: Additional Flours (if blend)
  const secondaryFlours = flourIngredients.slice(1);
  if (secondaryFlours.length > 0) {
    const blendBranch: RecipeASTNode = {
      id: 'ast-branch-flour-blend',
      type: 'ROOT_FLOUR',
      name: 'Blend de Farinhas Secundárias',
      percentage: secondaryFlours.reduce((sum, f) => sum + f.percentage, 0),
      weight: secondaryFlours.reduce((sum, f) => sum + f.weight, 0),
      costPerKg: 8.5,
      children: secondaryFlours.map((f) => ({
        id: `ast-leaf-${f.id}`,
        type: 'LEAF_INGREDIENT',
        name: f.name,
        percentage: f.percentage,
        weight: f.weight,
        costPerKg: f.costPerKg,
        metadata: { flourContribution: f.weight },
      })),
    };
    rootNode.children!.push(blendBranch);
  }

  // Branch 2: Preferments (Subtree with Flour + Water decomposition)
  const preferments = recipe.ingredients.filter((i) => i.isPreferment);
  if (preferments.length > 0) {
    preferments.forEach((pref) => {
      const hydr = pref.prefermentHydration || 100;
      const flourPart = pref.weight / (1 + hydr / 100);
      const waterPart = pref.weight - flourPart;

      const prefermentSubtree: RecipeASTNode = {
        id: `ast-subtree-pref-${pref.id}`,
        type: 'SUBTREE_PREFERMENT',
        name: `${pref.name} (${hydr}% Hidr.)`,
        percentage: pref.percentage,
        weight: pref.weight,
        costPerKg: pref.costPerKg,
        children: [
          {
            id: `pref-sub-flour-${pref.id}`,
            type: 'LEAF_INGREDIENT',
            name: `Farinha fermentada no levain (${(flourPart / baseFlourWeight * 100).toFixed(1)}%)`,
            percentage: (flourPart / baseFlourWeight) * 100,
            weight: Math.round(flourPart * 10) / 10,
            costPerKg: pref.costPerKg,
            metadata: { flourContribution: flourPart },
          },
          {
            id: `pref-sub-water-${pref.id}`,
            type: 'LEAF_INGREDIENT',
            name: `Água líquida no levain (${(waterPart / baseFlourWeight * 100).toFixed(1)}%)`,
            percentage: (waterPart / baseFlourWeight) * 100,
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

  // Branch 3: Hydration / Liquids
  const liquids = recipe.ingredients.filter((i) => i.category === 'liquid' && !i.isPreferment);
  if (liquids.length > 0) {
    const liquidBranch: RecipeASTNode = {
      id: 'ast-branch-liquid',
      type: 'BRANCH_LIQUID',
      name: 'Ramo Hidro-Dinâmico (Líquidos Diretos)',
      percentage: liquids.reduce((sum, l) => sum + l.percentage, 0),
      weight: liquids.reduce((sum, l) => sum + l.weight, 0),
      costPerKg: 0.1,
      children: liquids.map((l) => ({
        id: `ast-leaf-${l.id}`,
        type: 'LEAF_INGREDIENT',
        name: l.name,
        percentage: l.percentage,
        weight: l.weight,
        costPerKg: l.costPerKg,
        metadata: { hydrationContribution: l.weight },
      })),
      metadata: { hydrationContribution: liquids.reduce((sum, l) => sum + l.weight, 0) },
    };
    rootNode.children!.push(liquidBranch);
  }

  // Branch 4: Salt & Gluten Ionic Stabilization
  const salts = recipe.ingredients.filter((i) => i.category === 'salt');
  if (salts.length > 0) {
    const saltBranch: RecipeASTNode = {
      id: 'ast-branch-salt',
      type: 'BRANCH_SALT',
      name: 'Ramo Iônico (Estabilização de Glúten & Salinidade)',
      percentage: salts.reduce((sum, s) => sum + s.percentage, 0),
      weight: salts.reduce((sum, s) => sum + s.weight, 0),
      costPerKg: 4.0,
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

  // Branch 5: Commercial Ferments
  const ferments = recipe.ingredients.filter((i) => i.category === 'ferment' && !i.isPreferment);
  if (ferments.length > 0) {
    const fermentBranch: RecipeASTNode = {
      id: 'ast-branch-ferment',
      type: 'BRANCH_FERMENT',
      name: 'Ramo de Cinética Levedante (Fermentos Comerciais)',
      percentage: ferments.reduce((sum, f) => sum + f.percentage, 0),
      weight: ferments.reduce((sum, f) => sum + f.weight, 0),
      costPerKg: 25.0,
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

  // Branch 6: Lipids & Fats
  const fats = recipe.ingredients.filter((i) => i.category === 'fat');
  if (fats.length > 0) {
    const fatBranch: RecipeASTNode = {
      id: 'ast-branch-lipid',
      type: 'BRANCH_LIPID',
      name: 'Ramo Lipídico (Emulsões & Maciez)',
      percentage: fats.reduce((sum, f) => sum + f.percentage, 0),
      weight: fats.reduce((sum, f) => sum + f.weight, 0),
      costPerKg: 45.0,
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

  // Branch 7: Sweeteners
  const sugars = recipe.ingredients.filter((i) => i.category === 'sugar');
  if (sugars.length > 0) {
    const sugarBranch: RecipeASTNode = {
      id: 'ast-branch-sweetener',
      type: 'BRANCH_SWEETENER',
      name: 'Ramo Sacarídico (Alimento Levedante & Maillard)',
      percentage: sugars.reduce((sum, s) => sum + s.percentage, 0),
      weight: sugars.reduce((sum, s) => sum + s.weight, 0),
      costPerKg: 5.0,
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

  // Branch 8: Enrichments & Eggs
  const enrichments = recipe.ingredients.filter((i) => i.category === 'egg' || i.category === 'enrichment');
  if (enrichments.length > 0) {
    const enrichBranch: RecipeASTNode = {
      id: 'ast-branch-enrichment',
      type: 'BRANCH_ENRICHMENT',
      name: 'Ramo de Enriquecimento (Ovos, Leite em Pó, Amilases)',
      percentage: enrichments.reduce((sum, e) => sum + e.percentage, 0),
      weight: enrichments.reduce((sum, e) => sum + e.weight, 0),
      costPerKg: 20.0,
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
 * Deterministically evaluates the AST without AI hallucination.
 * Runs mass conservation, true global hydration, DDT balance, and costing.
 */
export function evaluateDeterministicAST(
  root: RecipeASTNode,
  climate: ClimateSettings,
  costing: CostingSettings
): EvaluatedAST {
  const rootFlourWeight = root.weight;
  let totalRawDoughWeight = root.weight;
  let directWaterWeight = 0;
  let totalFlourWeight = root.weight;
  let totalLiquidWeight = 0;
  let directCost = (root.weight / 1000) * (root.costPerKg || 0);

  let nodesCount = 1;
  const validationMessages: string[] = [];

  // Recursive traversal function
  function traverse(node: RecipeASTNode) {
    if (!node.children || node.children.length === 0) return;

    for (const child of node.children) {
      nodesCount++;

      // If it's not a top-level branch container, sum its weight & cost
      if (child.type === 'LEAF_INGREDIENT' || child.type === 'SUBTREE_PREFERMENT') {
        totalRawDoughWeight += child.weight;
        directCost += (child.weight / 1000) * (child.costPerKg || 0);
      }

      // Check hydration & flour contributions
      if (child.metadata?.flourContribution && child.type !== 'ROOT_FLOUR') {
        totalFlourWeight += child.metadata.flourContribution;
      }
      if (child.metadata?.hydrationContribution) {
        totalLiquidWeight += child.metadata.hydrationContribution;
        if (child.type === 'BRANCH_LIQUID' || child.type === 'LEAF_INGREDIENT') {
          directWaterWeight += child.metadata.hydrationContribution;
        }
      }

      traverse(child);
    }
  }

  traverse(root);

  // Deterministic calculations
  const formulaHydrationPct = rootFlourWeight > 0 ? (directWaterWeight / rootFlourWeight) * 100 : 0;
  const realGlobalHydrationPct = totalFlourWeight > 0 ? (totalLiquidWeight / totalFlourWeight) * 100 : 0;

  // DDT calculation
  const ddt = calculateDDT(climate, directWaterWeight);

  // Costing
  const packagingTotal = 2 * (costing.packagingCostPerUnit || 1.5);
  const totalBatchCost = directCost + packagingTotal + (costing.energyGasCostPerBatch || 5.0) + (directCost * (costing.laborOverheadPercentage / 100));
  const unitTotalCost = totalBatchCost / 2;
  const suggestedSalePrice = (unitTotalCost * (costing.markupMultiplier || 3.5));

  // Physical-chemical checks
  let isValid = true;
  if (rootFlourWeight !== 1000) {
    validationMessages.push(`Nó Raiz fora do padrão: ${rootFlourWeight}g (padrão estrito de Smart Defaults: 1.000g).`);
  } else {
    validationMessages.push('Nó Raiz calibrado estritamente em 1.000g (100% Baker\'s Percentage).');
  }

  if (realGlobalHydrationPct < 50) {
    validationMessages.push('Alerta Hidro-Dinâmico: Hidratação muito baixa (<50%). Risco de miolo seco e desenvolvimento incompleto de glúten.');
  } else if (realGlobalHydrationPct > 85) {
    validationMessages.push('Alerta de Alta Hidratação (>85%): Exige técnica de bassinage fracionada e farinha com W > 320.');
  }

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
