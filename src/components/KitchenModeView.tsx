import React, { useState, useEffect, useRef } from 'react';
import { Recipe } from '../types';
import {
  calculateDDT,
  calculateHydrationMetrics,
  getHouseholdMeasureEstimate,
} from '../utils/bakersMath';
import { useRecipeSpeech, SpeechRate } from '../utils/useRecipeSpeech';
import {
  useKitchenTimer,
  formatKitchenTimer,
  inferTimerCategory,
} from '../utils/useKitchenTimer';
import { KitchenTimerPanel } from './KitchenTimerPanel';
import { RecipePhoto } from './RecipePhoto';
import {
  ArrowLeft,
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  Moon,
  Pause,
  Play,
  RotateCcw,
  Square,
  Sun,
  Timer,
  Smartphone,
  Volume2,
} from 'lucide-react';

interface KitchenModeViewProps {
  recipe: Recipe;
  onExit: () => void;
}

type FontScale = 'md' | 'lg' | 'xl';
type ContrastTheme = 'light' | 'dark';
type SectionFilter = 'all' | 'ingredients' | 'steps';

export const KitchenModeView: React.FC<KitchenModeViewProps> = ({
  recipe,
  onExit,
}) => {
  const [fontScale, setFontScale] = useState<FontScale>('lg');
  const [contrastTheme, setContrastTheme] = useState<ContrastTheme>('light');
  const [sectionFilter, setSectionFilter] = useState<SectionFilter>('all');
  const [focusOneStep, setFocusOneStep] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});

  // Real Screen Wake Lock (keeps tablet/phone screen awake while mixing dough)
  const [wakeLockSupported, setWakeLockSupported] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const wakeLockRef = useRef<any>(null);
  const wantWakeLockRef = useRef(true);

  const stepRefs = useRef<(HTMLElement | null)[]>([]);
  const timerPanelRef = useRef<HTMLDivElement | null>(null);

  const kitchenTimer = useKitchenTimer();

  const speech = useRecipeSpeech(recipe.steps, recipe.id, (spokenIdx) => {
    setActiveStepIndex(spokenIdx);
    const el = stepRefs.current[spokenIdx];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  // Reset checklists & initialize kitchen timer with recipe's main rest or oven duration
  useEffect(() => {
    setCheckedIngredients({});
    setCompletedSteps({});
    setActiveStepIndex(0);

    const notableStep =
      recipe.steps.find((s) => s.durationMinutes >= 20) ||
      recipe.steps.find((s) => s.durationMinutes > 0);
    if (notableStep) {
      const cat = inferTimerCategory(notableStep.name, notableStep.temperature);
      kitchenTimer.resetForNewRecipe(cat, notableStep.durationMinutes);
    } else {
      kitchenTimer.resetForNewRecipe(recipe.type === 'cake' ? 'oven' : 'rest', recipe.type === 'cake' ? 35 : 40);
    }
  }, [recipe.id]);

  // Check WakeLock support & acquire automatically if supported
  useEffect(() => {
    const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
    setWakeLockSupported(supported);

    const requestLock = async () => {
      if (!supported || !wantWakeLockRef.current) return;
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        setWakeLockActive(true);
        wakeLockRef.current.addEventListener?.('release', () => {
          setWakeLockActive(false);
        });
      } catch {
        setWakeLockActive(false);
      }
    };

    requestLock();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && wantWakeLockRef.current) {
        requestLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, []);

  const toggleWakeLock = async () => {
    if (!wakeLockSupported) return;
    if (wakeLockActive && wakeLockRef.current) {
      wantWakeLockRef.current = false;
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        setWakeLockActive(false);
      } catch {
        setWakeLockActive(false);
      }
    } else {
      wantWakeLockRef.current = true;
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        setWakeLockActive(true);
        wakeLockRef.current.addEventListener?.('release', () => {
          setWakeLockActive(false);
        });
      } catch {
        setWakeLockActive(false);
      }
    }
  };

  const scrollToTimerPanel = () => {
    timerPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const toggleIngredient = (id: string) => {
    setCheckedIngredients((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleStepDone = (id: string) => {
    setCompletedSteps((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const totalRawWeight = recipe.ingredients.reduce((s, i) => s + i.weight, 0);
  const hydration = calculateHydrationMetrics(recipe.ingredients, recipe.baseFlourWeight);
  const ddt = calculateDDT(recipe.climate, hydration.formulaWaterWeight);

  const lowerName = recipe.name.toLowerCase();
  const isCuca = lowerName.includes('cuca');
  const isRosca = lowerName.includes('rosca');
  const isLasanha = lowerName.includes('lasanha');
  const safeUnits = Math.max(1, recipe.targetUnits || 1);
  const unitWord = isCuca
    ? safeUnits === 1
      ? 'cuca grande'
      : 'cucas'
    : isRosca
    ? safeUnits === 1
      ? 'rosca'
      : 'roscas'
    : isLasanha
    ? safeUnits === 1
      ? 'travessa de lasanha'
      : 'travessas de lasanha'
    : recipe.type === 'pastry'
    ? safeUnits === 1
      ? 'torta / massa'
      : 'tortas / massas'
    : recipe.type === 'cake'
    ? safeUnits === 1
      ? 'bolo'
      : 'bolos'
    : safeUnits === 1
    ? 'pão médio'
    : 'pães médios';

  const checkedCount = recipe.ingredients.filter((i) => checkedIngredients[i.id]).length;
  const doneStepsCount = recipe.steps.filter((s) => completedSteps[s.id]).length;

  const isLight = contrastTheme === 'light';

  // High-contrast color tokens (WCAG AAA 21:1 text contrast on both modes)
  const theme = isLight
    ? {
        pageBg: 'bg-white text-black',
        headerBg: 'bg-white/95 border-b-2 border-black text-black',
        cardBg: 'bg-stone-50 border-2 border-black text-black',
        cardDoneBg: 'bg-emerald-50 border-2 border-emerald-900 text-black',
        subCardBg: 'bg-amber-50 border-2 border-amber-900 text-black',
        tipBg: 'bg-amber-100 border-2 border-amber-950 text-black',
        mutedText: 'text-stone-800',
        accentText: 'text-amber-900',
        measureBadge: 'text-amber-950',
        btnPrimary: 'bg-black text-white hover:bg-stone-800',
        btnSecondary: 'bg-stone-100 text-black border-2 border-black hover:bg-stone-200',
        segBg: 'bg-stone-200 border-2 border-black',
        segActive: 'bg-black text-white',
        segIdle: 'text-black hover:bg-stone-300',
        checkBoxIdle: 'border-2 border-black bg-white',
        checkBoxDone: 'border-2 border-emerald-900 bg-emerald-800 text-white',
      }
    : {
        pageBg: 'bg-black text-white',
        headerBg: 'bg-black/95 border-b-2 border-stone-500 text-white',
        cardBg: 'bg-stone-950 border-2 border-stone-500 text-white',
        cardDoneBg: 'bg-emerald-950/60 border-2 border-emerald-400 text-white',
        subCardBg: 'bg-stone-900 border-2 border-amber-400 text-white',
        tipBg: 'bg-amber-950/70 border-2 border-amber-400 text-amber-100',
        mutedText: 'text-stone-200',
        accentText: 'text-yellow-300',
        measureBadge: 'text-yellow-300',
        btnPrimary: 'bg-yellow-400 text-black hover:bg-yellow-300',
        btnSecondary: 'bg-stone-900 text-white border-2 border-stone-400 hover:bg-stone-800',
        segBg: 'bg-stone-900 border-2 border-stone-500',
        segActive: 'bg-yellow-400 text-black',
        segIdle: 'text-white hover:bg-stone-800',
        checkBoxIdle: 'border-2 border-stone-300 bg-black',
        checkBoxDone: 'border-2 border-emerald-400 bg-emerald-500 text-black',
      };

  // Large readable scale classes — zero clipping or overflow
  const scale = {
    md: {
      title: 'text-2xl sm:text-3xl leading-tight',
      meta: 'text-base sm:text-lg leading-relaxed',
      sectionHeading: 'text-xl sm:text-2xl',
      ingName: 'text-lg sm:text-xl leading-snug',
      ingMeasure: 'text-base sm:text-lg leading-snug',
      ingWeight: 'text-xl sm:text-2xl',
      ingNote: 'text-sm sm:text-base leading-relaxed',
      stepTitle: 'text-xl sm:text-2xl leading-snug',
      stepBody: 'text-lg sm:text-xl leading-relaxed',
      stepTip: 'text-base sm:text-lg leading-relaxed',
    },
    lg: {
      title: 'text-3xl sm:text-4xl leading-tight',
      meta: 'text-lg sm:text-xl leading-relaxed',
      sectionHeading: 'text-2xl sm:text-3xl',
      ingName: 'text-xl sm:text-2xl leading-snug',
      ingMeasure: 'text-lg sm:text-xl leading-snug',
      ingWeight: 'text-2xl sm:text-3xl',
      ingNote: 'text-base sm:text-lg leading-relaxed',
      stepTitle: 'text-2xl sm:text-3xl leading-snug',
      stepBody: 'text-xl sm:text-2xl leading-relaxed',
      stepTip: 'text-lg sm:text-xl leading-relaxed',
    },
    xl: {
      title: 'text-3xl sm:text-5xl leading-tight',
      meta: 'text-xl sm:text-2xl leading-relaxed',
      sectionHeading: 'text-2xl sm:text-4xl',
      ingName: 'text-2xl sm:text-3xl leading-snug',
      ingMeasure: 'text-xl sm:text-2xl leading-snug',
      ingWeight: 'text-3xl sm:text-4xl',
      ingNote: 'text-lg sm:text-xl leading-relaxed',
      stepTitle: 'text-2xl sm:text-4xl leading-snug',
      stepBody: 'text-2xl sm:text-[1.65rem] leading-relaxed',
      stepTip: 'text-xl sm:text-2xl leading-relaxed',
    },
  }[fontScale];

  const hasSteps = recipe.steps.length > 0;
  const clampedStepIdx = Math.min(activeStepIndex, Math.max(0, recipe.steps.length - 1));
  const focusedStep = hasSteps ? recipe.steps[clampedStepIdx] : null;

  const renderStepCard = (
    step: Recipe['steps'][number],
    idx: number,
    isFocusedCard = false
  ) => {
    const isDone = Boolean(completedSteps[step.id]);
    const isThisTimerActive = kitchenTimer.activeStepId === step.id;
    const isThisTimerFinished = isThisTimerActive && (kitchenTimer.isFinished || kitchenTimer.isAlarmRinging);
    const isSpeakingThisStep =
      (speech.isPlaying || speech.isPaused) && speech.currentStepIndex === idx;

    return (
      <article
        key={step.id}
        ref={(el) => {
          stepRefs.current[idx] = el;
        }}
        className={`rounded-2xl p-5 sm:p-6 transition-colors ${
          isDone ? theme.cardDoneBg : theme.cardBg
        } ${
          isSpeakingThisStep
            ? isLight
              ? 'ring-4 ring-amber-600'
              : 'ring-4 ring-yellow-400'
            : ''
        }`}
      >
        <div className="flex flex-col gap-4">
          {/* Step header */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <span
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-extrabold text-lg shrink-0 tabular-nums ${
                  isDone ? theme.checkBoxDone : theme.segActive
                }`}
              >
                {isDone ? <Check className="w-6 h-6 stroke-[3]" /> : idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <h4 className={`font-extrabold break-words ${scale.stepTitle}`}>
                  {step.name}
                </h4>
                {(step.durationMinutes > 0 || step.temperature) && (
                  <div className={`mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-semibold ${theme.accentText} ${scale.ingNote}`}>
                    {step.durationMinutes > 0 && (
                      <span className="inline-flex items-center gap-1.5 tabular-nums">
                        <Clock className="w-4 h-4 shrink-0" />
                        {step.durationMinutes >= 60
                          ? `${(step.durationMinutes / 60).toFixed(1).replace('.', ',')} h (${step.durationMinutes} min)`
                          : `${step.durationMinutes} minutos`}
                      </span>
                    )}
                    {step.durationMinutes > 0 && step.temperature && (
                      <span aria-hidden="true">·</span>
                    )}
                    {step.temperature && <span>{step.temperature}</span>}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {speech.isSupported && (
                <button
                  type="button"
                  onClick={() => {
                    if (isSpeakingThisStep && speech.isPlaying) {
                      speech.pause();
                    } else if (isSpeakingThisStep && speech.isPaused) {
                      speech.resume();
                    } else {
                      speech.speakSingleStep(idx);
                    }
                  }}
                  aria-pressed={isSpeakingThisStep}
                  className={`min-h-[48px] px-4 py-2 rounded-xl font-bold text-sm sm:text-base inline-flex items-center gap-2 shrink-0 whitespace-nowrap transition ${
                    isSpeakingThisStep ? theme.btnPrimary : theme.btnSecondary
                  }`}
                >
                  {isSpeakingThisStep && speech.isPlaying ? (
                    <>
                      <Pause className="w-5 h-5" />
                      <span>Pausar voz</span>
                    </>
                  ) : isSpeakingThisStep && speech.isPaused ? (
                    <>
                      <Play className="w-5 h-5" />
                      <span>Continuar voz</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-5 h-5" />
                      <span>Ouvir passo</span>
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={() => toggleStepDone(step.id)}
                aria-pressed={isDone}
                className={`min-h-[48px] px-4 py-2 rounded-xl font-bold text-sm sm:text-base inline-flex items-center gap-2 shrink-0 whitespace-nowrap transition ${
                  isDone ? theme.btnPrimary : theme.btnSecondary
                }`}
              >
                <Check className="w-5 h-5" />
                <span>{isDone ? 'Passo feito' : 'Marcar feito'}</span>
              </button>
            </div>
          </div>

          {isSpeakingThisStep && (
            <div className={`text-sm font-extrabold uppercase tracking-wide ${theme.accentText}`}>
              {speech.isPlaying ? 'Lendo este passo em voz alta agora' : 'Leitura pausada neste passo'}
            </div>
          )}

          {/* Step Description — never clipped, full readable text */}
          <p className={`break-words font-medium ${scale.stepBody} ${isDone ? 'opacity-75' : ''}`}>
            {step.description}
          </p>

          {/* Grandma Tip */}
          {step.criticalControlPoint && (
            <div className={`rounded-xl p-4 break-words ${theme.tipBg}`}>
              <p className={`font-semibold break-words ${scale.stepTip}`}>
                <strong>Segredo da Vovó:</strong> {step.criticalControlPoint}
              </p>
            </div>
          )}

          {/* Built-in Kitchen Timer for steps with duration */}
          {step.durationMinutes > 0 && (
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() =>
                  kitchenTimer.startOrToggleForStep(
                    step.id,
                    step.durationMinutes,
                    step.name,
                    step.temperature
                  )
                }
                className={`min-h-[48px] px-4 py-2.5 rounded-xl font-bold text-base inline-flex items-center gap-2 transition tabular-nums ${
                  isThisTimerActive && kitchenTimer.isRunning ? theme.btnPrimary : theme.btnSecondary
                }`}
              >
                {isThisTimerActive ? (
                  kitchenTimer.isRunning ? (
                    <>
                      <Pause className="w-5 h-5" />
                      <span>Pausar {formatKitchenTimer(kitchenTimer.secondsLeft)}</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      <span>
                        {kitchenTimer.secondsLeft > 0
                          ? `Continuar ${formatKitchenTimer(kitchenTimer.secondsLeft)}`
                          : `Iniciar ${step.durationMinutes} min`}
                      </span>
                    </>
                  )
                ) : (
                  <>
                    <Timer className="w-5 h-5" />
                    <span>Timer de {step.durationMinutes} min</span>
                  </>
                )}
              </button>

              {isThisTimerActive && (
                <button
                  type="button"
                  onClick={kitchenTimer.reset}
                  className={`min-h-[48px] px-4 py-2.5 rounded-xl font-bold text-base inline-flex items-center gap-2 transition ${theme.btnSecondary}`}
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>Zerar</span>
                </button>
              )}

              {isThisTimerFinished && (
                <button
                  type="button"
                  onClick={kitchenTimer.dismissAlarm}
                  className={`min-h-[48px] px-4 py-2.5 rounded-xl font-extrabold text-base inline-flex items-center gap-2 transition ${theme.btnPrimary}`}
                >
                  <Bell className="w-5 h-5 animate-bounce" />
                  <span>Tempo encerrado! Desligar Alarme</span>
                </button>
              )}
            </div>
          )}

          {isFocusedCard && (
            <div className={`text-sm font-semibold tabular-nums pt-1 ${theme.mutedText}`}>
              Passo {idx + 1} de {recipe.steps.length}
            </div>
          )}
        </div>
      </article>
    );
  };

  return (
    <div
      className={`fixed inset-0 z-50 overflow-y-auto ${theme.pageBg}`}
      role="dialog"
      aria-modal="true"
      aria-label={`Modo Cozinha: ${recipe.name}`}
    >
      {/* Compact Sticky Top Toolbar (<= 15% mobile height) */}
      <header className={`sticky top-0 z-40 backdrop-blur-md ${theme.headerBg}`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onExit}
            className={`min-h-[44px] px-3 sm:px-4 py-2 rounded-xl font-bold text-sm sm:text-base inline-flex items-center gap-2 whitespace-nowrap shrink-0 transition ${theme.btnPrimary}`}
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Sair do Modo Cozinha</span>
            <span className="sm:hidden">Voltar</span>
          </button>

          <div className="flex items-center gap-2 shrink-0">
            {/* Live Sticky Timer Pill when active or ringing */}
            {(kitchenTimer.isRunning || kitchenTimer.isAlarmRinging || kitchenTimer.isFinished) && (
              <button
                type="button"
                onClick={
                  kitchenTimer.isAlarmRinging || kitchenTimer.isFinished
                    ? kitchenTimer.dismissAlarm
                    : scrollToTimerPanel
                }
                className={`min-h-[44px] px-3 py-2 rounded-xl font-mono font-extrabold text-sm inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 tabular-nums transition ${
                  kitchenTimer.isAlarmRinging || kitchenTimer.isFinished
                    ? 'bg-amber-400 text-black border-2 border-black animate-pulse'
                    : theme.btnPrimary
                }`}
                title={
                  kitchenTimer.isAlarmRinging || kitchenTimer.isFinished
                    ? 'Desligar alarme do timer'
                    : 'Ir para o temporizador'
                }
              >
                {kitchenTimer.isAlarmRinging || kitchenTimer.isFinished ? (
                  <>
                    <Bell className="w-4 h-4 animate-bounce" />
                    <span>Desligar Alarme</span>
                  </>
                ) : (
                  <>
                    {kitchenTimer.category === 'oven' ? (
                      <Flame className="w-4 h-4" />
                    ) : (
                      <Timer className="w-4 h-4" />
                    )}
                    <span>{formatKitchenTimer(kitchenTimer.secondsLeft)}</span>
                  </>
                )}
              </button>
            )}

            {/* Font size selector */}
            <div
              className={`inline-flex items-center rounded-xl p-0.5 ${theme.segBg}`}
              role="group"
              aria-label="Tamanho da letra"
            >
              {(
                [
                  { id: 'md', label: 'A' },
                  { id: 'lg', label: 'A+' },
                  { id: 'xl', label: 'A++' },
                ] as { id: FontScale; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFontScale(opt.id)}
                  aria-pressed={fontScale === opt.id}
                  className={`min-h-[40px] min-w-[40px] px-2.5 rounded-lg font-extrabold text-sm transition ${
                    fontScale === opt.id ? theme.segActive : theme.segIdle
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Contrast mode toggle */}
            <button
              type="button"
              onClick={() => setContrastTheme((t) => (t === 'light' ? 'dark' : 'light'))}
              className={`min-h-[44px] px-3 py-2 rounded-xl font-bold text-sm inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition ${theme.btnSecondary}`}
              aria-label={isLight ? 'Mudar para fundo escuro' : 'Mudar para fundo claro'}
            >
              {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              <span className="hidden md:inline">{isLight ? 'Fundo Escuro' : 'Fundo Claro'}</span>
            </button>

            {/* Real Screen Wake Lock button when supported */}
            {wakeLockSupported && (
              <button
                type="button"
                onClick={toggleWakeLock}
                aria-pressed={wakeLockActive}
                className={`min-h-[44px] px-3 py-2 rounded-xl font-bold text-sm inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition ${
                  wakeLockActive ? theme.btnPrimary : theme.btnSecondary
                }`}
                title="Impede que a tela do tablet ou celular apague sozinha"
              >
                <Smartphone className="w-4 h-4" />
                <span className="hidden lg:inline">
                  {wakeLockActive ? 'Tela Acesa' : 'Manter Tela Acesa'}
                </span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Kitchen Content */}
      <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 ${focusOneStep ? 'pb-28' : 'pb-12'}`}>
        {/* High-Contrast Recipe Header */}
        <section className={`rounded-2xl p-5 sm:p-6 ${theme.subCardBg}`}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <RecipePhoto
              recipe={recipe}
              className={`hidden sm:block w-40 aspect-[4/3] rounded-xl shrink-0 border-2 ${
                contrastTheme === 'dark' ? 'border-stone-700' : 'border-stone-300'
              }`}
            />
            <div className="flex-1 min-w-0">
              <h1 className={`font-extrabold break-words text-balance ${scale.title}`}>
                {recipe.name}
              </h1>

              <div className={`mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-bold tabular-nums ${scale.meta}`}>
                <span>
                  Rende {safeUnits} {unitWord} (~{Math.round(recipe.targetBakedWeightPerUnit)}g cada)
                </span>
                <span aria-hidden="true">·</span>
                <span>{Math.round(recipe.baseFlourWeight)}g de farinha</span>
                <span aria-hidden="true">·</span>
                <span>Massa total ~{Math.round(totalRawWeight)}g</span>
              </div>

              {recipe.description && (
                <p className={`mt-3 break-words font-medium ${theme.mutedText} ${scale.ingNote}`}>
                  {recipe.description}
                </p>
              )}

              {recipe.type === 'bread' && hydration.formulaWaterWeight > 0 && (
                <p className={`mt-3 break-words font-bold ${theme.accentText} ${scale.ingNote}`}>
                  {ddt.needsIce
                    ? `Dia quente na cozinha (${recipe.climate.roomTemp}°C): use água bem geladinha (~${Math.max(4, Math.round(ddt.waterTempTarget))}°C) para a massa não amolecer.`
                    : `Água ou leite morninho ideal (~${Math.round(ddt.waterTempTarget)}°C): teste no pulso, suave como banho de bebê.`}
                </p>
              )}
              {recipe.type === 'pastry' && lowerName.includes('massa podre') && (
                <p className={`mt-3 break-words font-bold ${theme.accentText} ${scale.ingNote}`}>
                  Segredo da massa podre: use manteiga e água bem geladas e junte só com a ponta dos dedos, sem sovar.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Hands-Free Voice Narration Bar */}
        {hasSteps && (
          <section className={`rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${theme.cardBg}`}>
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2 font-extrabold text-base sm:text-lg">
                <Volume2 className={`w-5 h-5 shrink-0 ${theme.accentText}`} />
                <span>Ouvir o Modo de Preparo em Voz Alta</span>
              </div>
              <p className={`text-sm font-medium break-words ${theme.mutedText}`}>
                {speech.isPlaying && speech.currentStepIndex !== null
                  ? `Lendo passo ${speech.currentStepIndex + 1} de ${recipe.steps.length} — avança sozinho até o final.`
                  : speech.isPaused && speech.currentStepIndex !== null
                  ? `Pausado no passo ${speech.currentStepIndex + 1} de ${recipe.steps.length}.`
                  : 'Ouça todos os passos em sequência sem precisar tocar na tela com a mão suja de massa.'}
              </p>
              {speech.errorMessage && (
                <p className="text-sm font-bold text-red-600">{speech.errorMessage}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {speech.isPlaying ? (
                <button
                  type="button"
                  onClick={speech.pause}
                  className={`min-h-[48px] px-4 py-2 rounded-xl font-bold text-base inline-flex items-center gap-2 whitespace-nowrap transition ${theme.btnPrimary}`}
                >
                  <Pause className="w-5 h-5" />
                  <span>Pausar</span>
                </button>
              ) : speech.isPaused ? (
                <button
                  type="button"
                  onClick={speech.resume}
                  className={`min-h-[48px] px-4 py-2 rounded-xl font-bold text-base inline-flex items-center gap-2 whitespace-nowrap transition ${theme.btnPrimary}`}
                >
                  <Play className="w-5 h-5" />
                  <span>Continuar</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => speech.speakAllFrom(focusOneStep ? clampedStepIdx : 0)}
                  className={`min-h-[48px] px-4 py-2 rounded-xl font-bold text-base inline-flex items-center gap-2 whitespace-nowrap transition ${theme.btnPrimary}`}
                >
                  <Volume2 className="w-5 h-5" />
                  <span>{focusOneStep ? 'Ouvir a partir deste' : 'Ouvir Preparo'}</span>
                </button>
              )}

              {(speech.isPlaying || speech.isPaused) && (
                <button
                  type="button"
                  onClick={speech.stop}
                  className={`min-h-[48px] px-4 py-2 rounded-xl font-bold text-base inline-flex items-center gap-2 whitespace-nowrap transition ${theme.btnSecondary}`}
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>Parar</span>
                </button>
              )}

              {speech.isSupported && (
                <div
                  className={`inline-flex items-center rounded-xl p-0.5 ${theme.segBg}`}
                  role="group"
                  aria-label="Velocidade da voz"
                >
                  {(
                    [
                      { val: 0.85, label: '0,85x' },
                      { val: 1, label: '1x' },
                      { val: 1.15, label: '1,15x' },
                    ] as { val: SpeechRate; label: string }[]
                  ).map((sp) => (
                    <button
                      key={sp.val}
                      type="button"
                      onClick={() => speech.setRate(sp.val)}
                      aria-pressed={speech.rate === sp.val}
                      className={`min-h-[42px] px-2.5 rounded-lg font-extrabold text-xs sm:text-sm whitespace-nowrap transition tabular-nums ${
                        speech.rate === sp.val ? theme.segActive : theme.segIdle
                      }`}
                    >
                      {sp.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Interactive Rest & Oven Kitchen Timer Panel */}
        <div ref={timerPanelRef}>
          <KitchenTimerPanel
            timer={kitchenTimer}
            steps={recipe.steps}
            theme={{
              cardBg: theme.cardBg,
              subCardBg: theme.subCardBg,
              tipBg: theme.tipBg,
              mutedText: theme.mutedText,
              accentText: theme.accentText,
              btnPrimary: theme.btnPrimary,
              btnSecondary: theme.btnSecondary,
              segBg: theme.segBg,
              segActive: theme.segActive,
              segIdle: theme.segIdle,
              isLight,
            }}
          />
        </div>

        {/* Mobile/Tablet View Controls */}
        <section className="flex flex-wrap items-center justify-between gap-3">
          {/* Section Switcher for phones & narrow tablets */}
          <div
            className={`inline-flex lg:hidden items-center rounded-xl p-1 ${theme.segBg}`}
            role="tablist"
            aria-label="Seções da receita"
          >
            {(
              [
                { id: 'all', label: 'Tudo' },
                { id: 'ingredients', label: `Ingredientes (${checkedCount}/${recipe.ingredients.length})` },
                { id: 'steps', label: `Passos (${doneStepsCount}/${recipe.steps.length})` },
              ] as { id: SectionFilter; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={sectionFilter === tab.id}
                onClick={() => setSectionFilter(tab.id)}
                className={`min-h-[44px] px-3 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition ${
                  sectionFilter === tab.id ? theme.segActive : theme.segIdle
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Focused 1-step-at-a-time toggle */}
          {hasSteps && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setFocusOneStep((f) => !f);
                  if (!focusOneStep) {
                    setSectionFilter('all');
                  }
                }}
                aria-pressed={focusOneStep}
                className={`min-h-[44px] px-4 py-2 rounded-xl font-bold text-sm sm:text-base whitespace-nowrap transition ${
                  focusOneStep ? theme.btnPrimary : theme.btnSecondary
                }`}
              >
                {focusOneStep ? 'Ver Lista Completa' : 'Ler 1 Passo por Vez'}
              </button>

              {(checkedCount > 0 || doneStepsCount > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setCheckedIngredients({});
                    setCompletedSteps({});
                  }}
                  className={`min-h-[44px] px-4 py-2 rounded-xl font-bold text-sm sm:text-base whitespace-nowrap transition ${theme.btnSecondary}`}
                >
                  Desmarcar tudo
                </button>
              )}
            </div>
          )}
        </section>

        {/* Focused 1-Step Mode OR Full Responsive Grid */}
        {focusOneStep && focusedStep ? (
          <div className="space-y-6">
            {renderStepCard(focusedStep, clampedStepIdx, true)}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* Ingredients Checklist */}
            {(sectionFilter === 'all' || sectionFilter === 'ingredients') && (
              <section
                className={`${
                  sectionFilter === 'ingredients' ? 'lg:col-span-12' : 'lg:col-span-5'
                } space-y-3`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className={`font-extrabold ${scale.sectionHeading}`}>
                    O que você vai precisar
                  </h2>
                  <span className={`font-bold text-base tabular-nums ${theme.mutedText}`}>
                    {checkedCount}/{recipe.ingredients.length} separados
                  </span>
                </div>

                <div className="space-y-3">
                  {recipe.ingredients.map((ing) => {
                    const isChecked = Boolean(checkedIngredients[ing.id]);
                    const householdMeasure = getHouseholdMeasureEstimate(
                      ing.name,
                      ing.category,
                      ing.weight
                    );
                    return (
                      <button
                        key={ing.id}
                        type="button"
                        onClick={() => toggleIngredient(ing.id)}
                        aria-pressed={isChecked}
                        className={`w-full text-left rounded-2xl p-4 sm:p-5 flex items-start gap-4 transition-colors min-h-[72px] ${
                          isChecked ? theme.cardDoneBg : theme.cardBg
                        }`}
                      >
                        <span
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                            isChecked ? theme.checkBoxDone : theme.checkBoxIdle
                          }`}
                        >
                          {isChecked && <Check className="w-6 h-6 stroke-[3]" />}
                        </span>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                            <span
                              className={`font-extrabold break-words ${scale.ingName} ${
                                isChecked ? 'line-through opacity-75' : ''
                              }`}
                            >
                              {ing.name}
                            </span>
                            <span
                              className={`font-mono font-extrabold tabular-nums shrink-0 ${scale.ingWeight} ${
                                isChecked ? 'opacity-75' : theme.accentText
                              }`}
                            >
                              {Math.round(ing.weight)} g
                            </span>
                          </div>

                          <div
                            className={`font-bold break-words ${scale.ingMeasure} ${
                              isChecked ? 'opacity-75' : theme.measureBadge
                            }`}
                          >
                            {householdMeasure}
                          </div>

                          {ing.notes && (
                            <p className={`break-words font-medium opacity-90 ${scale.ingNote}`}>
                              {ing.notes}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Step-by-Step Instructions */}
            {(sectionFilter === 'all' || sectionFilter === 'steps') && (
              <section
                className={`${
                  sectionFilter === 'steps' ? 'lg:col-span-12' : 'lg:col-span-7'
                } space-y-4`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className={`font-extrabold ${scale.sectionHeading}`}>
                    Como fazer (passo a passo)
                  </h2>
                  <span className={`font-bold text-base tabular-nums ${theme.mutedText}`}>
                    {doneStepsCount}/{recipe.steps.length} feitos
                  </span>
                </div>

                <div className="space-y-4">
                  {recipe.steps.map((step, idx) => renderStepCard(step, idx, false))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Bottom Thumb Navigation Bar when reading 1 step at a time */}
      {focusOneStep && focusedStep && (
        <footer
          className={`fixed bottom-0 left-0 right-0 z-40 px-4 py-3 ${
            isLight
              ? 'bg-white/95 border-t-2 border-black'
              : 'bg-black/95 border-t-2 border-stone-500'
          }`}
        >
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={clampedStepIdx === 0}
              onClick={() => setActiveStepIndex((i) => Math.max(0, i - 1))}
              className={`min-h-[48px] px-4 py-2 rounded-xl font-bold text-base inline-flex items-center gap-1.5 disabled:opacity-40 transition ${theme.btnSecondary}`}
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Anterior</span>
            </button>

            <span className="font-mono font-extrabold text-base tabular-nums">
              {clampedStepIdx + 1} / {recipe.steps.length}
            </span>

            <button
              type="button"
              disabled={clampedStepIdx >= recipe.steps.length - 1}
              onClick={() => {
                setCompletedSteps((prev) => ({ ...prev, [focusedStep.id]: true }));
                setActiveStepIndex((i) => Math.min(recipe.steps.length - 1, i + 1));
              }}
              className={`min-h-[48px] px-4 py-2 rounded-xl font-bold text-base inline-flex items-center gap-1.5 disabled:opacity-40 transition ${theme.btnPrimary}`}
            >
              <span>Próximo</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </footer>
      )}
    </div>
  );
};
