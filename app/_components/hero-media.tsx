"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeMotion(callback: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function getMotionSnapshot() {
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    ?.saveData;
  return !window.matchMedia(REDUCED_MOTION).matches && !saveData;
}

function useMotionAllowed() {
  return useSyncExternalStore(subscribeMotion, getMotionSnapshot, () => false);
}

/**
 * Hero background. The poster (children) is the video's first frame, so the
 * swap to the playing video is invisible. Portrait screens get a 3:4 cut that
 * follows the subject; the video only plays while the hero is on screen.
 */
export function HeroBackdrop({ children }: { children: ReactNode }) {
  const motionAllowed = useMotionAllowed();
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(true);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    if (inView) video.play().catch(() => {});
    else video.pause();
  }, [inView, motionAllowed]);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="hero-media absolute inset-0 overflow-hidden"
      data-video={videoReady || undefined}
    >
      <div className="hero-parallax absolute inset-0">
        <div className="hero-frame absolute inset-x-0 top-0">
          {children}
          {motionAllowed && (
            <video
              ref={videoRef}
              className="hero-video absolute inset-0 h-full w-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              disablePictureInPicture
              disableRemotePlayback
              onPlaying={() => setVideoReady(true)}
            >
              <source src="/videos/hero-portrait.mp4" type="video/mp4" media="(orientation: portrait)" />
              <source src="/videos/hero-landscape.webm" type="video/webm" />
              <source src="/videos/hero-landscape.mp4" type="video/mp4" />
            </video>
          )}
        </div>
      </div>
      <div className="grain absolute inset-0" />
    </div>
  );
}
