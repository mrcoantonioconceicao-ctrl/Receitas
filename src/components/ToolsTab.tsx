import React, { useState } from 'react';
import { convertYeast, calculateTangzhong } from '../utils/bakersMath';
import { 
  Calculator, 
  RotateCcw, 
  Layers, 
  Droplet, 
  Flame, 
  Scale, 
  Info,
  CheckCircle2
} from 'lucide-react';

export const ToolsTab: React.FC = () => {
  // Yeast converter state
  const [yeastAmount, setYeastAmount] = useState<number>(10);
  const [yeastType, setYeastType] = useState<'instant_dry' | 'active_dry' | 'fresh' | 'levain_100'>('instant_dry');
  const yeastResults = convertYeast(yeastAmount, yeastType);

  // Tangzhong calculator state
  const [tangFlourTotal, setTangFlourTotal] = useState<number>(1000);
  const [tangPct, setTangPct] = useState<number>(7);
  const [tangRatio, setTangRatio] = useState<number>(5); // 1:5 for Tangzhong, 1:2 for Yudane
  const tangResult = calculateTangzhong(tangFlourTotal, tangPct, tangRatio);

  // Bake loss calculator state
  const [rawDoughWeight, setRawDoughWeight] = useState<number>(850);
  const [bakedDoughWeight, setBakedDoughWeight] = useState<number>(720);
  const bakeLossPct = rawDoughWeight > 0 ? ((rawDoughWeight - bakedDoughWeight) / rawDoughWeight) * 100 : 0;

  // Cup to grams converter state
  const [cupItem, setCupItem] = useState<string>('flour');
  const [cupQuantity, setCupQuantity] = useState<number>(2);

  const ingredientDensities: Record<string, { label: string; gramsPerCup: number; unitDesc: string }> = {
    flour: { label: 'Farinha de Trigo (arejada/peneirada)', gramsPerCup: 125, unitDesc: '1 xícara = 125g' },
    flour_rye: { label: 'Farinha de Centeio', gramsPerCup: 110, unitDesc: '1 xícara = 110g' },
    sugar_refined: { label: 'Açúcar Cristal / Refinado', gramsPerCup: 200, unitDesc: '1 xícara = 200g' },
    sugar_brown: { label: 'Açúcar Mascavo (compactado)', gramsPerCup: 220, unitDesc: '1 xícara = 220g' },
    butter: { label: 'Manteiga', gramsPerCup: 225, unitDesc: '1 xícara = 225g (1 colher sopa = 14g)' },
    water_milk: { label: 'Água / Leite Integral', gramsPerCup: 240, unitDesc: '1 xícara = 240g' },
    oil: { label: 'Óleo Vegetal / Azeite', gramsPerCup: 220, unitDesc: '1 xícara = 220g' },
    honey: { label: 'Mel / Melado', gramsPerCup: 340, unitDesc: '1 xícara = 340g' },
  };

  const calculatedGrams = (ingredientDensities[cupItem]?.gramsPerCup || 120) * cupQuantity;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
            CALCULADORAS ESPECÍFICAS
          </span>
          <span className="text-xs text-stone-400">Precision Bakery Calculators</span>
        </div>
        <h2 className="text-xl font-bold text-white mt-1">
          Ferramentas Rápidas de Conversão & Gelatinização
        </h2>
        <p className="text-xs text-stone-400 mt-1 max-w-2xl">
          Conversores termodinâmicos, equivalências de poder levedante e cálculos de escaldamento de amido para padarias e confeitarias de precisão.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tool 1: Yeast Power Equivalency Converter */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <span>Conversor de Agentes Fermentativos</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-800 text-stone-400">
                Poder Levedante
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs text-stone-400 block mb-1">Quantidade de Entrada (g):</label>
                <input
                  type="number"
                  min="0.1"
                  step="0.5"
                  value={yeastAmount}
                  onChange={(e) => setYeastAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm font-mono text-amber-400 font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-stone-400 block mb-1">Tipo de Origem:</label>
                <select
                  value={yeastType}
                  onChange={(e) => setYeastType(e.target.value as any)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="instant_dry">Fermento Seco Instantâneo</option>
                  <option value="active_dry">Fermento Seco Ativo (Grânulos)</option>
                  <option value="fresh">Fermento Biológico Fresco (Bloco)</option>
                  <option value="levain_100">Levain / Massa Madre (100% Hidr.)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2.5 bg-stone-950/60 p-4 rounded-xl border border-stone-800">
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-400">Fermento Seco Instantâneo (1x):</span>
                <span className="font-mono text-white font-bold">{yeastResults.instantDry} g</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-400">Fermento Seco Ativo (1.25x):</span>
                <span className="font-mono text-stone-300 font-bold">{yeastResults.activeDry} g</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-400">Fermento Biológico Fresco (3x):</span>
                <span className="font-mono text-amber-400 font-bold">{yeastResults.fresh} g</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-400">Levain 100% Hidratação (~18x gás):</span>
                <span className="font-mono text-cyan-400 font-bold">{yeastResults.levain100} g</span>
              </div>
            </div>
          </div>

          <div className="mt-4 text-[11px] text-stone-400 flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
            <span>
              Regra de ouro: 1g fermento seco instantâneo = 3g fermento fresco prensado. Para substituir por levain natural, desconte a água e farinha contidas no pré-fermento da fórmula principal.
            </span>
          </div>
        </div>

        {/* Tool 2: Tangzhong / Yudane Gelatinization Engine */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Calculadora Tangzhong / Yudane</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-800 text-stone-400">
                Amido a 65°C
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 mb-4">
              <div>
                <label className="text-[11px] text-stone-400 block mb-1">Farinha Total (g):</label>
                <input
                  type="number"
                  step="50"
                  value={tangFlourTotal}
                  onChange={(e) => setTangFlourTotal(parseFloat(e.target.value) || 0)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-2.5 py-2 text-xs font-mono text-white font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-stone-400 block mb-1">% Escaldada:</label>
                <input
                  type="number"
                  step="1"
                  min="4"
                  max="15"
                  value={tangPct}
                  onChange={(e) => setTangPct(parseFloat(e.target.value) || 7)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-2.5 py-2 text-xs font-mono text-amber-400 font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-stone-400 block mb-1">Método / Proporção:</label>
                <select
                  value={tangRatio}
                  onChange={(e) => setTangRatio(parseInt(e.target.value))}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-2 py-2 text-[11px] text-white focus:outline-none"
                >
                  <option value={5}>Tangzhong (1:5 líquido)</option>
                  <option value={4}>Tangzhong (1:4 denso)</option>
                  <option value={2}>Yudane (1:2 fervente)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2 bg-stone-950/60 p-4 rounded-xl border border-stone-800 text-xs">
              <div className="flex justify-between text-stone-300">
                <span>Farinha no Escaldado:</span>
                <span className="font-mono text-amber-400 font-bold">{tangResult.flourInTangzhong} g</span>
              </div>
              <div className="flex justify-between text-stone-300">
                <span>Líquido (Água/Leite) no Escaldado:</span>
                <span className="font-mono text-cyan-400 font-bold">{tangResult.liquidInTangzhong} g</span>
              </div>
              <div className="flex justify-between text-stone-300 font-bold pt-1 border-t border-stone-800">
                <span>Peso Total do Mingau Escaldado:</span>
                <span className="font-mono text-white">{tangResult.totalTangzhongWeight} g</span>
              </div>
              <div className="flex justify-between text-stone-400 text-[11px]">
                <span>Farinha Seca Restante na Massa:</span>
                <span className="font-mono text-stone-300">{tangResult.remainingFlour} g</span>
              </div>
            </div>
          </div>

          <div className="mt-4 text-[11px] text-stone-400">
            Aqueça mexendo constantemente até atingir 65°C (consistência de pasta brilhante). Cubra com filme plástico em contato e utilize resfriado.
          </div>
        </div>

        {/* Tool 3: Bake Loss (Evaporation) */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-400" />
                <span>Calculadora de Perda de Forneamento (Bake Loss)</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-800 text-stone-400">
                Evaporação Real
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs text-stone-400 block mb-1">Peso da Massa Crua (g):</label>
                <input
                  type="number"
                  step="10"
                  value={rawDoughWeight}
                  onChange={(e) => setRawDoughWeight(parseFloat(e.target.value) || 0)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm font-mono text-white font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-stone-400 block mb-1">Peso Assado Frio (g):</label>
                <input
                  type="number"
                  step="10"
                  value={bakedDoughWeight}
                  onChange={(e) => setBakedDoughWeight(parseFloat(e.target.value) || 0)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm font-mono text-amber-400 font-bold focus:outline-none"
                />
              </div>
            </div>

            <div className="bg-stone-950/60 p-4 rounded-xl border border-stone-800 text-center">
              <span className="text-xs text-stone-400 uppercase font-mono block">Taxa de Perda Medida:</span>
              <div className="text-3xl font-extrabold font-mono text-emerald-400 mt-1">
                {bakeLossPct.toFixed(1)}%
              </div>
              <span className="text-xs text-stone-400 mt-1 block">
                Perda de {Math.round(rawDoughWeight - bakedDoughWeight)}g de água evaporada
              </span>
            </div>
          </div>

          <div className="mt-4 text-[11px] text-stone-400">
            Padrões da indústria: Pão de forma (8% a 10%), Pão Rústico Boule (14% a 16%), Baguete francesa (18% a 22%).
          </div>
        </div>

        {/* Tool 4: Metric Precision Cup Converter */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Droplet className="w-4 h-4 text-cyan-400" />
                <span>Conversor de Medidas Caseiras para Gramas</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-800 text-stone-400">
                Precisão Métrica
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs text-stone-400 block mb-1">Insumo:</label>
                <select
                  value={cupItem}
                  onChange={(e) => setCupItem(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  {Object.entries(ingredientDensities).map(([key, val]) => (
                    <option key={key} value={key}>
                      {val.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-stone-400 block mb-1">Número de Xícaras:</label>
                <input
                  type="number"
                  min="0.25"
                  step="0.25"
                  value={cupQuantity}
                  onChange={(e) => setCupQuantity(parseFloat(e.target.value) || 0)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm font-mono text-cyan-400 font-bold focus:outline-none"
                />
              </div>
            </div>

            <div className="bg-stone-950/60 p-4 rounded-xl border border-stone-800 text-center">
              <span className="text-xs text-stone-400 uppercase font-mono block">Peso Equivalente Exato:</span>
              <div className="text-3xl font-extrabold font-mono text-cyan-400 mt-1">
                {Math.round(calculatedGrams)} g
              </div>
              <span className="text-xs text-stone-400 mt-1 block">
                {ingredientDensities[cupItem]?.unitDesc}
              </span>
            </div>
          </div>

          <div className="mt-4 text-[11px] text-stone-400">
            Regra DoughCraft Core: medidas volumétricas geram variações de até 30% no peso real. Sempre pese todos os ingredientes em gramas para reprodutibilidade técnica.
          </div>
        </div>
      </div>
    </div>
  );
};
