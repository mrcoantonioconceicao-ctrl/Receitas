import React, { useState } from 'react';
import { Recipe } from '../types';
import { Wheat } from 'lucide-react';
import paoCaseiroImg from '../assets/images/pao_caseiro_fofinho_1794874815539.jpg';
import boloFubaImg from '../assets/images/bolo_fuba_cremoso_1794874815374.jpg';
import cucaAlemaImg from '../assets/images/cuca_alema_caseira_1794874816631.jpg';
import paoFormaImg from '../assets/images/pao_de_forma_1794874816370.jpg';
import roscaDoceImg from '../assets/images/rosca_doce_trancada_1794874817109.jpg';
import paoMinutoImg from '../assets/images/pao_de_minuto_1794874818117.jpg';
import paoDeLoImg from '../assets/images/pao_de_lo_classico_1794874983385.jpg';
import negaMalucaImg from '../assets/images/bolo_nega_maluca_1794874984081.jpg';
import prestigioImg from '../assets/images/bolo_prestigio_coco_1794874983017.jpg';
import boloMilhoImg from '../assets/images/bolo_milho_cremoso_1794917058712.jpg';
import massaPodreImg from '../assets/images/massa_podre_torta_1794917059668.jpg';
import massaLasanhaImg from '../assets/images/massa_lasanha_fresca_1794917060207.jpg';
import boloLaranjaImg from '../assets/images/bolo_de_laranja_1794917061724.jpg';
import boloCenouraImg from '../assets/images/bolo_de_cenoura_1794917061263.jpg';
import empadaoFrangoImg from '../assets/images/empadao_de_frango_1794922115990.jpg';

interface RecipePhotoProps {
  recipe: Recipe;
  className?: string;
}

export function resolveRecipePhotoUrl(recipe: Recipe): string | undefined {
  if (recipe.imageUrl) return recipe.imageUrl;

  const lower = recipe.name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (lower.includes('prestigio')) return prestigioImg;
  if (lower.includes('cenoura')) return boloCenouraImg;
  if (lower.includes('laranja')) return boloLaranjaImg;
  if (lower.includes('empadao') || lower.includes('pastelao') || lower.includes('torta de frango')) {
    return empadaoFrangoImg;
  }
  if (lower.includes('milho')) return boloMilhoImg;
  if (lower.includes('massa podre') || lower.includes('empada')) return massaPodreImg;
  if (lower.includes('lasanha')) return massaLasanhaImg;
  if (lower.includes('nega maluca') || lower.includes('bolo de chocolate') || lower.includes('chocolate')) {
    return negaMalucaImg;
  }
  if (lower.includes('pao de lo')) return paoDeLoImg;
  if (lower.includes('cuca')) return cucaAlemaImg;
  if (lower.includes('fuba')) return boloFubaImg;
  if (lower.includes('forma')) return paoFormaImg;
  if (lower.includes('rosca')) return roscaDoceImg;
  if (lower.includes('minuto')) return paoMinutoImg;
  if (lower.includes('pao caseiro') || lower.includes('pao fofinho') || recipe.type === 'bread') {
    return paoCaseiroImg;
  }
  return undefined;
}

export const RecipePhoto: React.FC<RecipePhotoProps> = ({ recipe, className = '' }) => {
  const [failed, setFailed] = useState(false);
  const src = resolveRecipePhotoUrl(recipe);

  if (!src || failed) {
    return (
      <div
        className={`bg-gradient-to-br from-stone-800 via-amber-950/40 to-stone-900 border border-stone-700/80 flex flex-col items-center justify-center p-4 text-center ${className}`}
        aria-label={recipe.name}
      >
        <Wheat className="w-8 h-8 text-amber-400 mb-2" />
        <span className="text-xs font-semibold text-stone-200 line-clamp-2">{recipe.name}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`Foto ilustrativa de ${recipe.name}`}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`object-cover bg-stone-950 ${className}`}
    />
  );
};
