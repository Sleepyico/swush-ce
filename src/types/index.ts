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

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: "owner" | "admin" | "user";
}

export interface Upload {
  id: string;
  userId: string;
  originalName: string;
  customName: string;
  description: string | null;
  isFavorite: boolean;
  mimeType: string;
  size: number;
  slug: string;
  isPublic: boolean;
  createdAt: Date;
}

export interface UploadWrapper {
  file: File;
  customName: string;
  description: string;
  isPublic: boolean;
}

export type FolderMeta = { id: string; name: string };
export type TagMeta = { id: string; name: string };
