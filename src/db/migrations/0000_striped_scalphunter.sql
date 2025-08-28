CREATE TYPE "public"."user_role" AS ENUM('owner', 'admin', 'user');--> statement-breakpoint
CREATE TABLE "api_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"expires_at" timestamp,
	"is_revoked" boolean DEFAULT false,
	CONSTRAINT "api_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"folder_id" uuid,
	"original_name" text NOT NULL,
	"stored_name" text NOT NULL,
	"slug" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"description" text,
	"password" text,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"is_public" boolean DEFAULT false,
	"views" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "files_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "files_to_tags" (
	"file_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "files_to_tags_file_id_tag_id_pk" PRIMARY KEY("file_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "folders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "invite_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"note" text,
	"expires_at" timestamp with time zone NOT NULL,
	"max_uses" integer,
	"uses_count" integer DEFAULT 0 NOT NULL,
	"is_disabled" boolean DEFAULT false NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invite_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" varchar(255) PRIMARY KEY NOT NULL,
	"hits" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "server_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"max_upload_mb" integer DEFAULT 1024 NOT NULL,
	"max_files_per_upload" integer DEFAULT 25 NOT NULL,
	"allow_public_registration" boolean DEFAULT true NOT NULL,
	"password_policy_min_length" integer DEFAULT 10 NOT NULL,
	"preserved_usernames" text[] DEFAULT '{"root","system","moderator","mod","administrator","staff","security","help","contact","about","terms","privacy","api","dev","developer","test","testing","guest","superuser","webmaster","bot","null","undefined","anonymous","user","username","email","password","login","register","signup","signin","dashboard","settings","profile","account","helpdesk","service","services","sysadmin"}',
	"user_max_storage_mb" integer DEFAULT 5120 NOT NULL,
	"admin_max_storage_mb" integer DEFAULT 10240 NOT NULL,
	"user_daily_quota_mb" integer DEFAULT 1024 NOT NULL,
	"admin_daily_quota_mb" integer DEFAULT 2048 NOT NULL,
	"short_links_limit_user" integer DEFAULT 50 NOT NULL,
	"short_links_limit_admin" integer DEFAULT 100 NOT NULL,
	"files_limit_user" integer DEFAULT 250 NOT NULL,
	"files_limit_admin" integer DEFAULT 500 NOT NULL,
	"allowed_mime_prefixes" text[],
	"disallowed_extensions" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "short_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"original_url" text NOT NULL,
	"slug" text NOT NULL,
	"is_public" boolean DEFAULT false,
	"is_favorite" boolean DEFAULT false,
	"description" text,
	"password" text,
	"max_clicks" integer,
	"click_count" integer DEFAULT 0,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "short_links_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"username" text,
	"display_name" text,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"hashed_password" text NOT NULL,
	"reset_token" text,
	"reset_token_expiry" timestamp with time zone,
	"max_storage_mb" integer,
	"max_upload_mb" integer,
	"files_limit" integer,
	"short_links_limit" integer,
	"totp_secret" text,
	"is_two_factor_enabled" boolean DEFAULT false,
	"is_locked" boolean DEFAULT false NOT NULL,
	"lock_reason" text,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_folder_id_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files_to_tags" ADD CONSTRAINT "files_to_tags_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files_to_tags" ADD CONSTRAINT "files_to_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_tokens" ADD CONSTRAINT "invite_tokens_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "short_links" ADD CONSTRAINT "short_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "files_user_id_idx" ON "files" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "files_folder_id_idx" ON "files" USING btree ("folder_id");--> statement-breakpoint
CREATE INDEX "files_created_at_idx" ON "files" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "files_to_tags_file_id_idx" ON "files_to_tags" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "files_to_tags_tag_id_idx" ON "files_to_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "folders_user_id_idx" ON "folders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "short_links_user_id_idx" ON "short_links" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "short_links_created_at_idx" ON "short_links" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "short_links_expires_at_idx" ON "short_links" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "tags_user_name_idx" ON "tags" USING btree ("user_id","name");