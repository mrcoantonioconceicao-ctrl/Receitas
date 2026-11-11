export type CategoryType = 
  | 'flour'
  | 'liquid'
  | 'ferment'
  | 'salt'
  | 'fat'
  | 'sugar'
  | 'egg'
  | 'enrichment'
  | 'inclusion'
  | 'other';

export interface Ingredient {
  id: string;
  name: string;
  category: CategoryType;
  percentage: number; // Baker's % (relative to 100% total flour)
  weight: number; // in grams
  isFlour: boolean;
  isPreferment?: boolean;
  prefermentHydration?: number; // e.g. 100 for 100% hydration levain, 100 for poolish, 50 for biga
  prefermentFlourPct?: number; // % of total flour contributed by preferment
  costPerKg: number; // R$ per kg or L
  notes?: string;
}

export type CalculationMode = 'flour-basis' | 'total-dough' | 'unit-yield';

export type MixerType = 
  | 'manual'
  | 'spiral_slow'
  | 'spiral_fast'
  | 'planetary'
  | 'food_processor'
  | 'custom';

export interface ClimateSettings {
  roomTemp: number; // °C
  flourTemp: number; // °C
  desiredDoughTemp: number; // DDT in °C (typically 24°C - 26°C)
  prefermentTemp: number; // °C
  hasPreferment: boolean;
  relativeHumidity: number; // %
  mixerType: MixerType;
  frictionFactor: number; // °C
  tapWaterTemp: number; // °C
}

export interface CostingSettings {
  bakeLossPercentage: number; // Bake loss % (typical 12% - 18%)
  packagingCostPerUnit: number; // R$
  energyGasCostPerBatch: number; // R$
  laborOverheadPercentage: number; // % sobre custo insumos
  markupMultiplier: number; // 3x to 4x standard
  targetMarginPercent: number; // e.g. 70%
}

export interface ProcessStep {
  id: string;
  name: string;
  durationMinutes: number;
  temperature?: string;
  description: string;
  criticalControlPoint: string;
}

export interface Recipe {
  id: string;
  name: string;
  type: 'bread' | 'pastry' | 'cake';
  category: string;
  description: string;
  baseFlourWeight: number; // grams (strictly 1000g in Smart Defaults)
  targetUnits: number;
  targetBakedWeightPerUnit: number; // grams
  ingredients: Ingredient[];
  climate: ClimateSettings;
  costing: CostingSettings;
  steps: ProcessStep[];
  notes?: string;
}

export interface TroubleshootingIssue {
  id: string;
  title: string;
  category: 'massa' | 'fermentacao' | 'casca' | 'miolo' | 'formato' | 'bolo';
  symptoms: string[];
  primaryRootCause: string;
  chemicalBiologicalMechanism: string;
  immediateFix: string;
  preventiveAdjustment: string;
  technicalMetric: string;
}

// ==========================================
// AST (Abstract Syntax Tree) Data Structures
// ==========================================

export type ASTNodeType = 
  | 'ROOT_FLOUR'          // Nó Raiz: 100% Farinha Base (1000g default)
  | 'SUBTREE_PREFERMENT'  // Sub-Árvore: Levain / Poolish / Biga
  | 'BRANCH_LIQUID'       // Ramo Hidro-Dinâmico: Água, leite, hidratação de bassinage
  | 'BRANCH_FERMENT'      // Ramo Fermentativo: Leveduras biológicas (seco, fresco)
  | 'BRANCH_SALT'         // Ramo Iônico / Osmótico: Sal e estabilização de glúten
  | 'BRANCH_LIPID'        // Ramo Lipídico: Manteiga, azeite, óleos
  | 'BRANCH_SWEETENER'    // Ramo Sacarídico: Açúcar, mel, malte
  | 'BRANCH_ENRICHMENT'   // Ramo de Enriquecimento: Ovos, leite em pó, Tangzhong escaldado
  | 'LEAF_INGREDIENT';    // Nó Folha Atômico

export interface RecipeASTNode {
  id: string;
  type: ASTNodeType;
  name: string;
  percentage: number; // % determinística em relação à raiz
  weight: number;     // peso determinístico em gramas
  costPerKg: number;  // custo unitário determinístico R$/kg
  isRootFlour?: boolean;
  children?: RecipeASTNode[];
  metadata?: {
    hydrationContribution?: number; // água líquida real contribuída (g)
    flourContribution?: number;     // farinha real contribuída (g)
    proteolyticRisk?: boolean;
    osmoticPressureIndex?: number;
    notes?: string;
  };
}

export interface EvaluatedAST {
  rootFlourWeight: number; // estritamente 1000g padrão
  totalRawDoughWeight: number;
  formulaHydrationPct: number;
  realGlobalHydrationPct: number;
  totalBatchCost: number;
  unitTotalCost: number;
  suggestedSalePrice: number;
  ddtWaterTarget: number;
  astDepth: number;
  nodesCount: number;
  isValid: boolean;
  validationMessages: string[];
}
