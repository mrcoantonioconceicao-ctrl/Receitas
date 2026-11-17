import React, { useState, useEffect } from 'react';
import { ProcessStep } from '../types';
import {
  KitchenTimerController,
  KitchenTimerThemeTokens,
  formatKitchenTimer,
  inferTimerCategory,
} from '../utils/useKitchenTimer';
import {
  Bell,
  BellOff,
  Clock,
  Flame,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Timer,
  Volume2,
} from 'lucide-react';

interface KitchenTimerPanelProps {
  timer: KitchenTimerController;
  steps: ProcessStep[];
  theme: KitchenTimerThemeTokens;
}

export const KitchenTimerPanel: React.FC<KitchenTimerPanelProps> = ({
  timer,
  steps,
  theme,
}) => {
  const [customMinutesDraft, setCustomMinutesDraft] = useState<string>(
    String(Math.max(1, Math.round(timer.totalSeconds / 60)))
  );

  useEffect(() => {
    setCustomMinutesDraft(String(Math.max(1, Math.round(timer.totalSeconds / 60))));
  }, [timer.totalSeconds]);

  const progressPct =
    timer.totalSeconds > 0
      ? Math.min(100, Math.max(0, ((timer.totalSeconds - timer.secondsLeft) / timer.totalSeconds) * 100))
      : 0;

  const restPresets = [10, 30, 45, 60];
  const ovenPresets = [20, 30, 35, 40, 45];
  const presets = timer.category === 'oven' ? ovenPresets : restPresets;

  const timedSteps = steps.filter((s) => s.durationMinutes > 0);

  const handleApplyCustomMinutes = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(customMinutesDraft, 10);
    if (!isNaN(parsed) && parsed >= 1) {
      timer.configureMinutes(parsed, {
        category: timer.category,
        label: timer.category === 'oven' ? 'Tempo de Forno' : 'Descanso da Massa',
        stepId: null,
        autoStart: false,
      });
    }
  };

  return (
    <section
      aria-label="Temporizador da Cozinha para Descanso e Forno"
      className={`rounded-2xl p-5 sm:p-6 space-y-5 transition ${
        timer.isAlarmRinging || timer.isFinished
          ? theme.tipBg + (theme.isLight ? ' ring-4 ring-amber-600' : ' ring-4 ring-yellow-400')
          : theme.cardBg
      }`}
    >
      {/* Top Row: Title + Sound Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Timer className={`w-6 h-6 shrink-0 ${theme.accentText}`} />
          <div className="min-w-0">
            <h2 className="font-extrabold text-lg sm:text-xl leading-tight">
              Temporizador da Cozinha (Descanso &amp; Forno)
            </h2>
            <p className={`text-sm font-medium break-words ${theme.mutedText}`}>
              Escolha se está deixando a massa descansar ou assando no forno — toca um alarme ao terminar.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => timer.testSound()}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl font-bold text-sm inline-flex items-center gap-1.5 whitespace-nowrap transition ${theme.btnSecondary}`}
            title="Ouvir o toque de aviso do timer"
          >
            <Volume2 className="w-4 h-4" />
            <span>Testar Som</span>
          </button>

          <button
            type="button"
            onClick={() => timer.setSoundEnabled(!timer.soundEnabled)}
            aria-pressed={timer.soundEnabled}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl font-bold text-sm inline-flex items-center gap-1.5 whitespace-nowrap transition ${
              timer.soundEnabled ? theme.btnSecondary : theme.btnPrimary
            }`}
          >
            {timer.soundEnabled ? (
              <>
                <Bell className="w-4 h-4" />
                <span>Som Ligado</span>
              </>
            ) : (
              <>
                <BellOff className="w-4 h-4" />
                <span>Silencioso</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Mode Switcher: Descanso da Massa vs Forno */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div
          className={`inline-flex items-center rounded-xl p-1 self-start ${theme.segBg}`}
          role="group"
          aria-label="Tipo de contagem do temporizador"
        >
          <button
            type="button"
            onClick={() => timer.setCategory('rest')}
            aria-pressed={timer.category === 'rest'}
            className={`min-h-[46px] px-4 py-2 rounded-lg font-extrabold text-sm sm:text-base inline-flex items-center gap-2 whitespace-nowrap transition ${
              timer.category === 'rest' ? theme.segActive : theme.segIdle
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Descanso da Massa</span>
          </button>
          <button
            type="button"
            onClick={() => timer.setCategory('oven')}
            aria-pressed={timer.category === 'oven'}
            className={`min-h-[46px] px-4 py-2 rounded-lg font-extrabold text-sm sm:text-base inline-flex items-center gap-2 whitespace-nowrap transition ${
              timer.category === 'oven' ? theme.segActive : theme.segIdle
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>Forno / Assando</span>
          </button>
        </div>

        {/* Custom Minutes Form */}
        <form onSubmit={handleApplyCustomMinutes} className="flex flex-wrap items-center gap-2">
          <label
            htmlFor="kitchen-timer-minutes-input"
            className={`text-sm font-bold ${theme.mutedText}`}
          >
            Minutos:
          </label>
          <input
            id="kitchen-timer-minutes-input"
            type="number"
            min={1}
            max={240}
            value={customMinutesDraft}
            onChange={(e) => setCustomMinutesDraft(e.target.value)}
            className={`w-24 min-h-[46px] px-3 py-2 rounded-xl font-mono font-extrabold text-lg text-center tabular-nums border-2 focus:outline-none ${
              theme.isLight
                ? 'bg-white text-black border-black focus:ring-2 focus:ring-amber-600'
                : 'bg-black text-white border-stone-400 focus:border-yellow-400'
            }`}
          />
          <button
            type="submit"
            className={`min-h-[46px] px-4 py-2 rounded-xl font-bold text-sm sm:text-base whitespace-nowrap transition ${theme.btnSecondary}`}
          >
            Definir Tempo
          </button>
        </form>
      </div>

      {/* Main Countdown Clock & Primary Actions */}
      <div
        className={`rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-5 ${theme.subCardBg}`}
      >
        <div className="space-y-2 min-w-0 flex-1">
          <div className={`text-sm sm:text-base font-extrabold uppercase tracking-wide ${theme.accentText}`}>
            {timer.category === 'oven' ? 'Modo Forno' : 'Modo Descanso'} · {timer.label}
          </div>

          <div
            className="font-mono font-extrabold text-5xl sm:text-6xl tabular-nums tracking-tight leading-none"
            aria-live="polite"
          >
            {formatKitchenTimer(timer.secondsLeft)}
          </div>

          {/* High-contrast progress bar */}
          <div
            className={`w-full h-3 rounded-full overflow-hidden border ${
              theme.isLight ? 'bg-stone-200 border-black/30' : 'bg-stone-800 border-stone-600'
            }`}
          >
            <div
              className={`h-full transition-all duration-300 ${
                theme.isLight ? 'bg-black' : 'bg-yellow-400'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Play / Pause / +/- Adjust / Reset Controls */}
        <div className="flex flex-col gap-2.5 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={timer.toggleRun}
              className={`min-h-[52px] px-6 py-2.5 rounded-xl font-extrabold text-base sm:text-lg inline-flex items-center gap-2 whitespace-nowrap transition ${theme.btnPrimary}`}
            >
              {timer.isRunning ? (
                <>
                  <Pause className="w-5 h-5" />
                  <span>Pausar</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  <span>
                    {timer.secondsLeft > 0 && timer.secondsLeft < timer.totalSeconds
                      ? 'Continuar'
                      : 'Iniciar Timer'}
                  </span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={timer.reset}
              className={`min-h-[52px] px-4 py-2.5 rounded-xl font-bold text-base inline-flex items-center gap-2 whitespace-nowrap transition ${theme.btnSecondary}`}
            >
              <RotateCcw className="w-5 h-5" />
              <span>Zerar</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[-5, -1, 1, 5].map((delta) => (
              <button
                key={delta}
                type="button"
                onClick={() => timer.adjustMinutes(delta)}
                className={`min-h-[44px] px-3 py-1.5 rounded-xl font-mono font-extrabold text-sm inline-flex items-center gap-1 whitespace-nowrap tabular-nums transition ${theme.btnSecondary}`}
              >
                {delta < 0 ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                <span>{Math.abs(delta)} min</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alarm Finished Alert Banner */}
      {(timer.isFinished || timer.isAlarmRinging) && (
        <div
          role="alert"
          className={`rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-2 ${
            theme.isLight
              ? 'bg-amber-200 border-black text-black'
              : 'bg-yellow-400 border-white text-black'
          }`}
        >
          <div className="space-y-0.5">
            <div className="font-extrabold text-xl sm:text-2xl flex items-center gap-2">
              <Bell className="w-6 h-6 shrink-0 animate-bounce" />
              <span>
                Tempo encerrado! ({timer.label})
              </span>
            </div>
            <p className="text-sm sm:text-base font-bold">
              {timer.category === 'oven'
                ? 'Pode conferir o forno — veja se já está douradinho ou faça o teste do palito!'
                : 'O descanso terminou — confira se a massa já cresceu e dobrou de tamanho!'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={timer.dismissAlarm}
              className="min-h-[48px] px-5 py-2.5 rounded-xl bg-black text-white hover:bg-stone-800 font-extrabold text-base whitespace-nowrap transition"
            >
              Desligar Alarme
            </button>
            <button
              type="button"
              onClick={() => {
                timer.configureMinutes(5, {
                  category: timer.category,
                  label: `${timer.label} (+5 min)`,
                  stepId: timer.activeStepId,
                  autoStart: true,
                });
              }}
              className="min-h-[48px] px-4 py-2.5 rounded-xl bg-white text-black border-2 border-black hover:bg-stone-100 font-extrabold text-base whitespace-nowrap transition"
            >
              +5 min
            </button>
          </div>
        </div>
      )}

      {/* Quick Presets + Recipe Steps Shortcuts */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-sm font-bold ${theme.mutedText}`}>
            Tempos rápidos ({timer.category === 'oven' ? 'Forno' : 'Descanso'}):
          </span>
          {presets.map((mins) => (
            <button
              key={mins}
              type="button"
              onClick={() =>
                timer.configureMinutes(mins, {
                  category: timer.category,
                  label: timer.category === 'oven' ? `Forno (${mins} min)` : `Descanso (${mins} min)`,
                  stepId: null,
                  autoStart: false,
                })
              }
              className={`min-h-[44px] px-3.5 py-2 rounded-xl font-mono font-bold text-sm tabular-nums whitespace-nowrap transition ${
                !timer.activeStepId && Math.round(timer.totalSeconds / 60) === mins
                  ? theme.btnPrimary
                  : theme.btnSecondary
              }`}
            >
              {mins} min
            </button>
          ))}
        </div>

        {timedSteps.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-sm font-bold ${theme.mutedText}`}>
              Da receita atual:
            </span>
            {timedSteps.map((step) => {
              const stepCat = inferTimerCategory(step.name, step.temperature);
              const isSelected = timer.activeStepId === step.id;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() =>
                    timer.configureMinutes(step.durationMinutes, {
                      category: stepCat,
                      label: step.name.replace(/^\d+\.\s*/, ''),
                      stepId: step.id,
                      autoStart: true,
                    })
                  }
                  className={`min-h-[44px] px-3.5 py-2 rounded-xl font-bold text-sm inline-flex items-center gap-1.5 whitespace-nowrap transition ${
                    isSelected ? theme.btnPrimary : theme.btnSecondary
                  }`}
                >
                  {stepCat === 'oven' ? (
                    <Flame className="w-4 h-4 shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 shrink-0" />
                  )}
                  <span>
                    {step.name.replace(/^\d+\.\s*/, '')} ({step.durationMinutes} min)
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
