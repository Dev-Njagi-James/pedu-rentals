"use client";

import { useEffect, useRef } from "react";
import * as Ably from "ably";

let _ablyRealtime = null;
function getAblyRealtimeClient() {
  if (!_ablyRealtime) {
    _ablyRealtime = new Ably.Realtime({
      authUrl: "/api/v1/events/token",
      authMethod: "GET",
    });
  }
  return _ablyRealtime;
}

/**
 * Subscribes to an Ably channel for the lifetime of the calling component.
 *
 * @param {string} channelName - e.g. "listings:feed" or `listing:${listing_id}`
 * @param {(eventName: string, message: object) => void} onMessage - called with
 *   (event name e.g. "listing.update", message.data payload) for every message received
 */
export function useRealtimeChannel(channelName, onMessage) {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!channelName) return;

    const ably = getAblyRealtimeClient();
    const channel = ably.channels.get(channelName);

    const handler = (message) => {
      onMessageRef.current?.(message.name, message.data);
    };

    channel.subscribe(handler);

    return () => {
      channel.unsubscribe(handler);
    };
  }, [channelName]);
}
