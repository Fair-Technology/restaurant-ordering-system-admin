import { useCallback, useEffect, useRef, useState } from 'react';
import { createOrderAlarm, type OrderAlarm } from './alarm';

export function useOrderAlarm(ringing: boolean): {
  soundOn: boolean;
  enabling: boolean;
  turnOn: () => Promise<boolean>;
  chime: () => void;
} {
  const alarmRef = useRef<OrderAlarm | null>(null);
  const [soundOn, setSoundOn] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const enablingRef = useRef(false);

  /** True when the audio context really runs, false when the browser refused. */
  const turnOn = useCallback(async (): Promise<boolean> => {
    if (enablingRef.current) return false;
    enablingRef.current = true;
    setEnabling(true);
    try {
      if (!alarmRef.current) alarmRef.current = createOrderAlarm();
      const running = await alarmRef.current.enable();
      setSoundOn(running);
      return running;
    } catch {
      setSoundOn(false);
      return false;
    } finally {
      enablingRef.current = false;
      setEnabling(false);
    }
  }, []);

  const chime = useCallback(() => {
    alarmRef.current?.chime();
  }, []);

  useEffect(() => {
    alarmRef.current?.setRinging(ringing && soundOn);
  }, [ringing, soundOn]);

  useEffect(
    () => () => {
      alarmRef.current?.dispose();
      alarmRef.current = null;
    },
    [],
  );

  return { soundOn, enabling, turnOn, chime };
}
