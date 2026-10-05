import { useCallback, useEffect, useRef, useState } from 'react';
import { createOrderAlarm, type OrderAlarm } from './alarm';

export function useOrderAlarm(ringing: boolean): { soundOn: boolean; turnOn: () => Promise<void>; chime: () => void } {
  const alarmRef = useRef<OrderAlarm | null>(null);
  const [soundOn, setSoundOn] = useState(false);

  const turnOn = useCallback(async () => {
    if (!alarmRef.current) alarmRef.current = createOrderAlarm();
    const running = await alarmRef.current.enable();
    setSoundOn(running);
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

  return { soundOn, turnOn, chime };
}
