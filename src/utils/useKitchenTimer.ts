import { useState, useEffect, useRef, useCallback } from 'react';

export type KitchenTimerCategory = 'rest' | 'oven';

export interface KitchenTimerThemeTokens {
  cardBg: string;
  subCardBg: string;
  tipBg: string;
  mutedText: string;
  accentText: string;
  btnPrimary: string;
  btnSecondary: string;
  segBg: string;
  segActive: string;
  segIdle: string;
  isLight: boolean;
}

export function formatKitchenTimer(secs: number): string {
  const safe = Math.max(0, Math.floor(secs));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function inferTimerCategory(stepName: string, temperature?: string): KitchenTimerCategory {
  const text = `${stepName} ${temperature || ''}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const isUnpluggedOven = text.includes('forno desligado');
  if (isUnpluggedOven) return 'rest';

  if (
    text.includes('assar') ||
    text.includes('forno') ||
    text.includes('180') ||
    text.includes('200') ||
    text.includes('220') ||
    text.includes('dourar')
  ) {
    return 'oven';
  }
  return 'rest';
}

export function useKitchenTimer() {
  const [category, setCategory] = useState<KitchenTimerCategory>('rest');
  const [label, setLabel] = useState<string>('Descanso da Massa');
  const [totalSeconds, setTotalSeconds] = useState<number>(40 * 60);
  const [secondsLeft, setSecondsLeft] = useState<number>(40 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [isAlarmRinging, setIsAlarmRinging] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);

  const endTimestampRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const alarmIntervalRef = useRef<number | null>(null);
  const alarmCycleCountRef = useRef<number>(0);

  const getOrResumeAudioContext = useCallback((): AudioContext | null => {
    try {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioCtx();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
      return audioCtxRef.current;
    } catch {
      return null;
    }
  }, []);

  // Warm bell chime chime (distinct double kitchen timer ring)
  const playKitchenBell = useCallback(
    (forcePlay = false) => {
      if (!forcePlay && !soundEnabled) return;
      const ctx = getOrResumeAudioContext();
      if (!ctx) return;

      try {
        const now = ctx.currentTime;
        const notes = [880, 1108.73, 1318.51, 880, 1108.73, 1318.51];
        const offsets = [0, 0.14, 0.28, 0.55, 0.69, 0.83];

        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = now + offsets[i];

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0.001, start);
          gain.gain.linearRampToValueAtTime(0.24, start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.26);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(start);
          osc.stop(start + 0.28);
        });
      } catch {
        // Ignore browser audio restriction errors
      }
    },
    [getOrResumeAudioContext, soundEnabled]
  );

  const stopAlarmLoop = useCallback(() => {
    if (alarmIntervalRef.current !== null) {
      window.clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
    alarmCycleCountRef.current = 0;
    setIsAlarmRinging(false);
  }, []);

  const triggerAlarm = useCallback(() => {
    stopAlarmLoop();
    setIsAlarmRinging(true);
    playKitchenBell();

    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate([300, 120, 300, 120, 300]);
      } catch {
        // Ignore vibrate failure
      }
    }

    alarmCycleCountRef.current = 1;
    alarmIntervalRef.current = window.setInterval(() => {
      if (alarmCycleCountRef.current >= 12) {
        stopAlarmLoop();
        return;
      }
      alarmCycleCountRef.current += 1;
      playKitchenBell();
    }, 2400);
  }, [playKitchenBell, stopAlarmLoop]);

  // Drift-free interval ticker using real wall clock endTimestampRef
  useEffect(() => {
    if (!isRunning) return;

    if (!endTimestampRef.current) {
      endTimestampRef.current = Date.now() + secondsLeft * 1000;
    }

    const tick = () => {
      if (!endTimestampRef.current) return;
      const remainingMs = endTimestampRef.current - Date.now();
      if (remainingMs <= 0) {
        endTimestampRef.current = null;
        setSecondsLeft(0);
        setIsRunning(false);
        setIsFinished(true);
        triggerAlarm();
      } else {
        setSecondsLeft(Math.ceil(remainingMs / 1000));
      }
    };

    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [isRunning, triggerAlarm]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (alarmIntervalRef.current !== null) {
        window.clearInterval(alarmIntervalRef.current);
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const switchCategory = useCallback(
    (nextCat: KitchenTimerCategory) => {
      setCategory(nextCat);
      if (!isRunning && !activeStepId) {
        const defaultMins = nextCat === 'oven' ? 35 : 40;
        const nextSecs = defaultMins * 60;
        setTotalSeconds(nextSecs);
        setSecondsLeft(nextSecs);
        setLabel(nextCat === 'oven' ? 'Tempo de Forno' : 'Descanso da Massa');
        setIsFinished(false);
        stopAlarmLoop();
      }
    },
    [activeStepId, isRunning, stopAlarmLoop]
  );

  const configureMinutes = useCallback(
    (
      minutes: number,
      options?: {
        category?: KitchenTimerCategory;
        label?: string;
        stepId?: string | null;
        autoStart?: boolean;
      }
    ) => {
      getOrResumeAudioContext();
      stopAlarmLoop();
      setIsFinished(false);
      endTimestampRef.current = null;

      const safeMins = Math.max(1, Math.min(240, Math.round(minutes)));
      const secs = safeMins * 60;

      if (options?.category) setCategory(options.category);
      if (options?.label !== undefined) setLabel(options.label);
      if (options?.stepId !== undefined) setActiveStepId(options.stepId);
      else setActiveStepId(null);

      setTotalSeconds(secs);
      setSecondsLeft(secs);

      if (options?.autoStart) {
        endTimestampRef.current = Date.now() + secs * 1000;
        setIsRunning(true);
      } else {
        setIsRunning(false);
      }
    },
    [getOrResumeAudioContext, stopAlarmLoop]
  );

  const start = useCallback(() => {
    getOrResumeAudioContext();
    stopAlarmLoop();
    setIsFinished(false);

    const startFrom = secondsLeft > 0 ? secondsLeft : Math.max(60, totalSeconds);
    if (secondsLeft <= 0) {
      setSecondsLeft(startFrom);
    }
    endTimestampRef.current = Date.now() + startFrom * 1000;
    setIsRunning(true);
  }, [getOrResumeAudioContext, secondsLeft, stopAlarmLoop, totalSeconds]);

  const pause = useCallback(() => {
    if (endTimestampRef.current) {
      const remaining = Math.max(0, Math.ceil((endTimestampRef.current - Date.now()) / 1000));
      setSecondsLeft(remaining);
    }
    endTimestampRef.current = null;
    setIsRunning(false);
  }, []);

  const toggleRun = useCallback(() => {
    if (isRunning) {
      pause();
    } else {
      start();
    }
  }, [isRunning, pause, start]);

  const reset = useCallback(() => {
    stopAlarmLoop();
    endTimestampRef.current = null;
    setIsRunning(false);
    setIsFinished(false);
    setSecondsLeft(totalSeconds);
  }, [stopAlarmLoop, totalSeconds]);

  const adjustMinutes = useCallback(
    (deltaMinutes: number) => {
      getOrResumeAudioContext();
      stopAlarmLoop();
      setIsFinished(false);

      const deltaSecs = deltaMinutes * 60;
      const base = isRunning && endTimestampRef.current
        ? Math.max(0, Math.ceil((endTimestampRef.current - Date.now()) / 1000))
        : secondsLeft;

      const nextSecs = Math.max(60, Math.min(240 * 60, base + deltaSecs));
      setSecondsLeft(nextSecs);
      setTotalSeconds((prev) => Math.max(nextSecs, prev + (deltaSecs > 0 ? deltaSecs : 0)));

      if (isRunning) {
        endTimestampRef.current = Date.now() + nextSecs * 1000;
      }
    },
    [getOrResumeAudioContext, isRunning, secondsLeft, stopAlarmLoop]
  );

  const startOrToggleForStep = useCallback(
    (stepId: string, durationMinutes: number, stepName: string, temperature?: string) => {
      getOrResumeAudioContext();
      const detectedCategory = inferTimerCategory(stepName, temperature);
      const cleanLabel = stepName.replace(/^\d+\.\s*/, '');

      if (activeStepId === stepId) {
        toggleRun();
        return;
      }

      configureMinutes(durationMinutes, {
        category: detectedCategory,
        label: cleanLabel,
        stepId,
        autoStart: true,
      });
    },
    [activeStepId, configureMinutes, getOrResumeAudioContext, toggleRun]
  );

  const dismissAlarm = useCallback(() => {
    stopAlarmLoop();
    setIsFinished(false);
  }, [stopAlarmLoop]);

  const testSound = useCallback(() => {
    playKitchenBell(true);
  }, [playKitchenBell]);

  const resetForNewRecipe = useCallback(
    (defaultCategory: KitchenTimerCategory = 'rest', defaultMinutes = 40) => {
      stopAlarmLoop();
      endTimestampRef.current = null;
      setIsRunning(false);
      setIsFinished(false);
      setActiveStepId(null);
      setCategory(defaultCategory);
      setLabel(defaultCategory === 'oven' ? 'Tempo de Forno' : 'Descanso da Massa');
      const secs = Math.max(60, Math.round(defaultMinutes * 60));
      setTotalSeconds(secs);
      setSecondsLeft(secs);
    },
    [stopAlarmLoop]
  );

  return {
    category,
    label,
    totalSeconds,
    secondsLeft,
    isRunning,
    isFinished,
    isAlarmRinging,
    soundEnabled,
    activeStepId,
    setCategory: switchCategory,
    setLabel,
    setSoundEnabled,
    configureMinutes,
    start,
    pause,
    toggleRun,
    reset,
    adjustMinutes,
    startOrToggleForStep,
    dismissAlarm,
    testSound,
    resetForNewRecipe,
  };
}

export type KitchenTimerController = ReturnType<typeof useKitchenTimer>;
