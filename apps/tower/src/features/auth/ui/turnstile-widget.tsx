"use client";

import { useEffect, useRef } from "react";

const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileRenderOptions = {
  sitekey: string;
  theme: "auto" | "light" | "dark";
  size: "normal" | "flexible" | "compact";
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
};

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
      remove: (widgetId: string) => void;
    };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) {
    return Promise.resolve();
  }
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = TURNSTILE_SCRIPT_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        // Allow a retry on the next mount instead of caching the failure forever.
        scriptPromise = null;
        script.remove();
        reject(new Error("turnstile_script_failed"));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

export type TurnstileWidgetProps = {
  siteKey: string;
  /** Receives the fresh token on success, and `null` when the token expires or the challenge errors. */
  onToken: (token: string | null) => void;
};

/**
 * Cloudflare Turnstile challenge widget. Tokens are single-use: after a rejected submission the
 * parent must remount this component (e.g. via `key`) to obtain a fresh token.
 */
export function TurnstileWidget(props: TurnstileWidgetProps) {
  const { siteKey, onToken } = props;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    let cancelled = false;
    let widgetId: string | null = null;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) {
          return;
        }
        widgetId = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: "auto",
          size: "flexible",
          callback: (token) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(null),
          "error-callback": () => onTokenRef.current(null),
        });
      })
      .catch(() => {
        // Script blocked/unreachable: no token is produced and the server rejects the submission
        // with its captcha error copy; nothing useful to render in-place here.
      });

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) {
        window.turnstile.remove(widgetId);
      }
    };
  }, [siteKey]);

  return <div ref={containerRef} />;
}
