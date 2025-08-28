/*
 *   Copyright (c) 2025 Laith Alkhaddam aka Iconical or Sleepyico.
 *   All rights reserved.

 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at

 *   http://www.apache.org/licenses/LICENSE-2.0

 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import WaveSurfer from "wavesurfer.js";
import { Button } from "../ui/button";
import {
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerStop,
  IconVolume2,
  IconVolumeOff,
  IconRepeat,
} from "@tabler/icons-react";
import { Slider } from "../ui/slider";

export function AudioWaveform({
  src,
  isPublic,
  autoPlay,
  initialLoop,
  onEnded,
  externalControlsRef,
  onPlayStateChange,
  onTime,
  onAudioEl,
}: {
  src: string;
  isPublic: boolean;
  autoPlay?: boolean;
  initialLoop?: boolean;
  onEnded?: () => void;
  externalControlsRef?: RefObject<{
    play: () => void;
    pause: () => void;
    toggle: () => void;
    isPlaying: () => boolean;
    getCurrentTime: () => number;
    getDuration: () => number;
    seekTo: (fraction: number) => void;
  } | null>;
  onPlayStateChange?: (playing: boolean) => void;
  onTime?: (currentTime: number, duration: number) => void;
  onAudioEl?: (el: HTMLAudioElement | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [loop, setLoop] = useState(initialLoop ?? false);

  useEffect(() => {
    if (!containerRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#888",
      progressColor: isPublic ? "#008236" : "#FFD230 ",
      cursorColor: "#fff",
      barWidth: 2,
      barRadius: 2,
      height:
        typeof window !== "undefined" &&
        window.matchMedia("(max-width: 640px)").matches
          ? 48
          : 64,
      normalize: true,
    });

    const notifyAudioEl = () => {
      try {
        const media = (ws.getMediaElement &&
          ws.getMediaElement()) as HTMLAudioElement | null;
        if (onAudioEl) onAudioEl(media ?? null);
      } catch {
        if (onAudioEl) onAudioEl(null);
      }
    };

    ws.on("ready", () => {
      setIsReady(true);
      ws.setVolume(volume);
      if (autoPlay) {
        ws.play();
      }
      emitTime();
      notifyAudioEl();
    });
    const emitTime = () => {
      const d = ws.getDuration?.() ?? 0;
      const c = ws.getCurrentTime ? ws.getCurrentTime() : 0;
      onTime?.(c, d);
    };
    ws.on("audioprocess", emitTime);
    ws.on("interaction", emitTime);
    ws.on("play", () => {
      setIsPlaying(true);
      onPlayStateChange?.(true);
    });
    ws.on("pause", () => {
      setIsPlaying(false);
      onPlayStateChange?.(false);
    });
    ws.on("finish", () => {
      setIsPlaying(false);
      onPlayStateChange?.(false);
      if (onEnded) onEnded();
    });

    ws.load(src);
    notifyAudioEl();
    waveSurferRef.current = ws;

    return () => {
      if (externalControlsRef) externalControlsRef.current = null;
      ws.un("audioprocess", emitTime);
      ws.un("interaction", emitTime);
      if (onAudioEl) onAudioEl(null);
      ws.destroy();
      waveSurferRef.current = null;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, isPublic]);

  useEffect(() => {
    if (!externalControlsRef) return;
    const ws = waveSurferRef.current;
    if (!ws) {
      externalControlsRef.current = null;
      return;
    }
    externalControlsRef.current = {
      play: () => ws.play(),
      pause: () => ws.pause(),
      toggle: () => (ws.isPlaying() ? ws.pause() : ws.play()),
      isPlaying: () => ws.isPlaying(),
      getCurrentTime: () => waveSurferRef.current?.getCurrentTime?.() ?? 0,
      getDuration: () => waveSurferRef.current?.getDuration?.() ?? 0,
      seekTo: (fraction: number) =>
        waveSurferRef.current?.seekTo?.(Math.min(1, Math.max(0, fraction))),
    };
    return () => {
      if (externalControlsRef) externalControlsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalControlsRef, waveSurferRef.current]);

  const togglePlay = () => waveSurferRef.current?.playPause();

  const stop = () => {
    const ws = waveSurferRef.current;
    if (!ws) return;
    ws.stop();
    setIsPlaying(false);
  };

  const toggleMute = () => {
    const ws = waveSurferRef.current;
    if (!ws) return;
    const next = !muted;
    setMuted(next);
    ws.setMuted(next);
  };

  const toggleLoop = () => {
    const ws = waveSurferRef.current;
    if (!ws) return;
    const next = !loop;
    setLoop(next);
    const media = ws.getMediaElement && ws.getMediaElement();
    if (media) {
      media.loop = next;
    }
  };

  const changeVolume = (vals: number[]) => {
    const v = Math.min(1, Math.max(0, vals[0] ?? 0));
    setVolume(v);
    waveSurferRef.current?.setVolume(v);
    if (muted && v > 0) {
      setMuted(false);
      waveSurferRef.current?.setMuted(false);
    }
  };

  return (
    <div className="w-full">
      <div
        ref={containerRef}
        className="w-full rounded-md border border-zinc-700 bg-zinc-900/40"
      />
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="default"
            onClick={togglePlay}
            disabled={!isReady}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <IconPlayerPause className="h-4 w-4" />
            ) : (
              <IconPlayerPlay className="h-4 w-4" />
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={stop}
            disabled={!isReady}
            aria-label="Stop"
          >
            <IconPlayerStop className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={toggleMute}
            disabled={!isReady}
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? (
              <IconVolumeOff className="h-4 w-4" />
            ) : (
              <IconVolume2 className="h-4 w-4" />
            )}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={toggleLoop}
            disabled={!isReady}
            aria-label={loop ? "Disable Loop" : "Enable Loop"}
          >
            <IconRepeat
              className={loop ? "h-4 w-4 text-green-500" : "h-4 w-4"}
            />
          </Button>
        </div>

        <div className="flex items-center gap-2 sm:min-w-[220px]">
          <span className="text-xs text-muted-foreground w-12">Volume</span>
          <Slider
            value={[muted ? 0 : volume]}
            max={1}
            step={0.01}
            onValueChange={changeVolume}
            className="flex-1"
            aria-label="Volume"
          />
          <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
            {Math.round((muted ? 0 : volume) * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}
