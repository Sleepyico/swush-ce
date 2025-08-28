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

import type { Upload } from "@/types";

export type PlayerControls = {
  play: () => void;
  pause: () => void;
  toggle: () => void;
  isPlaying: () => boolean;
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (fraction: number) => void;
};

export type MiniPlayerProps = {
  availableFolders: string[];
  selectedFolder: string | null;
  setSelectedFolder: (v: string | null) => void;
  playerOpen: boolean;
  setPlayerOpen: (v: boolean) => void;
  playerCollapsed: boolean;
  setPlayerCollapsed: (v: boolean) => void;
  playerFullscreen: boolean;
  setPlayerFullscreen: (v: boolean) => void;

  queue: Upload[];
  index: number;
  setIndex: (i: number) => void;
  playNext: () => void;
  playPrev: () => void;

  controlsRef: React.MutableRefObject<PlayerControls | null>;
  isPlaying: boolean;
  setIsPlaying: (v: boolean) => void;
  progressTime: number;
  progressDur: number;
  setProgressTime: (v: number) => void;
  setProgressDur: (v: number) => void;

  loadFolderIntoPlayer: (folder: string | null) => void;
};

export type FullscreenPlayerProps = {
  current: Upload;
  selectedFolder: string | null;
  playNext: () => void;
  playPrev: () => void;
  controlsRef: React.MutableRefObject<PlayerControls | null>;
  isPlaying: boolean;
  setIsPlaying: (v: boolean) => void;
  progressTime: number;
  progressDur: number;
  setProgressTime: (v: number) => void;
  setProgressDur: (v: number) => void;

  onClose: () => void;
};
