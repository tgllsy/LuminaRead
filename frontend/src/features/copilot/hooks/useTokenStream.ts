import { useState, useEffect, useRef, useCallback } from 'react';

interface UseTokenStreamOptions {
  speedMs?: number;
  charsPerTick?: number;
  onComplete?: () => void;
}

export function useTokenStream(
  fullText: string,
  enabled = true,
  options: UseTokenStreamOptions = {}
) {
  const { speedMs = 20, charsPerTick = 2, onComplete } = options;
  const [displayedLength, setDisplayedLength] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!enabled || !fullText) {
      setDisplayedLength(fullText ? fullText.length : 0);
      setIsTyping(false);
      return;
    }

    setDisplayedLength(0);
    setIsTyping(true);

    let currentLen = 0;
    const interval = setInterval(() => {
      // 遇到标点微调步伐，平滑模拟真实 LLM Token 吐字
      const nextStep = Math.min(charsPerTick, fullText.length - currentLen);
      currentLen += nextStep;
      setDisplayedLength(currentLen);

      if (currentLen >= fullText.length) {
        clearInterval(interval);
        setIsTyping(false);
        onCompleteRef.current?.();
      }
    }, speedMs);

    return () => clearInterval(interval);
  }, [fullText, enabled, speedMs, charsPerTick]);

  const skipToEnd = useCallback(() => {
    setDisplayedLength(fullText.length);
    setIsTyping(false);
    onCompleteRef.current?.();
  }, [fullText]);

  const displayedText = fullText.slice(0, displayedLength);

  return {
    displayedText,
    isTyping,
    skipToEnd,
  };
}
