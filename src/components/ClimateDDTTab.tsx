import React from 'react';
import { Recipe, MixerType } from '../types';
import { calculateDDT, calculateHydrationMetrics } from '../utils/bakersMath';
import { 
  Thermometer, 
  Wind, 
  Droplets, 
  Flame, 
  RotateCcw, 
  Snowflake, 
  AlertCircle, 
  CheckCircle,
  HelpCircle,
  Activity
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
    { id: 'manual', label: 'Sova Manual / Mão', friction: 2, desc: 'Fricção mínima (1°C a 2°C) pelo calor das mãos e bancada' },
    { id: 'spiral_slow', label: 'Masseira Espiral (Velocidade 1)', friction: 5, desc: 'Baixo aquecimento mecânico (4°C a 6°C)' },
    { id: 'spiral_fast', label: 'Masseira Espiral (Velocidade 2)', friction: 9, desc: 'Desenvolvimento rápido de glúten (8°C a 10°C)' },
    { id: 'planetary', label: 'Batedeira Planetária / Doméstica', friction: 12, desc: 'Atrito moderado-alto nas paredes do bowl (11°C a 13°C)' },
    { id: 'food_processor', label: 'Processador / Masseira Rápida', friction: 15, desc: 'Fricção extrema por cisalhamento de lâminas (14°C a 18°C)' },
    { id: 'custom', label: 'Fator Calibrado pelo Padeiro', friction: climate.frictionFactor, desc: 'Valor personalizado medido em seu equipamento' },
  ];

  // Fermentation Kinetics Estimation based on Room Temperature
  const getKineticsAnalysis = (temp: number, humidity: number) => {
    let rate = 'Normal';
    let bulkEstimate = '3.5h - 4.5h';
    let appretEstimate = '2.0h - 2.5h';
    let advice = 'Condições ideais de fermentação equilibrada entre leveduras e bactérias láticas.';
    let color = 'text-emerald-400';

    if (temp <= 20) {
      rate = 'Retardada (Cinética Lenta)';
      bulkEstimate = '5h - 7h';
      appretEstimate = '3h - 4h';
      advice = 'Temperatura fria desacelera a produção de CO2 e favorece notas acéticas. Recomendado utilizar água mais morna ou estufa.';
      color = 'text-cyan-400';
    } else if (temp >= 28 && temp < 32) {
      rate = 'Acelerada (Rápida)';
      bulkEstimate = '2h - 3h';
      appretEstimate = '1h - 1.5h';
      advice = 'Cinética acelerada. Reduza o fermento biológico ou utilize água gelada para desacelerar a fermentação em bloco.';
      color = 'text-amber-400';
    } else if (temp >= 32) {
      rate = 'Hiper-Cinética (Risco de Degradação Proteolítica)';
      bulkEstimate = '1.5h - 2h';
      appretEstimate = '45min - 1h';
      advice = 'ALERTA: Alto risco de perda de tensão da malha (massa solarizada) e acidez excessiva. Uso obrigatório de gelo picado!';
      color = 'text-red-400';
    }

    let humidityAdvice = 'Umidade adequada. Boa elasticidade de crosta.';
    if (humidity < 50) {
      humidityAdvice = 'Ambiente seco (<50% UR). Risco de ressecamento da superfície ("casca grossa/pele de crocodilo") durante o descanso. Mantenha caixas de fermentação bem vedadas.';
    } else if (humidity > 75) {
      humidityAdvice = 'Ambiente muito úmido (>75% UR). A massa absorve menos água da bancada; a casca pode demorar mais para dourar no forno.';
    }

    return { rate, bulkEstimate, appretEstimate, advice, color, humidityAdvice };
  };

  const kinetics = getKineticsAnalysis(climate.roomTemp, climate.relativeHumidity);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono">
                O SEGREDO DA ÁGUA
              </span>
              <span className="text-xs text-stone-400">Temperatura Perfeita para Crescer</span>
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

      {/* Main Thermal Output Display */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Output Card: Target Water Temp */}
        <div className="bg-gradient-to-br from-stone-900 to-stone-950 border border-stone-800 rounded-2xl p-6 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span className="font-semibold uppercase tracking-wider">Temperatura Recomendada</span>
            <Droplets className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl sm:text-5xl font-extrabold font-mono text-cyan-400">
              {ddtResult.waterTempTarget.toFixed(0)}
            </span>
            <span className="text-xl font-mono text-stone-400">°C</span>
          </div>
          <p className="text-xs text-stone-300 mt-3 leading-relaxed">
            {ddtResult.waterTempTarget >= 32
              ? 'Água morninha (teste com o dedo: morninha suave, sem queimar!).'
              : ddtResult.waterTempTarget >= 22
              ? 'Água em temperatura ambiente fresquinha da torneira.'
              : 'Dia quente! Use água gelada da geladeira para a massa não amolecer demais.'}
          </p>

          <div className="mt-4 pt-3 border-t border-stone-800 text-[11px] text-amber-300/80">
            💡 Dica da Vovó: Coloque uma gota no pulso — tem que ser agradável e quentinha, nunca pelando.
          </div>
        </div>

        {/* Output Card: Ice Engine */}
        <div className="bg-gradient-to-br from-stone-900 to-stone-950 border border-stone-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span className="font-semibold uppercase tracking-wider">Precisa de Água Gelada / Gelo?</span>
            <Snowflake className="w-4 h-4 text-sky-400" />
          </div>

          {ddtResult.needsIce ? (
            <div className="mt-4">
              <div className="flex items-baseline gap-2 text-sky-300">
                <span className="text-4xl font-extrabold font-mono">{ddtResult.iceWeight}</span>
                <span className="text-lg font-mono text-stone-400">g de gelo</span>
              </div>
              <div className="mt-2 text-xs text-stone-300 flex items-center justify-between">
                <span>+ Água gelada:</span>
                <span className="font-mono font-bold text-white">{ddtResult.liquidWaterWeight} g</span>
              </div>
              <div className="mt-3 p-2 bg-sky-950/40 border border-sky-900/50 rounded-lg text-[11px] text-sky-200">
                Está calor! Junte pedrinhas de gelo na água para a massa não ficar pegajosa ao sovar.
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle className="w-5 h-5 shrink-0" />
                <span>Sem necessidade de gelo</span>
              </div>
              <p className="text-xs text-stone-300 mt-2 leading-relaxed">
                Água morninha comum é perfeita para ativar o fermento biológico e deixar a massa crescer levinha.
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

        {/* Output Card: Fermentation Kinetic Velocity */}
        <div className="bg-gradient-to-br from-stone-900 to-stone-950 border border-stone-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span className="font-semibold uppercase tracking-wider">Tempo Estimado de Descanso</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className={`mt-4 text-base font-bold ${kinetics.color}`}>
            {kinetics.rate}
          </div>
          <div className="mt-3 space-y-1.5 text-xs">
            <div className="flex justify-between text-stone-300">
              <span>Primeiro Descanso da Massa:</span>
              <strong className="font-mono text-white">{kinetics.bulkEstimate}</strong>
            </div>
            <div className="flex justify-between text-stone-300">
              <span>Segundo Descanso (na fôrma):</span>
              <strong className="font-mono text-white">{kinetics.appretEstimate}</strong>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-stone-800 text-[11px] text-stone-300 leading-relaxed">
            {kinetics.advice}
          </div>
        </div>
      </div>

      {/* Climate Parameters Input Board */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
        <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
          <Thermometer className="w-4 h-4 text-cyan-400" />
          <span>Variáveis Ambientais & Calibração do Equipamento</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Room Temp */}
          <div className="bg-stone-950/70 border border-stone-800 p-4 rounded-xl">
            <div className="flex justify-between items-center text-xs text-stone-400 mb-1">
              <span>Temperatura Ambiente (Sala)</span>
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
              <span>Frio (10°C)</span>
              <span>Conforto (24°C)</span>
              <span>Calor (42°C)</span>
            </div>
          </div>

          {/* Flour Temp */}
          <div className="bg-stone-950/70 border border-stone-800 p-4 rounded-xl">
            <div className="flex justify-between items-center text-xs text-stone-400 mb-1">
              <span>Temperatura da Farinha</span>
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
              <span>Gelada (5°C)</span>
              <span>Ambiente (22°C)</span>
              <span>Estoque quente (35°C)</span>
            </div>
          </div>

          {/* Desired Dough Temp (DDT) */}
          <div className="bg-stone-950/70 border border-stone-800 p-4 rounded-xl">
            <div className="flex justify-between items-center text-xs text-stone-400 mb-1">
              <span className="text-white font-medium">DDT Alvo da Massa</span>
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
              <span>Brioche (22°C)</span>
              <span>Sourdough (24.5°C)</span>
              <span>Pão Francês (26°C)</span>
            </div>
          </div>

          {/* Tap Water Temp */}
          <div className="bg-stone-950/70 border border-stone-800 p-4 rounded-xl">
            <div className="flex justify-between items-center text-xs text-stone-400 mb-1">
              <span>Temperatura da Água da Torneira</span>
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
              <span>Torneira (21°C)</span>
              <span>Verão (30°C)</span>
            </div>
          </div>

          {/* Relative Humidity */}
          <div className="bg-stone-950/70 border border-stone-800 p-4 rounded-xl">
            <div className="flex justify-between items-center text-xs text-stone-400 mb-1">
              <span>Umidade Relativa do Ar (UR)</span>
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

          {/* Preferment Option */}
          <div className="bg-stone-950/70 border border-stone-800 p-4 rounded-xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-stone-300 font-medium">Incluir Pré-fermento no DDT?</span>
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
                  <span>Temp do Pré-fermento</span>
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
                Fórmula direta sem pré-fermento computado no balanço térmico.
              </p>
            )}
          </div>
        </div>

        {/* Mixer Presets & Friction Factor */}
        <div className="mt-6 pt-6 border-t border-stone-800">
          <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-3">
            Tipo de Equipamento / Fator de Fricção Mecânica (°C):
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
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-stone-900 text-amber-400 border border-stone-800">
                    +{preset.id === 'custom' ? climate.frictionFactor : preset.friction}°C
                  </span>
                </div>
                <p className="text-[11px] text-stone-400 mt-1 line-clamp-1">{preset.desc}</p>
              </button>
            ))}
          </div>

          {climate.mixerType === 'custom' && (
            <div className="mt-3 p-3 bg-stone-950 border border-stone-800 rounded-xl flex items-center justify-between max-w-sm">
              <span className="text-xs text-stone-300">Fator de fricção medido (°C):</span>
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
