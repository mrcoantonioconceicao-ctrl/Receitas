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
 * Reconhecimento completo do cardápio da casa digitado em "O que você quer assar hoje?":
 * 1. "Cuca" (uva ou banana)
 * 2. "Prestígio"
 * 3. "Bolo de cenoura" (antes de chocolate por causa da calda)
 * 4. "Nega maluca" / "Bolo de chocolate"
 * 5. "Bolo de laranja"
 * 6. "Bolo de milho cremoso" / "Bolo de milho"
 * 7. "Bolo de fubá"
 * 8. "Pão de ló" (antes de pão caseiro)
 * 9. "Rosca doce" / "Rosca"
 * 10. "Massa podre"
 * 11. "Massa de lasanha" / "Lasanha"
 * 12. "Pão caseiro" / "Pão"
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

  // 2. Regra do Prestígio (antes de bolo de chocolate para não conflitar)
  if (/\bprestigio\b/.test(q) || /\bchocolate\s+(com\s+)?coco\b/.test(q)) {
    const basePrestigio = MASTER_RECIPES.find((r) => r.id === 'bolo-prestigio-caseiro-vovo');
    if (basePrestigio) {
      return {
        recipe: cloneRecipeWithFreshIds(basePrestigio),
        activeReformulationQuestion:
          'Seu Bolo Prestígio da Vovó (massa de chocolate + recheio cremoso de coco com leite condensado e creme de leite) já está na bancada! Quer dobrar para uma fôrma bem grande ou fazer uma calda extra de chocolate por cima?',
      };
    }
  }

  // 3. Regra do Bolo de Cenoura (antes de chocolate para não confundir pela calda)
  if (/\bcenoura\b/.test(q)) {
    const baseCenoura = MASTER_RECIPES.find((r) => r.id === 'bolo-cenoura-calda-chocolate');
    if (baseCenoura) {
      return {
        recipe: cloneRecipeWithFreshIds(baseCenoura),
        activeReformulationQuestion:
          'Seu Bolo de Cenoura Fofinho da Vovó com calda caseira de chocolate já está na bancada! Quer dobrar a receita para uma assadeira grande ou ajustar a calda?',
      };
    }
  }

  // 4. Regra da Nega Maluca / Bolo de Chocolate de Liquidificador
  if (
    /\bnega\s*maluca\b/.test(q) ||
    /\bbolo\s+(de\s+)?chocolate\b/.test(q) ||
    q === 'chocolate' ||
    q === 'bolo chocolate'
  ) {
    const baseNegaMaluca = MASTER_RECIPES.find((r) => r.id === 'bolo-nega-maluca-chocolate');
    if (baseNegaMaluca) {
      return {
        recipe: cloneRecipeWithFreshIds(baseNegaMaluca),
        activeReformulationQuestion:
          'Sua Nega Maluca com água fervendo e calda quente de chocolate já está prontinha com xícaras e gramas! Quer dobrar para uma assadeira grande ou ajustar a quantidade de açúcar?',
      };
    }
  }

  // 5. Regra do Bolo de Laranja
  if (/\blaranja\b/.test(q)) {
    const baseLaranja = MASTER_RECIPES.find((r) => r.id === 'bolo-laranja-fofinho-vovo');
    if (baseLaranja) {
      return {
        recipe: cloneRecipeWithFreshIds(baseLaranja),
        activeReformulationQuestion:
          'Seu Bolo de Laranja Fofinho da Vovó (com laranja fresca e calda de suco de laranja com açúcar) está prontinho na bancada! Quer dobrar a receita ou fazer metade?',
      };
    }
  }

  // 6. Regra do Bolo de Milho Cremoso
  if (/\bmilho\b/.test(q)) {
    const baseMilho = MASTER_RECIPES.find((r) => r.id === 'bolo-milho-cremoso-vovo');
    if (baseMilho) {
      return {
        recipe: cloneRecipeWithFreshIds(baseMilho),
        activeReformulationQuestion:
          'Seu Bolo de Milho Cremoso de liquidificador (com milho verde, leite, fubá, queijo ralado e manteiga) já está na bancada! Quer dobrar a receita para uma festa ou trocar o queijo?',
      };
    }
  }

  // 7. Regra do Bolo de Fubá -> Bolo de Fubá Cremoso
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

  // 8. Regra do Pão de Ló Clássico (antes de pão caseiro)
  if (/\bpao\s+(de\s+)?lo\b/.test(q)) {
    const basePaoDeLo = MASTER_RECIPES.find((r) => r.id === 'pao-de-lo-classico-vovo');
    if (basePaoDeLo) {
      return {
        recipe: cloneRecipeWithFreshIds(basePaoDeLo),
        activeReformulationQuestion:
          'Seu Pão de Ló Clássico (leve, alto e fofinho para rechear) está pronto na bancada com todas as medidas! Quer dobrar para uma fôrma alta de festa ou quer sugestões de caldinha e recheio?',
      };
    }
  }

  // 9. Regra da Rosca Doce Trançada
  if (/\brosca\b/.test(q)) {
    const baseRosca = MASTER_RECIPES.find((r) => r.id === 'rosca-doce-trancada');
    if (baseRosca) {
      return {
        recipe: cloneRecipeWithFreshIds(baseRosca),
        activeReformulationQuestion:
          'Sua Rosca Doce Trançada da Vovó (com massa fofinha de leite, ovos, açúcar e manteiga, pincelada com gema e açúcar cristal) já está na bancada! Quer dobrar para 1 kg de farinha ou adicionar erva-doce?',
      };
    }
  }

  // 10. Regra da Massa Podre (empadas e tortas)
  if (/\bmassa\s+podre\b/.test(q) || /\bempadao?\b/.test(q)) {
    const baseMassaPodre = MASTER_RECIPES.find((r) => r.id === 'massa-podre-empada-torta');
    if (baseMassaPodre) {
      return {
        recipe: cloneRecipeWithFreshIds(baseMassaPodre),
        activeReformulationQuestion:
          'Sua Massa Podre Amanteigada (para empadas e tortas salgadas) já está na bancada! Quer fazer metade com 250g de farinha ou sugestões de recheio cremoso de frango?',
      };
    }
  }

  // 11. Regra da Massa de Lasanha / Lasanha
  if (/\blasanha\b/.test(q) || /\bmacarrao\s+caseiro\b/.test(q)) {
    const baseLasanha = MASTER_RECIPES.find((r) => r.id === 'massa-lasanha-caseira-fresca');
    if (baseLasanha) {
      return {
        recipe: cloneRecipeWithFreshIds(baseLasanha),
        activeReformulationQuestion:
          'Sua Massa Caseira Fresca de Lasanha (aberta no rolo com farinha, ovos e azeite) está prontinha na bancada! Quer fazer metade para uma travessa pequena ou dobrar?',
      };
    }
  }

  // 12. Regra do Pão de Forma ou Pão de Minuto se digitados direto
  if (/\bpao\s+(de\s+)?forma\b/.test(q)) {
    const baseForma = MASTER_RECIPES.find((r) => r.id === 'pao-de-forma-caseiro');
    if (baseForma) {
      return {
        recipe: cloneRecipeWithFreshIds(baseForma),
        activeReformulationQuestion:
          'Seu Pão de Forma Macio da Vovó (500g de farinha, rende 2 pães de fôrma) está pronto na bancada! Quer dobrar para 1 kg ou fazer metade?',
      };
    }
  }

  if (/\bpao\s+(de\s+)?minuto\b/.test(q)) {
    const baseMinuto = MASTER_RECIPES.find((r) => r.id === 'pao-de-minuto-rapido');
    if (baseMinuto) {
      return {
        recipe: cloneRecipeWithFreshIds(baseMinuto),
        activeReformulationQuestion:
          'Seu Pão de Minuto Rápido (rende 12 pãezinhos sem esperar crescer) está pronto na bancada! Quer dobrar para fazer 24 pãezinhos?',
      };
    }
  }

  // 13. Regra do Pão Caseiro -> Pão Caseiro Fofinho (500g base, 2 pães médios)
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
