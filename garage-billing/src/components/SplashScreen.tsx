"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

/**
 * Full-screen launch animation shown once per browser tab session.
 * Racing-flag themed: logo zooms/settles in over a checkered-flag sweep,
 * then fades out to reveal the app.
 */
export default function SplashScreen() {
  // Starts false on both server and client render so hydration matches;
  // an effect flips it on right after mount, client-side only.
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let alreadyShown = false;
    try {
      alreadyShown = sessionStorage.getItem("sparks-splash-shown") === "1";
    } catch {
      // sessionStorage unavailable (private mode) - just show it once per load
    }
    if (alreadyShown) return;

    const showTimer = setTimeout(() => setVisible(true), 0);
    const leaveTimer = setTimeout(() => setLeaving(true), 1600);
    const hideTimer = setTimeout(() => {
      setVisible(false);
      try {
        sessionStorage.setItem("sparks-splash-shown", "1");
      } catch {
        // ignore
      }
    }, 2100);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(leaveTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black transition-opacity duration-500 ${
        leaving ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div className="splash-flag-sweep absolute inset-0" />
      <div className="relative flex flex-col items-center">
        <div className="splash-logo-pop relative aspect-[1200/415] w-72 overflow-hidden rounded-lg shadow-[0_0_60px_rgba(255,120,0,0.35)] sm:w-96">
          <Image
            src="/sparks-logo.png"
            alt="Sparks Racing and Garage"
            fill
            sizes="384px"
            priority
            className="object-contain"
          />
        </div>
        <p className="splash-tagline mt-5 text-sm font-semibold tracking-[0.3em] text-orange-400 uppercase">
          Starting engines…
        </p>
      </div>

      <style>{`
        @keyframes splashPop {
          0% { transform: scale(0.6) rotate(-6deg); opacity: 0; }
          60% { transform: scale(1.08) rotate(1deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes flagSweep {
          0% { background-position: 200% 0; }
          100% { background-position: -20% 0; }
        }
        @keyframes taglineFade {
          0% { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .splash-logo-pop {
          animation: splashPop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        .splash-tagline {
          animation: taglineFade 0.5s ease-out 0.5s both;
        }
        .splash-flag-sweep {
          opacity: 0.18;
          background-image: repeating-conic-gradient(#fff 0% 25%, #000 0% 50%);
          background-size: 40px 40px;
          background-position: 200% 0;
          animation: flagSweep 1.8s ease-in-out both;
        }
      `}</style>
    </div>
  );
}
