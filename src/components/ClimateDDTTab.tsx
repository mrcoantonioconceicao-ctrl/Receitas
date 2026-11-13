import React from 'react';
import { Recipe, MixerType } from '../types';
import { calculateDDT, calculateHydrationMetrics } from '../utils/bakersMath';
import {
  Thermometer,
  Droplets,
  Snowflake,
  AlertCircle,
  CheckCircle,
  Activity,
} from 'lucide-react';

interface ClimateDDTTabProps {
  recipe: Recipe;
  setRecipe: React.Dispatch<React.SetStateAction<Recipe>>;
}

export const ClimateDDTTab: React.FC<ClimateDDTTabProps> = ({
  recipe,
  setRecipe,
}) => {
  const { climate } = recipe;
  const hydration = calculateHydrationMetrics(recipe.ingredients, recipe.baseFlourWeight);
  const totalWaterWeight = hydration.formulaWaterWeight;

  const ddtResult = calculateDDT(climate, totalWaterWeight);

  const handleClimateChange = (field: keyof typeof climate, value: any) => {
    setRecipe((prev) => ({
      ...prev,
      climate: {
        ...prev.climate,
        [field]: value,
      },
    }));
  };

  const mixerPresets: { id: MixerType; label: string; friction: number; desc: string }[] = [
    {
      id: 'manual',
      label: 'Sova na Mão com Carinho',
      friction: 2,
      desc: 'Quase não esquenta a massa — ideal para pão caseiro',
    },
    {
      id: 'planetary',
      label: 'Batedeira Caseira (com Gancho)',
      friction: 10,
      desc: 'Bater na batedeira esquenta um pouquinho mais a massa',
    },
    {
      id: 'spiral_slow',
      label: 'Máquina de Pão Doméstica',
      friction: 5,
      desc: 'Aquecimento leve durante a mistura',
    },
    {
      id: 'spiral_fast',
      label: 'Batedeira Forte / Rápida',
      friction: 12,
      desc: 'Esquenta bastante a massa; pede água mais fresquinha',
    },
    {
      id: 'food_processor',
      label: 'Processador de Alimentos',
      friction: 15,
      desc: 'Esquenta rápido; use água bem gelada da geladeira',
    },
    {
      id: 'custom',
      label: 'Ajustar Manualmente',
      friction: climate.frictionFactor,
      desc: 'Escolha quanto o seu aparelho esquenta a massa',
    },
  ];

  // Friendly resting time guide based on kitchen temperature & humidity
  const getRestingAnalysis = (temp: number, humidity: number) => {
    let rate = 'Tempo Normal (Dia Agradável)';
    let firstRest = '50 min a 1h';
    let secondRest = '35 min a 45 min';
    let advice =
      'Clima perfeito na cozinha! A massa vai crescer devagarinho, ficar macia e com um aroma maravilhoso.';
    let color = 'text-emerald-400';

    if (temp <= 20) {
      rate = 'Cresce Mais Devagar (Dia Frio)';
      firstRest = '1h30 a 2h';
      secondRest = '1h a 1h20';
      advice =
        'Como está friozinho, o fermento demora mais para acordar. Use água mais morninha e deixe a tigela coberta dentro do forno desligado!';
      color = 'text-cyan-400';
    } else if (temp >= 28 && temp < 32) {
      rate = 'Cresce Bem Rápido (Dia Quente)';
      firstRest = '35 min a 45 min';
      secondRest = '25 min a 35 min';
      advice =
        'Está calor na cozinha! Fique de olho para a massa não crescer demais e passar do ponto. Use água fresca ou em temperatura ambiente.';
      color = 'text-amber-400';
    } else if (temp >= 32) {
      rate = 'Cresce Muito Rápido (Calor Forte)';
      firstRest = '25 min a 35 min';
      secondRest = '20 min a 25 min';
      advice =
        'Dia muito quente! Use água bem gelada da geladeira para a massa não ficar mole demais e não passar do ponto.';
      color = 'text-red-400';
    }

    let humidityAdvice = 'Umidade ótima na cozinha: a massa não resseca fácil.';
    if (humidity < 50) {
      humidityAdvice =
        'Ar bem seco hoje: mantenha a tigela sempre bem coberta com pano úmido ou plástico para a casquinha não ressecar.';
    } else if (humidity > 75) {
      humidityAdvice =
        'Dia bem úmido: coloque a farinha aos poucos na hora de sovar, pois a massa pode pedir um punhadinho a mais.';
    }

    return { rate, firstRest, secondRest, advice, color, humidityAdvice };
  };

  const kinetics = getRestingAnalysis(climate.roomTemp, climate.relativeHumidity);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-stone-400">
              <span className="font-semibold text-cyan-300">O Segredo da Água</span>
              <span aria-hidden="true">·</span>
              <span>Temperatura Perfeita para Crescer</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              A Temperatura Ideal da Água para o seu Pão Crescer Lindo
            </h2>
            <p className="text-xs text-stone-300 mt-1 max-w-2xl leading-relaxed">
              O segredinho de vó: a água deve estar morninha como banho de bebê ao encostar no pulso! Se estiver quente demais, queima o fermento. Se a sua cozinha estiver muito quente no verão, a água deve ser mais fresca ou gelada para a massa não desandar.
            </p>
          </div>
        </div>
      </div>

      {/* Main Output Display */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Output Card: Target Water Temp */}
        <div className="bg-gradient-to-br from-stone-900 to-stone-950 border border-stone-800 rounded-2xl p-6 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span className="font-semibold uppercase tracking-wider">Temperatura da Água</span>
            <Droplets className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl sm:text-5xl font-extrabold font-mono tabular-nums text-cyan-400">
              {ddtResult.waterTempTarget.toFixed(0)}
            </span>
            <span className="text-xl font-mono text-stone-400">°C</span>
          </div>
          <p className="text-xs text-stone-300 mt-3 leading-relaxed">
            {ddtResult.waterTempTarget >= 32
              ? 'Água morninha (teste com o dedo: morninha suave, sem nunca queimar!).'
              : ddtResult.waterTempTarget >= 22
              ? 'Água fresquinha em temperatura ambiente direto do filtro.'
              : 'Dia quente! Use água gelada da geladeira para a massa ficar gostosa de sovar.'}
          </p>

          <div className="mt-4 pt-3 border-t border-stone-800 text-[11px] text-amber-300/80">
            💡 Dica da Vovó: Coloque uma gotinha no pulso — tem que ser agradável e suave, nunca pelando.
          </div>
        </div>

        {/* Output Card: Ice Engine */}
        <div className="bg-gradient-to-br from-stone-900 to-stone-950 border border-stone-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span className="font-semibold uppercase tracking-wider">Precisa de Água Gelada?</span>
            <Snowflake className="w-4 h-4 text-sky-400" />
          </div>

          {ddtResult.needsIce ? (
            <div className="mt-4">
              <div className="flex items-baseline gap-2 text-sky-300">
                <span className="text-4xl font-extrabold font-mono tabular-nums">
                  {ddtResult.iceWeight}
                </span>
                <span className="text-lg font-mono text-stone-400">g de gelo</span>
              </div>
              <div className="mt-2 text-xs text-stone-300 flex items-center justify-between">
                <span>+ Água gelada:</span>
                <span className="font-mono font-bold text-white">{ddtResult.liquidWaterWeight} g</span>
              </div>
              <div className="mt-3 p-2 bg-sky-950/40 border border-sky-900/50 rounded-lg text-[11px] text-sky-200">
                Está calor! Misture umas pedrinhas de gelo na água para a massa não ficar grudenta na mão.
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle className="w-5 h-5 shrink-0" />
                <span>Sem necessidade de gelo</span>
              </div>
              <p className="text-xs text-stone-300 mt-2 leading-relaxed">
                Água morninha comum é perfeita para acordar o fermento de pacotinho e deixar o pão crescer bem fofinho.
              </p>
            </div>
          )}

          {ddtResult.warningMessage && (
            <div className="mt-3 p-2.5 bg-red-950/40 border border-red-900/50 rounded-lg text-xs text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{ddtResult.warningMessage}</span>
            </div>
          )}
        </div>

        {/* Output Card: Resting Time */}
        <div className="bg-gradient-to-br from-stone-900 to-stone-950 border border-stone-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span className="font-semibold uppercase tracking-wider">Tempo de Descanso</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className={`mt-4 text-base font-bold ${kinetics.color}`}>{kinetics.rate}</div>
          <div className="mt-3 space-y-1.5 text-xs">
            <div className="flex justify-between text-stone-300">
              <span>1º Descanso (na tigela):</span>
              <strong className="font-mono text-white">{kinetics.firstRest}</strong>
            </div>
            <div className="flex justify-between text-stone-300">
              <span>2º Descanso (já na fôrma):</span>
              <strong className="font-mono text-white">{kinetics.secondRest}</strong>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-stone-800 text-[11px] text-stone-300 leading-relaxed">
            {kinetics.advice}
          </div>
        </div>
      </div>

      {/* Kitchen Climate Controls */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
        <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
          <Thermometer className="w-4 h-4 text-cyan-400" />
          <span>Como Está o Tempo na Sua Cozinha Hoje?</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Room Temp */}
          <div className="bg-stone-950/70 border border-stone-800 p-4 rounded-xl">
            <div className="flex justify-between items-center text-xs text-stone-400 mb-1">
              <span>Temperatura da Cozinha</span>
              <span className="font-mono text-cyan-400 font-bold">{climate.roomTemp}°C</span>
            </div>
            <input
              type="range"
              min="10"
              max="42"
              step="0.5"
              value={climate.roomTemp}
              onChange={(e) => handleClimateChange('roomTemp', parseFloat(e.target.value))}
              className="w-full accent-cyan-400"
            />
            <div className="flex justify-between text-[10px] text-stone-400 mt-1">
              <span>Dia Frio (10°C)</span>
              <span>Agradável (24°C)</span>
              <span>Calorão (42°C)</span>
            </div>
          </div>

          {/* Flour Temp */}
          <div className="bg-stone-950/70 border border-stone-800 p-4 rounded-xl">
            <div className="flex justify-between items-center text-xs text-stone-400 mb-1">
              <span>Temperatura da Farinha no Armário</span>
              <span className="font-mono text-amber-400 font-bold">{climate.flourTemp}°C</span>
            </div>
            <input
              type="range"
              min="5"
              max="35"
              step="0.5"
              value={climate.flourTemp}
              onChange={(e) => handleClimateChange('flourTemp', parseFloat(e.target.value))}
              className="w-full accent-amber-400"
            />
            <div className="flex justify-between text-[10px] text-stone-400 mt-1">
              <span>Geladeira (5°C)</span>
              <span>Armário (22°C)</span>
              <span>Muito Quente (35°C)</span>
            </div>
          </div>

          {/* Desired Dough Temp */}
          <div className="bg-stone-950/70 border border-stone-800 p-4 rounded-xl">
            <div className="flex justify-between items-center text-xs text-stone-400 mb-1">
              <span className="text-white font-medium">Calor Ideal da Massa Pronta</span>
              <span className="font-mono text-emerald-400 font-bold">{climate.desiredDoughTemp}°C</span>
            </div>
            <input
              type="range"
              min="20"
              max="29"
              step="0.5"
              value={climate.desiredDoughTemp}
              onChange={(e) => handleClimateChange('desiredDoughTemp', parseFloat(e.target.value))}
              className="w-full accent-emerald-400"
            />
            <div className="flex justify-between text-[10px] text-stone-400 mt-1">
              <span>Massa Doce (22°C)</span>
              <span>Pão Macio (25°C)</span>
              <span>Pão Caseiro (26°C)</span>
            </div>
          </div>

          {/* Tap Water Temp */}
          <div className="bg-stone-950/70 border border-stone-800 p-4 rounded-xl">
            <div className="flex justify-between items-center text-xs text-stone-400 mb-1">
              <span>Água da Torneira / Filtro Hoje</span>
              <span className="font-mono text-stone-200 font-bold">{climate.tapWaterTemp}°C</span>
            </div>
            <input
              type="range"
              min="2"
              max="35"
              step="0.5"
              value={climate.tapWaterTemp}
              onChange={(e) => handleClimateChange('tapWaterTemp', parseFloat(e.target.value))}
              className="w-full accent-stone-300"
            />
            <div className="flex justify-between text-[10px] text-stone-400 mt-1">
              <span>Geladeira (4°C)</span>
              <span>Filtro (21°C)</span>
              <span>Verão (30°C)</span>
            </div>
          </div>

          {/* Relative Humidity */}
          <div className="bg-stone-950/70 border border-stone-800 p-4 rounded-xl">
            <div className="flex justify-between items-center text-xs text-stone-400 mb-1">
              <span>Umidade do Ar Hoje</span>
              <span className="font-mono text-sky-400 font-bold">{climate.relativeHumidity}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="95"
              step="1"
              value={climate.relativeHumidity}
              onChange={(e) => handleClimateChange('relativeHumidity', parseInt(e.target.value))}
              className="w-full accent-sky-400"
            />
            <div className="text-[10px] text-stone-400 mt-1 leading-tight">
              {kinetics.humidityAdvice}
            </div>
          </div>

          {/* Pre-mix option */}
          <div className="bg-stone-950/70 border border-stone-800 p-4 rounded-xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-stone-300 font-medium">Usou Esponja Prévia?</span>
              <input
                type="checkbox"
                checked={climate.hasPreferment}
                onChange={(e) => handleClimateChange('hasPreferment', e.target.checked)}
                className="w-4 h-4 accent-amber-500 rounded"
              />
            </div>
            {climate.hasPreferment ? (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-stone-400 mb-1">
                  <span>Temperatura da Esponja</span>
                  <span className="font-mono text-amber-300 font-bold">{climate.prefermentTemp}°C</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="30"
                  step="0.5"
                  value={climate.prefermentTemp}
                  onChange={(e) => handleClimateChange('prefermentTemp', parseFloat(e.target.value))}
                  className="w-full accent-amber-400"
                />
              </div>
            ) : (
              <p className="text-[11px] text-stone-400 mt-1">
                Receita direta na tigela (jeito mais fácil e rápido de fazer em casa).
              </p>
            )}
          </div>
        </div>

        {/* How you knead */}
        <div className="mt-6 pt-6 border-t border-stone-800">
          <label className="text-xs font-semibold text-stone-300 block mb-3">
            Como Você Vai Misturar e Sovar a Massa?
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {mixerPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  handleClimateChange('mixerType', preset.id);
                  if (preset.id !== 'custom') {
                    handleClimateChange('frictionFactor', preset.friction);
                  }
                }}
                className={`p-3 rounded-xl border text-left transition ${
                  climate.mixerType === preset.id
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-200 shadow-sm'
                    : 'bg-stone-950/60 border-stone-800/80 text-stone-400 hover:text-stone-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">{preset.label}</span>
                  <span className="font-mono text-xs font-semibold text-amber-400">
                    +{preset.id === 'custom' ? climate.frictionFactor : preset.friction}°C
                  </span>
                </div>
                <p className="text-[11px] text-stone-400 mt-1 line-clamp-1">{preset.desc}</p>
              </button>
            ))}
          </div>

          {climate.mixerType === 'custom' && (
            <div className="mt-3 p-3 bg-stone-950 border border-stone-800 rounded-xl flex items-center justify-between max-w-sm">
              <span className="text-xs text-stone-300">Quanto esquenta (°C):</span>
              <input
                type="number"
                step="0.5"
                min="0"
                max="25"
                value={climate.frictionFactor}
                onChange={(e) => handleClimateChange('frictionFactor', parseFloat(e.target.value) || 0)}
                className="w-20 bg-stone-900 border border-stone-700 rounded px-2 py-1 text-right font-mono text-amber-400 font-bold focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
