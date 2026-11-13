import React, { useState } from 'react';
import { convertYeast, calculateTangzhong } from '../utils/bakersMath';
import { RotateCcw, Droplet, Flame, Scale, Info } from 'lucide-react';

export const ToolsTab: React.FC = () => {
  // Yeast converter state (only everyday market yeasts in UI)
  const [yeastAmount, setYeastAmount] = useState<number>(5);
  const [yeastType, setYeastType] = useState<'instant_dry' | 'active_dry' | 'fresh'>('instant_dry');
  const yeastResults = convertYeast(yeastAmount, yeastType);

  // Soft porridge trick (base 500g)
  const [tangFlourTotal, setTangFlourTotal] = useState<number>(500);
  const [tangPct, setTangPct] = useState<number>(7);
  const [tangRatio, setTangRatio] = useState<number>(5);
  const tangResult = calculateTangzhong(tangFlourTotal, tangPct, tangRatio);

  // Oven shrinkage calculator
  const [rawDoughWeight, setRawDoughWeight] = useState<number>(883);
  const [bakedDoughWeight, setBakedDoughWeight] = useState<number>(777);
  const bakeLossPct =
    rawDoughWeight > 0
      ? Math.max(0, ((rawDoughWeight - bakedDoughWeight) / rawDoughWeight) * 100)
      : 0;

  // Cup to grams converter state
  const [cupItem, setCupItem] = useState<string>('flour');
  const [cupQuantity, setCupQuantity] = useState<number>(2);

  const ingredientDensities: Record<
    string,
    { label: string; gramsPerCup: number; unitDesc: string }
  > = {
    flour: {
      label: 'Farinha de Trigo (sem fermento)',
      gramsPerCup: 125,
      unitDesc: '1 xícara = 125g (4 xícaras = 500g)',
    },
    flour_rye: {
      label: 'Farinha de Centeio ou Integral',
      gramsPerCup: 115,
      unitDesc: '1 xícara = 115g',
    },
    sugar_refined: {
      label: 'Açúcar Cristal / Refinado',
      gramsPerCup: 200,
      unitDesc: '1 xícara = 200g',
    },
    sugar_brown: {
      label: 'Açúcar Mascavo (apertadinho)',
      gramsPerCup: 220,
      unitDesc: '1 xícara = 220g',
    },
    butter: {
      label: 'Manteiga ou Margarina',
      gramsPerCup: 225,
      unitDesc: '1 xícara = 225g (1 colher de sopa = 15g)',
    },
    water_milk: {
      label: 'Água / Leite Integral',
      gramsPerCup: 240,
      unitDesc: '1 xícara = 240g (240ml)',
    },
    oil: {
      label: 'Óleo de Cozinha / Azeite',
      gramsPerCup: 220,
      unitDesc: '1 xícara = 220g (1 colher de sopa = 15g)',
    },
    honey: { label: 'Mel / Melado', gramsPerCup: 340, unitDesc: '1 xícara = 340g' },
  };

  const calculatedGrams = (ingredientDensities[cupItem]?.gramsPerCup || 125) * cupQuantity;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 text-xs text-stone-400">
          <span className="font-semibold text-amber-400">Ferramentas da Cozinha</span>
          <span aria-hidden="true">·</span>
          <span>Conversores Práticos</span>
        </div>
        <h2 className="text-xl font-bold text-white mt-1">
          Conversor de Xícaras, Fermentos e Truques de Maciez
        </h2>
        <p className="text-xs text-stone-400 mt-1 max-w-2xl">
          Converta xícaras em gramas, troque fermento de pacotinho por tablete fresco da padaria e calcule o mingauzinho caseiro que deixa o pão fofinho por vários dias.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tool 1: Yeast Converter */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <span>Troca de Fermento (Pacotinho x Tablete)</span>
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs text-stone-400 block mb-1">Quantidade que Você Tem (g):</label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={yeastAmount}
                  onChange={(e) => setYeastAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm font-mono text-amber-400 font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-stone-400 block mb-1">Tipo de Fermento:</label>
                <select
                  value={yeastType}
                  onChange={(e) => setYeastType(e.target.value as any)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="instant_dry">Fermento Seco de Pacotinho (10g)</option>
                  <option value="active_dry">Fermento Seco em Grânulos</option>
                  <option value="fresh">Fermento Fresco de Padaria (Tablete 15g)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2.5 bg-stone-950/60 p-4 rounded-xl border border-stone-800 tabular-nums">
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-400">Fermento Seco de Pacotinho:</span>
                <span className="font-mono text-white font-bold">{yeastResults.instantDry} g</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-400">Fermento Seco em Grânulos:</span>
                <span className="font-mono text-stone-300 font-bold">{yeastResults.activeDry} g</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-400">Fermento Fresco de Padaria (3x):</span>
                <span className="font-mono text-amber-400 font-bold">{yeastResults.fresh} g</span>
              </div>
            </div>
          </div>

          <div className="mt-4 text-[11px] text-stone-400 flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
            <span>
              Regra fácil de lembrar: meio pacotinho de fermento seco (5g) equivale a 1 tablete inteiro de fermento fresco de padaria (15g).
            </span>
          </div>
        </div>

        {/* Tool 2: Soft Porridge Trick */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Truque do Mingauzinho Caseiro (Pão Ultra Macio)</span>
              </h3>
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
                <label className="text-[11px] text-stone-400 block mb-1">Parte no Mingau (%):</label>
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
                <label className="text-[11px] text-stone-400 block mb-1">Consistência:</label>
                <select
                  value={tangRatio}
                  onChange={(e) => setTangRatio(parseInt(e.target.value, 10))}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-2 py-2 text-[11px] text-white focus:outline-none"
                >
                  <option value={5}>Cremoso (1 para 5 de leite/água)</option>
                  <option value={4}>Tradicional (1 para 4)</option>
                  <option value={2}>Bem Firme (1 para 2)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2 bg-stone-950/60 p-4 rounded-xl border border-stone-800 text-xs tabular-nums">
              <div className="flex justify-between text-stone-300">
                <span>Farinha para cozinhar no fogo:</span>
                <span className="font-mono text-amber-400 font-bold">{tangResult.flourInTangzhong} g</span>
              </div>
              <div className="flex justify-between text-stone-300">
                <span>Leite ou Água para o mingauzinho:</span>
                <span className="font-mono text-cyan-400 font-bold">{tangResult.liquidInTangzhong} g</span>
              </div>
              <div className="flex justify-between text-stone-300 font-bold pt-1 border-t border-stone-800">
                <span>Peso do Mingauzinho Pronto:</span>
                <span className="font-mono text-white">{tangResult.totalTangzhongWeight} g</span>
              </div>
              <div className="flex justify-between text-stone-400 text-[11px]">
                <span>Farinha Seca Restante na Tigela:</span>
                <span className="font-mono text-stone-300">{tangResult.remainingFlour} g</span>
              </div>
            </div>
          </div>

          <div className="mt-4 text-[11px] text-stone-400">
            Misture em fogo baixinho sem parar até virar um mingauzinho brilhante e liso. Deixe esfriar e junte na massa para o pão ficar fofinho por 4 dias!
          </div>
        </div>

        {/* Tool 3: Oven Shrinkage */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-400" />
                <span>Quanto o Pão Encolhe no Forno</span>
              </h3>
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
                <label className="text-xs text-stone-400 block mb-1">Peso Depois de Assado e Frio (g):</label>
                <input
                  type="number"
                  step="10"
                  value={bakedDoughWeight}
                  onChange={(e) => setBakedDoughWeight(parseFloat(e.target.value) || 0)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm font-mono text-amber-400 font-bold focus:outline-none"
                />
              </div>
            </div>

            <div className="bg-stone-950/60 p-4 rounded-xl border border-stone-800 text-center tabular-nums">
              <span className="text-xs text-stone-400 block">Água Evaporada no Forno:</span>
              <div className="text-3xl font-extrabold font-mono text-emerald-400 mt-1">
                {bakeLossPct.toFixed(1)}%
              </div>
              <span className="text-xs text-stone-400 mt-1 block">
                Diferença de {Math.max(0, Math.round(rawDoughWeight - bakedDoughWeight))}g de vapor que saiu assando
              </span>
            </div>
          </div>

          <div className="mt-4 text-[11px] text-stone-400">
            Referência caseira: Pão de fôrma e bolos perdem cerca de 10%, e pão caseiro tradicional perde cerca de 12% do peso no forno.
          </div>
        </div>

        {/* Tool 4: Cup Converter */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Droplet className="w-4 h-4 text-cyan-400" />
                <span>Conversor de Xícaras para Gramas</span>
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs text-stone-400 block mb-1">Ingrediente:</label>
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
                <label className="text-xs text-stone-400 block mb-1">Quantas Xícaras:</label>
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

            <div className="bg-stone-950/60 p-4 rounded-xl border border-stone-800 text-center tabular-nums">
              <span className="text-xs text-stone-400 block">Peso Exato na Balança:</span>
              <div className="text-3xl font-extrabold font-mono text-cyan-400 mt-1">
                {Math.round(calculatedGrams)} g
              </div>
              <span className="text-xs text-stone-400 mt-1 block">
                {ingredientDensities[cupItem]?.unitDesc}
              </span>
            </div>
          </div>

          <div className="mt-4 text-[11px] text-stone-400">
            Dica da Vovó: xícaras variam bastante de tamanho em casa. Sempre que tiver uma balancinha de cozinha, pese em gramas para a receita ficar igualzinha todas as vezes.
          </div>
        </div>
      </div>
    </div>
  );
};
