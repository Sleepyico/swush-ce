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

import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  serial,
  primaryKey,
  index,
  pgEnum,
  varchar,
  json,
} from "drizzle-orm/pg-core";
import { InferInsertModel, InferSelectModel, relations } from "drizzle-orm";

export const userRole = pgEnum("user_role", ["owner", "admin", "user"]);

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").unique().notNull(),
  username: text("username").unique(),
  displayName: text("display_name"),
  role: userRole("role").notNull().default("user"),

  hashedPassword: text("hashed_password").notNull(),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry", { withTimezone: true }),

  maxStorageMb: integer("max_storage_mb"),
  maxUploadMb: integer("max_upload_mb"),
  filesLimit: integer("files_limit"),
  shortLinksLimit: integer("short_links_limit"),

  totpSecret: text("totp_secret"),
  isTwoFactorEnabled: boolean("is_two_factor_enabled").default(false),

  isLocked: boolean("is_locked").default(false).notNull(),
  lockReason: text("lock_reason"),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sessionTable = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
  },
  (self) => [index("sessions_user_id_idx").on(self.userId)]
);

export const files = pgTable(
  "files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    folderId: uuid("folder_id").references(() => folders.id, {
      onDelete: "set null",
    }),

    originalName: text("original_name").notNull(),
    storedName: text("stored_name").notNull(),
    slug: text("slug").unique().notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),

    description: text("description"),
    password: text("password"),
    isFavorite: boolean("is_favorite").default(false).notNull(),

    isPublic: boolean("is_public").default(false),
    views: integer("views").default(0),

    createdAt: timestamp("created_at").defaultNow(),
  },
  (self) => [
    index("files_user_id_idx").on(self.userId),
    index("files_folder_id_idx").on(self.folderId),
    index("files_created_at_idx").on(self.createdAt),
  ]
);

export const folders = pgTable(
  "folders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (self) => [index("folders_user_id_idx").on(self.userId)]
);

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (self) => [index("tags_user_name_idx").on(self.userId, self.name)]
);

export const filesToTags = pgTable(
  "files_to_tags",
  {
    fileId: uuid("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (self) => [
    primaryKey({ columns: [self.fileId, self.tagId] }),
    index("files_to_tags_file_id_idx").on(self.fileId),
    index("files_to_tags_tag_id_idx").on(self.tagId),
  ]
);

export const serverSettings = pgTable("server_settings", {
  id: serial("id").primaryKey(),

  maxUploadMb: integer("max_upload_mb").notNull().default(1024),
  maxFilesPerUpload: integer("max_files_per_upload").notNull().default(25),
  allowPublicRegistration: boolean("allow_public_registration")
    .notNull()
    .default(true),
  passwordPolicyMinLength: integer("password_policy_min_length")
    .notNull()
    .default(10),
  preservedUsernames: text("preserved_usernames")
    .array()
    .default(process.env.PRESERVED_USERNAMES?.split(",") || []),

  userMaxStorageMb: integer("user_max_storage_mb").notNull().default(5120),
  adminMaxStorageMb: integer("admin_max_storage_mb").notNull().default(10240),
  userDailyQuotaMb: integer("user_daily_quota_mb").notNull().default(1024),
  adminDailyQuotaMb: integer("admin_daily_quota_mb").notNull().default(2048),
  shortLinksLimitUser: integer("short_links_limit_user").notNull().default(50),
  shortLinksLimitAdmin: integer("short_links_limit_admin")
    .notNull()
    .default(100),
  filesLimitUser: integer("files_limit_user").notNull().default(250),
  filesLimitAdmin: integer("files_limit_admin").notNull().default(500),

  allowedMimePrefixes: text("allowed_mime_prefixes").array(),
  disallowedExtensions: text("disallowed_extensions").array(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const shortLinks = pgTable(
  "short_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").references(() => users.id),
    originalUrl: text("original_url").notNull(),
    slug: text("slug").unique().notNull(),
    isPublic: boolean("is_public").default(false),
    isFavorite: boolean("is_favorite").default(false),

    description: text("description"),
    password: text("password"),
    maxClicks: integer("max_clicks"),
    clickCount: integer("click_count").default(0),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (self) => [
    index("short_links_user_id_idx").on(self.userId),
    index("short_links_created_at_idx").on(self.createdAt),
    index("short_links_expires_at_idx").on(self.expiresAt),
  ]
);

export const rateLimits = pgTable("rate_limits", {
  key: varchar("key", { length: 255 }).notNull().primaryKey(),
  hits: integer("hits").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const apiTokens = pgTable("api_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  token: text("token").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  isRevoked: boolean("is_revoked").default(false),
});

export const inviteTokens = pgTable("invite_tokens", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  note: text("note"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  maxUses: integer("max_uses"),
  usesCount: integer("uses_count").notNull().default(0),
  isDisabled: boolean("is_disabled").notNull().default(false),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  files: many(files),
  folders: many(folders),
  shortLinks: many(shortLinks),
  sessions: many(sessionTable),
  tags: many(tags),
}));

export const filesRelations = relations(files, ({ one, many }) => ({
  owner: one(users, { fields: [files.userId], references: [users.id] }),
  folder: one(folders, { fields: [files.folderId], references: [folders.id] }),
  tags: many(filesToTags),
}));

export const foldersRelations = relations(folders, ({ many, one }) => ({
  files: many(files),
  owner: one(users, { fields: [folders.userId], references: [users.id] }),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  files: many(filesToTags),
}));

export const filesToTagsRelations = relations(filesToTags, ({ one }) => ({
  file: one(files, { fields: [filesToTags.fileId], references: [files.id] }),
  tag: one(tags, { fields: [filesToTags.tagId], references: [tags.id] }),
}));

export const sessionRelations = relations(sessionTable, ({ one }) => ({
  user: one(users, { fields: [sessionTable.userId], references: [users.id] }),
}));

export const shortLinksRelations = relations(shortLinks, ({ one }) => ({
  owner: one(users, { fields: [shortLinks.userId], references: [users.id] }),
}));

export type DBUser = InferSelectModel<typeof users>;
export type NewDBUser = InferInsertModel<typeof users>;

export type DBSession = InferSelectModel<typeof sessionTable>;
export type NewDBSession = InferInsertModel<typeof sessionTable>;

export type DBFile = InferSelectModel<typeof files>;
export type NewDBFile = InferInsertModel<typeof files>;

export type DBFolder = InferSelectModel<typeof folders>;
export type NewDBFolder = InferInsertModel<typeof folders>;

export type DBTag = InferSelectModel<typeof tags>;
export type NewDBTag = InferInsertModel<typeof tags>;

export type DBFileToTag = InferSelectModel<typeof filesToTags>;
export type NewDBFileToTag = InferInsertModel<typeof filesToTags>;

export type DBServerSettings = InferSelectModel<typeof serverSettings>;
export type NewDBServerSettings = InferInsertModel<typeof serverSettings>;

export type DBShortLink = InferSelectModel<typeof shortLinks>;
export type NewDBShortLink = InferInsertModel<typeof shortLinks>;

export type DBRateLimit = InferSelectModel<typeof rateLimits>;
export type NewDBRateLimit = InferInsertModel<typeof rateLimits>;

export type DBApiToken = InferSelectModel<typeof apiTokens>;
export type NewDBApiToken = InferInsertModel<typeof apiTokens>;

export type DBInviteToken = InferSelectModel<typeof inviteTokens>;
export type NewDBInviteToken = InferInsertModel<typeof inviteTokens>;
