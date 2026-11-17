import { useState, useEffect, useRef, useCallback } from 'react';
import { ProcessStep } from '../types';

export type SpeechRate = 0.85 | 1 | 1.15;

interface StepSpeechState {
  isSupported: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  currentStepIndex: number | null;
  rate: SpeechRate;
  errorMessage: string | null;
  setRate: (rate: SpeechRate) => void;
  speakAllFrom: (startIndex?: number) => void;
  speakSingleStep: (stepIndex: number) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

function splitIntoChunks(text: string, maxLen = 190): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];
  const sentences = cleaned.split(/(?<=[.!?;:])\s+/);
  const chunks: string[] = [];
  let buffer = '';

  for (const sentence of sentences) {
    if (sentence.length <= maxLen) {
      if ((buffer + ' ' + sentence).trim().length <= maxLen) {
        buffer = (buffer + ' ' + sentence).trim();
      } else {
        if (buffer) chunks.push(buffer);
        buffer = sentence;
      }
    } else {
      if (buffer) {
        chunks.push(buffer);
        buffer = '';
      }
      // Split overly long sentence by commas or words
      const words = sentence.split(' ');
      let wordBuf = '';
      for (const word of words) {
        if ((wordBuf + ' ' + word).trim().length <= maxLen) {
          wordBuf = (wordBuf + ' ' + word).trim();
        } else {
          if (wordBuf) chunks.push(wordBuf);
          wordBuf = word;
        }
      }
      if (wordBuf) chunks.push(wordBuf);
    }
  }
  if (buffer) chunks.push(buffer);
  return chunks;
}

function buildStepChunks(step: ProcessStep, index: number, total: number): string[] {
  const introParts: string[] = [`Passo ${index + 1} de ${total}. ${step.name}.`];
  if (step.durationMinutes > 0) {
    introParts.push(`Tempo estimado: ${step.durationMinutes} minutos.`);
  }
  if (step.temperature) {
    introParts.push(`Temperatura: ${step.temperature}.`);
  }

  const chunks = [...splitIntoChunks(introParts.join(' ')), ...splitIntoChunks(step.description)];
  if (step.criticalControlPoint && step.criticalControlPoint.trim()) {
    chunks.push(...splitIntoChunks(`Segredo da vovó: ${step.criticalControlPoint}`));
  }
  return chunks;
}

export function useRecipeSpeech(
  steps: ProcessStep[],
  recipeKey: string,
  onStepChange?: (stepIndex: number) => void
): StepSpeechState {
  const isSupported =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof SpeechSynthesisUtterance !== 'undefined';

  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number | null>(null);
  const [rate, setRateState] = useState<SpeechRate>(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const sessionIdRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const pausedTargetRef = useRef<{
    stepIndex: number;
    chunkIndex: number;
    singleOnly: boolean;
  } | null>(null);
  const activeCursorRef = useRef<{
    stepIndex: number;
    chunkIndex: number;
    singleOnly: boolean;
  } | null>(null);
  const rateRef = useRef<SpeechRate>(1);
  const onStepChangeRef = useRef(onStepChange);
  onStepChangeRef.current = onStepChange;

  useEffect(() => {
    if (!isSupported) return;
    const loadVoices = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    loadVoices();
    window.speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', loadVoices);
    };
  }, [isSupported]);

  const clearPendingTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const stop = useCallback(() => {
    sessionIdRef.current += 1;
    clearPendingTimer();
    pausedTargetRef.current = null;
    activeCursorRef.current = null;
    if (isSupported) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentStepIndex(null);
  }, [isSupported]);

  // Stop speech cleanly when switching recipes or unmounting
  useEffect(() => {
    stop();
    return () => {
      stop();
    };
  }, [recipeKey, stop]);

  const pickPortugueseVoice = (): SpeechSynthesisVoice | null => {
    const voices = voicesRef.current;
    if (!voices.length) return null;
    return (
      voices.find((v) => v.lang.toLowerCase() === 'pt-br') ||
      voices.find((v) => v.lang.toLowerCase().startsWith('pt')) ||
      null
    );
  };

  const speakChunk = useCallback(
    (stepIndex: number, chunkIndex: number, singleOnly: boolean, sessionId: number) => {
      if (sessionId !== sessionIdRef.current) return;
      if (!isSupported || stepIndex >= steps.length) {
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentStepIndex(null);
        activeCursorRef.current = null;
        return;
      }

      const step = steps[stepIndex];
      const chunks = buildStepChunks(step, stepIndex, steps.length);

      if (chunkIndex >= chunks.length) {
        if (singleOnly || stepIndex + 1 >= steps.length) {
          setIsPlaying(false);
          setIsPaused(false);
          setCurrentStepIndex(null);
          activeCursorRef.current = null;
          return;
        }
        // Natural pause before moving hands-free to next step
        timerRef.current = window.setTimeout(() => {
          if (sessionId !== sessionIdRef.current) return;
          setCurrentStepIndex(stepIndex + 1);
          onStepChangeRef.current?.(stepIndex + 1);
          speakChunk(stepIndex + 1, 0, false, sessionId);
        }, 850);
        return;
      }

      activeCursorRef.current = { stepIndex, chunkIndex, singleOnly };
      setCurrentStepIndex(stepIndex);
      if (chunkIndex === 0) {
        onStepChangeRef.current?.(stepIndex);
      }

      const utterance = new SpeechSynthesisUtterance(chunks[chunkIndex]);
      utterance.lang = 'pt-BR';
      utterance.rate = rateRef.current;
      const ptVoice = pickPortugueseVoice();
      if (ptVoice) {
        utterance.voice = ptVoice;
      }

      utterance.onend = () => {
        if (sessionId !== sessionIdRef.current) return;
        speakChunk(stepIndex, chunkIndex + 1, singleOnly, sessionId);
      };

      utterance.onerror = (ev) => {
        if (sessionId !== sessionIdRef.current) return;
        if (ev.error === 'canceled' || ev.error === 'interrupted') return;
        setErrorMessage('Não foi possível reproduzir o áudio neste navegador.');
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentStepIndex(null);
      };

      window.speechSynthesis.speak(utterance);
    },
    [isSupported, steps]
  );

  const speakAllFrom = useCallback(
    (startIndex = 0) => {
      if (!isSupported) {
        setErrorMessage('Seu navegador não oferece suporte à leitura em voz alta.');
        return;
      }
      if (!steps.length) return;
      setErrorMessage(null);
      sessionIdRef.current += 1;
      const session = sessionIdRef.current;
      clearPendingTimer();
      pausedTargetRef.current = null;
      window.speechSynthesis.cancel();

      const safeStart = Math.max(0, Math.min(startIndex, steps.length - 1));
      setIsPlaying(true);
      setIsPaused(false);
      setCurrentStepIndex(safeStart);
      speakChunk(safeStart, 0, false, session);
    },
    [isSupported, steps, speakChunk]
  );

  const speakSingleStep = useCallback(
    (stepIndex: number) => {
      if (!isSupported) {
        setErrorMessage('Seu navegador não oferece suporte à leitura em voz alta.');
        return;
      }
      if (stepIndex < 0 || stepIndex >= steps.length) return;
      setErrorMessage(null);
      sessionIdRef.current += 1;
      const session = sessionIdRef.current;
      clearPendingTimer();
      pausedTargetRef.current = null;
      window.speechSynthesis.cancel();

      setIsPlaying(true);
      setIsPaused(false);
      setCurrentStepIndex(stepIndex);
      speakChunk(stepIndex, 0, true, session);
    },
    [isSupported, steps, speakChunk]
  );

  const pause = useCallback(() => {
    if (!isSupported || !isPlaying) return;
    const cursor = activeCursorRef.current;
    sessionIdRef.current += 1;
    clearPendingTimer();
    window.speechSynthesis.cancel();
    if (cursor) {
      pausedTargetRef.current = cursor;
    }
    setIsPlaying(false);
    setIsPaused(true);
  }, [isSupported, isPlaying]);

  const resume = useCallback(() => {
    if (!isSupported || !isPaused) return;
    const target = pausedTargetRef.current;
    if (!target) {
      speakAllFrom(currentStepIndex ?? 0);
      return;
    }
    sessionIdRef.current += 1;
    const session = sessionIdRef.current;
    pausedTargetRef.current = null;
    setIsPlaying(true);
    setIsPaused(false);
    speakChunk(target.stepIndex, target.chunkIndex, target.singleOnly, session);
  }, [isSupported, isPaused, currentStepIndex, speakAllFrom, speakChunk]);

  const setRate = useCallback(
    (newRate: SpeechRate) => {
      rateRef.current = newRate;
      setRateState(newRate);
      // If currently speaking, restart current chunk seamlessly at new speed
      const cursor = activeCursorRef.current;
      if (isPlaying && cursor) {
        sessionIdRef.current += 1;
        const session = sessionIdRef.current;
        clearPendingTimer();
        window.speechSynthesis.cancel();
        speakChunk(cursor.stepIndex, cursor.chunkIndex, cursor.singleOnly, session);
      }
    },
    [isPlaying, speakChunk]
  );

  return {
    isSupported,
    isPlaying,
    isPaused,
    currentStepIndex,
    rate,
    errorMessage,
    setRate,
    speakAllFrom,
    speakSingleStep,
    pause,
    resume,
    stop,
  };
}
