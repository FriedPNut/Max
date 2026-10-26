"use client";

import { useEffect, useState } from "react";

export const APP_REFRESH_EVENT = "max:refresh";

export function requestClientRefresh() {
  window.dispatchEvent(new Event(APP_REFRESH_EVENT));
}

/** Increments when the app asks client-held data to resync. */
export function useAppRefreshSignal() {
  const [signal, setSignal] = useState(0);

  useEffect(() => {
    function refresh() {
      setSignal((current) => current + 1);
    }

    window.addEventListener(APP_REFRESH_EVENT, refresh);
    return () => window.removeEventListener(APP_REFRESH_EVENT, refresh);
  }, []);

  return signal;
}
