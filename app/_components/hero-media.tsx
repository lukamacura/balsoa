"use client";

import {
  createContext,
  use,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

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

type HeroMediaState = {
  paused: boolean;
  togglePaused: () => void;
  videoReady: boolean;
  markVideoReady: () => void;
};

const HeroMediaContext = createContext<HeroMediaState | null>(null);

function useHeroMedia() {
  const value = use(HeroMediaContext);
  if (!value) throw new Error("useHeroMedia must be used inside <HeroMediaProvider>");
  return value;
}

export function HeroMediaProvider({ children }: { children: ReactNode }) {
  const [paused, setPaused] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  return (
    <HeroMediaContext
      value={{
        paused,
        togglePaused: () => setPaused((value) => !value),
        videoReady,
        markVideoReady: () => setVideoReady(true),
      }}
    >
      {children}
    </HeroMediaContext>
  );
}

/**
 * Hero background. The poster (children) is the video's first frame, so the
 * swap to the playing video is invisible. Portrait screens get a 3:4 cut that
 * follows the subject; the video only plays while the hero is on screen.
 */
export function HeroBackdrop({ children }: { children: ReactNode }) {
  const { paused, videoReady, markVideoReady } = useHeroMedia();
  const motionAllowed = useMotionAllowed();
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(true);

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
    if (paused || !inView) video.pause();
    else video.play().catch(() => {});
  }, [paused, inView, motionAllowed]);

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
              onPlaying={markVideoReady}
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

export function MotionToggle() {
  const { paused, togglePaused } = useHeroMedia();
  const motionAllowed = useMotionAllowed();
  if (!motionAllowed) return null;

  return (
    <button
      type="button"
      onClick={togglePaused}
      className="fade-up label-mono group flex h-10 items-center gap-3 self-start rounded-full border border-white/15 bg-ink/40 pl-3 pr-4 text-white/70 backdrop-blur-md transition-colors hover:border-white/40 hover:text-white lg:self-auto"
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10">
        {paused ? (
          <svg viewBox="0 0 10 10" className="ml-px h-2 w-2" aria-hidden="true">
            <path d="M2 1l7 4-7 4z" fill="currentColor" />
          </svg>
        ) : (
          <svg viewBox="0 0 10 10" className="h-2 w-2" aria-hidden="true">
            <path d="M2 1h2v8H2zM6 1h2v8H6z" fill="currentColor" />
          </svg>
        )}
      </span>
      {paused ? "Play video" : "Pause video"}
    </button>
  );
}
