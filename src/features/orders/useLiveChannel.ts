import { useEffect, useRef, useState } from 'react';
import { store } from '../../store';
import { ordersApi } from '../../services/ordersApi';
import { createLiveChannel, type LiveStatus, type SocketLike } from './liveChannel';

/** Keeps the live order channel open for a shop; `onSignal` fires when a new order is announced. */
export function useLiveChannel(input: { shopId: string; onSignal: () => void }): { status: LiveStatus } {
  const { shopId } = input;
  const [status, setStatus] = useState<LiveStatus>('connecting');
  const onSignalRef = useRef(input.onSignal);
  useEffect(() => {
    onSignalRef.current = input.onSignal;
  });

  useEffect(() => {
    const channel = createLiveChannel({
      shopId,
      negotiate: () =>
        store
          .dispatch(ordersApi.endpoints.negotiateRealtime.initiate({ shopId }, { forceRefetch: true, subscribe: false }))
          .unwrap(),
      openSocket: (url) => {
        if (typeof WebSocket === 'undefined') throw new Error('WebSocket unavailable');
        return new WebSocket(url) as unknown as SocketLike;
      },
      onSignal: () => onSignalRef.current(),
      onStatus: setStatus,
    });
    channel.start();
    return () => channel.stop();
  }, [shopId]);

  return { status };
}
