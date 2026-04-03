import React, { useEffect, useRef, useState } from "react";

const GOOGLE_SCRIPT_ID = "google-identity-services";

const loadGoogleIdentityScript = () =>
  new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve(window.google);
      return;
    }

    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID);

    const handleLoad = () => resolve(window.google);
    const handleError = () => reject(new Error("Failed to load Google sign-in"));

    if (existingScript) {
      existingScript.addEventListener("load", handleLoad, { once: true });
      existingScript.addEventListener("error", handleError, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });
    document.head.appendChild(script);
  });

const GoogleSignInButton = ({ onCredentialResponse }) => {
  const buttonRef = useRef(null);
  const callbackRef = useRef(onCredentialResponse);
  const [error, setError] = useState("");
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    callbackRef.current = onCredentialResponse;
  }, [onCredentialResponse]);

  useEffect(() => {
    let isCancelled = false;

    const initializeGoogleButton = async () => {
      if (!clientId || !buttonRef.current) {
        return;
      }

      try {
        setError("");
        await loadGoogleIdentityScript();

        if (isCancelled || !buttonRef.current || !window.google?.accounts?.id) {
          return;
        }

        buttonRef.current.innerHTML = "";

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: ({ credential }) => callbackRef.current?.(credential),
          ux_mode: "popup",
          context: "signin",
        });

        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          width: 320,
        });
      } catch (googleError) {
        if (!isCancelled) {
          setError(googleError.message || "Google sign-in is unavailable right now.");
        }
      }
    };

    initializeGoogleButton();

    return () => {
      isCancelled = true;
    };
  }, [clientId]);

  if (!clientId) {
    return (
      <p className="text-xs text-amber-300 text-center">
        Google sign-in is unavailable until <code>VITE_GOOGLE_CLIENT_ID</code> is configured.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 text-xs text-gray-300">
        <span className="h-px flex-1 bg-white/15" />
        <span>or continue with</span>
        <span className="h-px flex-1 bg-white/15" />
      </div>

      <div ref={buttonRef} className="flex justify-center" />

      {error && <p className="text-xs text-red-300 text-center">{error}</p>}
    </div>
  );
};

export default GoogleSignInButton;
