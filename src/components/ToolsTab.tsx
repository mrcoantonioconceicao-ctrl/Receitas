import React, { useState } from 'react';
import { convertYeast, calculateTangzhong } from '../utils/bakersMath';
import { RotateCcw, Flame, Scale, Info, Utensils } from 'lucide-react';

type MeasureUnitId = 'cup' | 'tbsp' | 'tsp' | 'american_glass';

interface IngredientDensity {
  label: string;
  group: 'Secos & Farinhas' | 'Açúcares & Doces' | 'Gorduras' | 'Líquidos' | 'Fermentos & Sal';
  gramsPerCup240ml: number;
  tip: string;
}

const MEASURE_UNITS: Record<
  MeasureUnitId,
  { label: string; shortLabel: string; ml: number }
> = {
  cup: { label: 'Xícara de Chá (240 ml)', shortLabel: 'xícara(s) de chá', ml: 240 },
  tbsp: { label: 'Colher de Sopa (15 ml)', shortLabel: 'colher(es) de sopa', ml: 15 },
  tsp: { label: 'Colher de Chá (5 ml)', shortLabel: 'colher(es) de chá', ml: 5 },
  american_glass: { label: 'Copo Americano (200 ml)', shortLabel: 'copo(s) americano(s)', ml: 200 },
};

const INGREDIENT_DENSITIES: Record<string, IngredientDensity> = {
  flour: {
    label: 'Farinha de Trigo Comum (sem fermento)',
    group: 'Secos & Farinhas',
    gramsPerCup240ml: 125,
    tip: 'Encha a xícara sem apertar e passe as costas de uma faca para nivelar (4 xícaras = 500g).',
  },
  fuba: {
    label: 'Fubá Mimoso / Amido de Milho (Maizena)',
    group: 'Secos & Farinhas',
    gramsPerCup240ml: 120,
    tip: 'Bem soltinho e levinho — 1 xícara dá cerca de 120g.',
  },
  flour_whole: {
    label: 'Farinha Integral ou de Centeio',
    group: 'Secos & Farinhas',
    gramsPerCup240ml: 115,
    tip: 'Um pouquinho mais leve no volume por causa das casquinhas do trigo.',
  },
  cocoa: {
    label: 'Chocolate em Pó / Cacau em Pó',
    group: 'Secos & Farinhas',
    gramsPerCup240ml: 90,
    tip: 'Bem fofinho e leve: 1 xícara cheia pesa cerca de 90g (ou ~6g por colher de sopa).',
  },
  coconut: {
    label: 'Coco Ralado Seco',
    group: 'Secos & Farinhas',
    gramsPerCup240ml: 80,
    tip: '1 pacotinho de 100g equivale a cerca de 1 xícara e 1/4 de chá.',
  },
  sugar_refined: {
    label: 'Açúcar Refinado ou Cristal',
    group: 'Açúcares & Doces',
    gramsPerCup240ml: 200,
    tip: 'Bem mais pesado que a farinha: 1 xícara cheia pesa 200g.',
  },
  sugar_brown: {
    label: 'Açúcar Mascavo (apertadinho)',
    group: 'Açúcares & Doces',
    gramsPerCup240ml: 220,
    tip: 'Acomode levemente na xícara sem compactar demais.',
  },
  condensed_milk: {
    label: 'Leite Condensado',
    group: 'Açúcares & Doces',
    gramsPerCup240ml: 310,
    tip: 'Bem denso e cremoso: 1 lata ou caixinha padrão tem 395g (~305 ml).',
  },
  honey: {
    label: 'Mel / Melado',
    group: 'Açúcares & Doces',
    gramsPerCup240ml: 340,
    tip: 'Passe um fiozinho de óleo na colher ou xícara antes para o mel escorregar inteirinho.',
  },
  butter: {
    label: 'Manteiga ou Margarina (Macia)',
    group: 'Gorduras',
    gramsPerCup240ml: 225,
    tip: '1 colher de sopa bem cheia pesa aproximadamente 14g a 15g.',
  },
  oil: {
    label: 'Óleo de Cozinha / Azeite',
    group: 'Gorduras',
    gramsPerCup240ml: 220,
    tip: 'O óleo boia na água porque é um pouco mais leve: 240 ml pesam cerca de 220g.',
  },
  water_milk: {
    label: 'Água / Leite Integral',
    group: 'Líquidos',
    gramsPerCup240ml: 240,
    tip: 'Na água e no leite, 1 ml vale praticamente 1g (1 xícara = 240 ml = 240g).',
  },
  cream: {
    label: 'Creme de Leite',
    group: 'Líquidos',
    gramsPerCup240ml: 240,
    tip: '1 caixinha padrão tem 200g (aproximadamente 200 ml).',
  },
  yeast_chem: {
    label: 'Fermento Químico em Pó (de Bolo)',
    group: 'Fermentos & Sal',
    gramsPerCup240ml: 224,
    tip: '1 colher de sopa rasa (ou a tampinha do pote) = ~14g; 1 colher de chá = ~5g.',
  },
  yeast_dry: {
    label: 'Fermento Biológico Seco (de Pão)',
    group: 'Fermentos & Sal',
    gramsPerCup240ml: 160,
    tip: '1 colher de sopa cheia = 10g (1 pacotinho); 1 colher de chá = ~3,3g.',
  },
  salt: {
    label: 'Sal Refinado de Cozinha',
    group: 'Fermentos & Sal',
    gramsPerCup240ml: 288,
    tip: 'Bem pesadinho: 1 colher de chá rasa pesa cerca de 6g; 1 colher de sopa rasa pesa ~18g.',
  },
};

function formatMeasureNumber(val: number): string {
  if (val >= 100) return String(Math.round(val));
  if (val >= 10) return (Math.round(val * 10) / 10).toString().replace('.', ',');
  return (Math.round(val * 10) / 10).toString().replace('.', ',');
}

export const ToolsTab: React.FC = () => {
  // Household Measure -> Grams & Milliliters converter
  const [measureIngredient, setMeasureIngredient] = useState<string>('flour');
  const [measureUnit, setMeasureUnit] = useState<MeasureUnitId>('cup');
  const [measureQty, setMeasureQty] = useState<number>(2);
  const [measureQtyDraft, setMeasureQtyDraft] = useState<string>('2');

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

  const selectedIngredient = INGREDIENT_DENSITIES[measureIngredient] || INGREDIENT_DENSITIES.flour;
  const selectedUnit = MEASURE_UNITS[measureUnit];
  const safeQty = Math.max(0, measureQty);
  const totalMl = safeQty * selectedUnit.ml;
  const totalGrams = totalMl * (selectedIngredient.gramsPerCup240ml / 240);

  // Reference equivalences for the selected ingredient
  const gramsPerCup = selectedIngredient.gramsPerCup240ml;
  const gramsPerHalfCup = gramsPerCup / 2;
  const gramsPerTbsp = (gramsPerCup * 15) / 240;
  const gramsPerTsp = (gramsPerCup * 5) / 240;

  const fractionPresets: { label: string; value: number }[] = [
    { label: '1/4', value: 0.25 },
    { label: '1/3', value: 0.33 },
    { label: '1/2', value: 0.5 },
    { label: '1', value: 1 },
    { label: '1 e 1/2', value: 1.5 },
    { label: '2', value: 2 },
    { label: '3', value: 3 },
    { label: '4', value: 4 },
  ];

  const handleSelectQuickQty = (val: number) => {
    setMeasureQty(val);
    setMeasureQtyDraft(String(val).replace('.', ','));
  };

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
          Conversor de Medidas Caseiras, Fermentos e Truques de Maciez
        </h2>
        <p className="text-xs text-stone-400 mt-1 max-w-2xl">
          Converta xícaras, colheres de sopa e colheres de chá para gramas e mililitros de acordo com cada ingrediente, troque fermento de pacotinho por tablete fresco e calcule o mingauzinho caseiro.
        </p>
      </div>

      {/* Featured Tool: Household Measure Converter (Xícaras, Colheres -> Gramas & ml) */}
      <section className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Utensils className="w-5 h-5 text-amber-400" />
              <span>Conversor de Medidas Caseiras (Xícaras e Colheres → Gramas &amp; ml)</span>
            </h3>
            <p className="text-xs text-stone-400 mt-1">
              Cada ingrediente tem um peso diferente: 1 xícara de farinha pesa 125g, enquanto 1 xícara de açúcar pesa 200g e 1 xícara de água pesa 240g (240ml).
            </p>
          </div>
          <span className="text-[11px] font-mono text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-lg self-start sm:self-center shrink-0">
            Padrão: 1 xícara = 240 ml
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Controls Column */}
          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="converter-ingredient"
                  className="text-xs font-semibold text-stone-300 block mb-1.5"
                >
                  1. Escolha o Ingrediente:
                </label>
                <select
                  id="converter-ingredient"
                  value={measureIngredient}
                  onChange={(e) => setMeasureIngredient(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  {(
                    [
                      'Secos & Farinhas',
                      'Açúcares & Doces',
                      'Gorduras',
                      'Líquidos',
                      'Fermentos & Sal',
                    ] as const
                  ).map((groupName) => (
                    <optgroup key={groupName} label={groupName}>
                      {Object.entries(INGREDIENT_DENSITIES)
                        .filter(([, item]) => item.group === groupName)
                        .map(([key, item]) => (
                          <option key={key} value={key}>
                            {item.label}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="converter-quantity"
                  className="text-xs font-semibold text-stone-300 block mb-1.5"
                >
                  3. Quantidade:
                </label>
                <input
                  id="converter-quantity"
                  type="text"
                  inputMode="decimal"
                  value={measureQtyDraft}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setMeasureQtyDraft(raw);
                    const normalized = parseFloat(raw.replace(',', '.'));
                    if (!isNaN(normalized) && normalized >= 0) {
                      setMeasureQty(normalized);
                    }
                  }}
                  onBlur={() => setMeasureQtyDraft(String(measureQty).replace('.', ','))}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-base font-mono text-amber-400 font-bold focus:outline-none focus:border-amber-500 tabular-nums"
                />
              </div>
            </div>

            {/* Measure Unit Picker */}
            <div>
              <span className="text-xs font-semibold text-stone-300 block mb-1.5">
                2. Medida Caseira Usada na Receita:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(Object.keys(MEASURE_UNITS) as MeasureUnitId[]).map((unitId) => {
                  const unit = MEASURE_UNITS[unitId];
                  const active = measureUnit === unitId;
                  return (
                    <button
                      key={unitId}
                      type="button"
                      onClick={() => setMeasureUnit(unitId)}
                      aria-pressed={active}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold border text-left transition ${
                        active
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-stone-950/70 border-stone-800 text-stone-300 hover:border-stone-600'
                      }`}
                    >
                      <div className="font-bold leading-snug">
                        {unit.label.split(' (')[0]}
                      </div>
                      <div className="text-[11px] font-mono text-stone-400 mt-0.5">
                        {unit.ml} ml
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Fraction / Count Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-stone-400 font-medium mr-1">
                Atalhos rápidos:
              </span>
              {fractionPresets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleSelectQuickQty(preset.value)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition ${
                    Math.abs(measureQty - preset.value) < 0.02
                      ? 'bg-amber-500 text-stone-950 border-amber-500'
                      : 'bg-stone-950 text-stone-300 border-stone-800 hover:border-amber-500/40'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Grandma Practical Tip */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-100 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-300">Dica da Vovó:</strong> {selectedIngredient.tip}
              </div>
            </div>
          </div>

          {/* Results & Quick Equivalence Reference Column */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-5 space-y-4">
              <div className="text-xs text-stone-400 font-medium">
                {String(safeQty).replace('.', ',')} {selectedUnit.shortLabel} de{' '}
                <span className="text-white font-semibold">{selectedIngredient.label}</span>:
              </div>

              <div className="grid grid-cols-2 gap-3 tabular-nums">
                <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 text-center">
                  <span className="text-[11px] uppercase tracking-wider text-stone-400 font-mono block">
                    Peso na Balança
                  </span>
                  <div className="text-3xl font-extrabold font-mono text-amber-400 mt-1">
                    {formatMeasureNumber(totalGrams)}{' '}
                    <span className="text-base font-normal text-stone-400">g</span>
                  </div>
                </div>

                <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 text-center">
                  <span className="text-[11px] uppercase tracking-wider text-stone-400 font-mono block">
                    Volume / Medidor
                  </span>
                  <div className="text-3xl font-extrabold font-mono text-cyan-400 mt-1">
                    {formatMeasureNumber(totalMl)}{' '}
                    <span className="text-base font-normal text-stone-400">ml</span>
                  </div>
                </div>
              </div>

              {/* Equivalence Breakdown Table for Selected Ingredient */}
              <div className="pt-2 border-t border-stone-800 space-y-2 text-xs tabular-nums">
                <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider font-mono">
                  Referência rápida deste ingrediente:
                </div>
                <div className="flex items-center justify-between text-stone-300">
                  <span>1 xícara de chá (240 ml)</span>
                  <span className="font-mono font-bold text-white">
                    {formatMeasureNumber(gramsPerCup)} g
                  </span>
                </div>
                <div className="flex items-center justify-between text-stone-300">
                  <span>1/2 xícara de chá (120 ml)</span>
                  <span className="font-mono font-bold text-white">
                    {formatMeasureNumber(gramsPerHalfCup)} g
                  </span>
                </div>
                <div className="flex items-center justify-between text-stone-300">
                  <span>1 colher de sopa (15 ml)</span>
                  <span className="font-mono font-bold text-amber-300">
                    {formatMeasureNumber(gramsPerTbsp)} g
                  </span>
                </div>
                <div className="flex items-center justify-between text-stone-300">
                  <span>1 colher de chá (5 ml)</span>
                  <span className="font-mono font-bold text-cyan-300">
                    {formatMeasureNumber(gramsPerTsp)} g
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
      </div>
    </div>
  );
};
