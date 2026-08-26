"use client";

/**
 * @fileoverview Default homepage hero: the recorded 3D tour as video,
 * plus an HTML credit card synced to `currentTime`.
 * @module components/sections/HeroVideoTour
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import type { CircuitNode } from "./circuit-node";
import { HeroCreditOverlay } from "./HeroCreditCard";
import {
  creditCueAtTourMs,
  creditHoldCues,
  tourDurationMs,
} from "@/utils/circuit-network-layout";
import { buildHeroCreditDrafts } from "@/utils/hero-tour-credits";
import {
  HERO_TOUR_POSTER,
  HERO_TOUR_RECORD_CAP,
  heroTourMsFromVideoTime,
  heroTourVideoSrc,
  readHeroCompactTour,
} from "@/utils/hero-tour";

const Stage = styled.div`
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  width: 100%;
  background: #02030a;
  overflow: hidden;
`;

const TourVideo = styled.video`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: #02030a;
`;

const Poster = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

export type HeroVideoTourProps = {
  cymasphere?: CircuitNode | null;
  cymasynth?: CircuitNode | null;
  nodes: CircuitNode[];
  /** Recording cap (`?tourCap=N`); defaults to the checked-in reel. */
  tourCap?: number;
};

/**
 * @brief Recorded tour player with live catalog credits.
 * @param cymasphere Sun product.
 * @param cymasynth Closest moon.
 * @param nodes Remaining catalog products.
 * @param tourCap Optional cue-list cap matching the MP4.
 * @returns Full-bleed video (or poster) plus the credit overlay.
 */
const HeroVideoTour: React.FC<HeroVideoTourProps> = ({
  cymasphere,
  cymasynth,
  nodes,
  tourCap,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [compact, setCompact] = useState(false);
  const [stageReady, setStageReady] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [tourMs, setTourMs] = useState(0);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    setCompact(readHeroCompactTour(window));
    setStageReady(true);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(motion.matches);
    const onMotion = (event: MediaQueryListEvent) => {
      setReduceMotion(event.matches);
    };
    motion.addEventListener("change", onMotion);
    return () => motion.removeEventListener("change", onMotion);
  }, []);

  const cap = tourCap ?? HERO_TOUR_RECORD_CAP;
  const drafts = useMemo(
    () =>
      buildHeroCreditDrafts({
        cymasphere,
        cymasynth,
        nodes,
        compact,
        tourCap: cap,
      }),
    [cymasphere, cymasynth, nodes, compact, cap]
  );
  const cues = useMemo(() => creditHoldCues(drafts), [drafts]);
  const loopMs = useMemo(() => tourDurationMs(drafts), [drafts]);
  const src = heroTourVideoSrc(compact);

  useEffect(() => {
    if (reduceMotion) return;
    const video = videoRef.current;
    let raf = 0;
    let fallbackOrigin = 0;

    const sampleVideo = () => {
      if (!video || video.paused || video.ended) return;
      setTourMs(heroTourMsFromVideoTime(video.currentTime));
      raf = window.requestAnimationFrame(sampleVideo);
    };

    const sampleClock = (now: number) => {
      if (!fallbackOrigin) fallbackOrigin = now;
      setTourMs((now - fallbackOrigin) % Math.max(1, loopMs));
      raf = window.requestAnimationFrame(sampleClock);
    };

    if (video && !videoFailed) {
      const onPlay = () => {
        window.cancelAnimationFrame(raf);
        raf = window.requestAnimationFrame(sampleVideo);
      };
      video.addEventListener("play", onPlay);
      if (!video.paused) onPlay();
      return () => {
        video.removeEventListener("play", onPlay);
        window.cancelAnimationFrame(raf);
      };
    }

    raf = window.requestAnimationFrame(sampleClock);
    return () => window.cancelAnimationFrame(raf);
  }, [reduceMotion, videoFailed, src, loopMs]);

  const cue = reduceMotion ? null : creditCueAtTourMs(cues, tourMs);
  const credit = cue
    ? (drafts.find((draft) => draft.key === cue.key) ?? null)
    : null;
  const holdMs = cue ? cue.endMs - cue.startMs : 0;
  const local = cue ? tourMs - cue.startMs : 0;
  const opacity = !cue
    ? 0
    : Math.max(0, Math.min(1, local / 320, (holdMs - local) / 320));

  return (
    <Stage data-hero-video="">
      {reduceMotion || videoFailed || !stageReady ? (
        <Poster src={HERO_TOUR_POSTER} alt="" />
      ) : (
        <TourVideo
          ref={videoRef}
          key={src}
          src={src}
          poster={HERO_TOUR_POSTER}
          muted
          playsInline
          autoPlay
          loop
          preload="metadata"
          onError={() => setVideoFailed(true)}
        />
      )}
      <HeroCreditOverlay credit={credit} opacity={opacity} />
    </Stage>
  );
};

export default HeroVideoTour;
