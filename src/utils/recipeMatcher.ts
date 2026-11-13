import { MASTER_RECIPES } from '../data/masterRecipes';
import { Recipe } from '../types';

function normalizeSearchText(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cloneRecipeWithFreshIds(base: Recipe): Recipe {
  const stamp = Date.now();
  return {
    ...base,
    id: `${base.id}-${stamp}`,
    climate: { ...base.climate },
    costing: { ...base.costing },
    ingredients: base.ingredients.map((ing, idx) => ({
      ...ing,
      id: `${ing.id}-${stamp}-${idx}`,
    })),
    steps: base.steps.map((st, idx) => ({
      ...st,
      id: `${st.id}-${stamp}-${idx}`,
    })),
  };
}

export interface PresetMatchResult {
  recipe: Recipe;
  activeReformulationQuestion: string;
}

/**
 * Recognizes the core homemade recipes typed in "O que você quer assar hoje?":
 * 1. "Cuca" (or "cuca de uva" / "cuca de banana") -> Cuca Alemã Caseira (500g farinha base, farofinha doce crocante + frutas)
 * 2. "Bolo de fubá" -> Bolo de Fubá Cremoso
 * 3. "Pão caseiro" -> Pão Caseiro Fofinho (500g farinha base, 2 pães médios)
 */
export function findPresetRecipeMatch(rawQuery: string): PresetMatchResult | null {
  const q = normalizeSearchText(rawQuery);
  if (!q) return null;

  // 1. Regra da Cuca (Cuca Alemã caseira com massa fofinha, cobertura de uva/banana e farofinha doce crocante, 500g farinha base)
  if (/\bcuca\b/.test(q)) {
    const wantsGrape = /\buva\b/.test(q);
    const wantsBanana = /\bbanana\b/.test(q);
    const otherFlavor =
      /\b(chocolate|goiabada|maca|abacaxi|morango|doce de leite|nata|ricota|requeijao|coco|maracuja)\b/.test(
        q
      );

    if (!otherFlavor || wantsGrape || wantsBanana) {
      const baseCuca = MASTER_RECIPES.find((r) => r.id === 'cuca-alema-caseira-vovo');
      if (baseCuca) {
        const cloned = cloneRecipeWithFreshIds(baseCuca);

        if (wantsGrape && !wantsBanana) {
          cloned.name = 'Cuca Alemã Caseira de Uva (com Farofinha Crocante)';
          cloned.description =
            'Cuca alemã caseira com massa fofinha de 500g de farinha, cobertura doce de uvas frescas e farofinha crocante de canela por cima.';
          cloned.ingredients = cloned.ingredients.map((ing) =>
            ing.id.startsWith('cuca-fruta-cobertura')
              ? {
                  ...ing,
                  name: 'Uvas Doces sem Semente (Cobertura)',
                  notes: 'Lavadas e bem sequinhas no pano de prato para não soltar água.',
                }
              : ing
          );
          cloned.steps = cloned.steps.map((st, idx) =>
            idx === 3
              ? {
                  ...st,
                  description:
                    'Acomode delicadamente as uvas sem semente lavadas e bem sequinhas por cima da massa fofinha já crescida e cubra tudo com a farofinha doce crocante. Leve ao forno pré-aquecido a 180°C por 35 a 40 minutos até a farofinha dourar e perfumar a casa inteira!',
                }
              : st
          );
        } else if (wantsBanana && !wantsGrape) {
          cloned.name = 'Cuca Alemã Caseira de Banana (com Farofinha Crocante)';
          cloned.description =
            'Cuca alemã caseira com massa fofinha de 500g de farinha, rodelas de banana madura e farofinha doce crocante de canela por cima.';
          cloned.ingredients = cloned.ingredients.map((ing) =>
            ing.id.startsWith('cuca-fruta-cobertura')
              ? {
                  ...ing,
                  name: 'Bananas Nanicas ou Prata Fatiadas (Cobertura)',
                  notes: 'Bananas bem maduras em rodelas médias (~3 bananas médias).',
                }
              : ing
          );
          cloned.steps = cloned.steps.map((st, idx) =>
            idx === 3
              ? {
                  ...st,
                  description:
                    'Acomode delicadamente as rodelas de banana por cima da massa fofinha já crescida e cubra tudo com a farofinha doce crocante de canela. Leve ao forno pré-aquecido a 180°C por 35 a 40 minutos até a farofinha ficar bem douradinha!',
                }
              : st
          );
        }

        return {
          recipe: cloned,
          activeReformulationQuestion:
            'Sua Cuca Alemã com 500g de farinha base está prontinha com medidas em xícaras e gramas! Quer trocar a fruta (uva ou banana), dobrar a receita para 1 kg de farinha ou deixar mais docinha?',
        };
      }
    }
  }

  // 2. Regra do Bolo de Fubá -> Bolo de Fubá Cremoso
  if (
    /\bbolo\s+(de\s+)?fuba\b/.test(q) ||
    q === 'fuba' ||
    q === 'fuba cremoso' ||
    q === 'bolo fuba cremoso'
  ) {
    const baseFuba = MASTER_RECIPES.find((r) => r.id === 'bolo-fuba-cremoso-vovo');
    if (baseFuba) {
      return {
        recipe: cloneRecipeWithFreshIds(baseFuba),
        activeReformulationQuestion:
          'Mudei para o Bolo de Fubá Cremoso da Vovó com todas as xícaras e gramas certinhas! Quer dobrar para uma festa, trocar o queijo por coco ou deixar menos doce?',
      };
    }
  }

  // 3. Regra do Pão Caseiro -> Pão Caseiro Fofinho (500g base, 2 pães médios)
  if (
    q === 'pao' ||
    q === 'pao caseiro' ||
    q === 'pao caseiro fofinho' ||
    q === 'pao fofinho' ||
    q === 'pao de vo' ||
    q === 'pao tradicional'
  ) {
    const basePao = MASTER_RECIPES.find((r) => r.id === 'pao-caseiro-fofinho-vovo');
    if (basePao) {
      return {
        recipe: cloneRecipeWithFreshIds(basePao),
        activeReformulationQuestion:
          'Seu Pão Caseiro Fofinho (500g de farinha, rende 2 pães médios) está pronto na bancada! Quer dobrar para 1 kg de farinha, fazer metade ou trocar a água por leite?',
      };
    }
  }

  return null;
}
