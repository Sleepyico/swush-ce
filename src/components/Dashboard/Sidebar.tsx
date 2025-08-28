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

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { Sidebar, SidebarBody, SidebarLink } from "../ui/sidebar";
import { cn } from "@/lib/utils";
import { Logo } from "../Common/Logo";
import {
  IconFolder,
  IconInfoSquareRounded,
  IconLayoutDashboardFilled,
  IconLinkPlus,
  IconLogout,
  IconSettings2,
  IconShieldLock,
  IconTags,
  IconUser,
  IconMailSpark,
  IconPalette,
  IconListSearch,
} from "@tabler/icons-react";
import { useTheme } from "next-themes";
import { useUser } from "@/hooks/use-user";
import { useColorScheme } from "@/hooks/use-scheme";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "../ui/label";

export function SidebarWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { user } = useUser();
  const { scheme, setScheme, SCHEMES } = useColorScheme();

  const [schemeDialogOpen, setSchemeDialogOpen] = useState(false);
  const [pendingScheme, setPendingScheme] = useState(scheme);
  const [pendingMode, setPendingMode] = useState<string>(theme || "system");

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.refresh();
  };

  const mainUpperLinks = [
    {
      label: "Search",
      href: "",
      icon: <IconListSearch className="h-5 w-5 shrink-0" />,
      onClick: () =>
        window.dispatchEvent(
          new KeyboardEvent("keydown", { key: "k", metaKey: true })
        ),
    },
    {
      label: "Vault",
      href: "/vault",
      icon: <IconLayoutDashboardFilled className="h-5 w-5 shrink-0" />,
    },
    {
      label: "Folders",
      href: "/folders",
      icon: <IconFolder className="h-5 w-5 shrink-0" />,
    },
    {
      label: "Tags",
      href: "/tags",
      icon: <IconTags className="h-5 w-5 shrink-0" />,
    },
    {
      label: "Shorten",
      href: "/shortener",
      icon: <IconLinkPlus className="h-5 w-5 shrink-0" />,
    },
    {
      label: "Settings",
      href: "/settings",
      icon: <IconSettings2 className="h-5 w-5 shrink-0" />,
    },
  ];

  const adminLinks = [
    {
      label: "Server Settings",
      href: "/admin/settings",
      icon: <IconShieldLock className="h-5 w-5 shrink-0" />,
    },
    {
      label: "Invite Links",
      href: "/admin/invites",
      icon: <IconMailSpark className="h-5 w-5 shrink-0" />,
    },
    {
      label: "Manage Users",
      href: "/admin/users",
      icon: <IconUser className="h-5 w-5 shrink-0" />,
    },
  ];

  const lowerLinks = [
    {
      label: "Info",
      href: "/about",
      icon: <IconInfoSquareRounded className="h-5 w-5 shrink-0" />,
    },
    {
      label: "Theme",
      icon: <IconPalette className="h-5 w-5 shrink-0" />,
      onClick: () => {
        setSchemeDialogOpen(true);
      },
    },
    {
      label: "Logout",
      icon: <IconLogout className="h-5 w-5 shrink-0 ml-0.5" />,
      onClick: handleLogout,
    },
  ];

  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-full flex-1 flex-col bg-secondary border-0 md:border border-border md:flex-row",
        "h-[100svh] overflow-hidden"
      )}
    >
      <Sidebar open={open} setOpen={setOpen} animate={true}>
        <SidebarBody className="group justify-between bg-secondary max-w-64 md:max-w-52 z-40">
          <div className="flex flex-col space-y-4 overflow-x-hidden">
            <Logo />
            <div className="flex flex-col">
              <div className="flex flex-col gap-2 overflow-y-auto">
                {mainUpperLinks.map((link, idx) => {
                  const isActive = pathname === link.href;
                  return (
                    <SidebarLink
                      key={idx}
                      link={link}
                      className={cn(
                        isActive
                          ? "bg-primary text-primary-foreground rounded-md px-1"
                          : "hover:bg-muted ml-1 text-muted-foreground",
                        link.label === "Search" &&
                          "bg-card rounded-md ml-0 px-1"
                      )}
                      onClick={() => {
                        if (link.onClick) link.onClick();
                      }}
                    />
                  );
                })}
                {(user?.role === "admin" || user?.role === "owner") && (
                  <>
                    <div className="border-t border-border" />
                    {adminLinks.map((link, idx) => {
                      const isActive = pathname === link.href;
                      return (
                        <SidebarLink
                          key={idx}
                          link={link}
                          className={cn(
                            isActive
                              ? "bg-primary text-primary-foreground rounded-md px-1"
                              : "hover:bg-muted ml-1 text-muted-foreground"
                          )}
                        />
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 border-t">
            {lowerLinks.map((link, idx) => {
              const isActive = pathname === link.href;
              return (
                <SidebarLink
                  key={idx}
                  link={{
                    label: link.label,
                    href: link.href as string | undefined,
                    icon: link.icon,
                  }}
                  onClick={(evt) => {
                    if (!link.href && link.onClick) {
                      evt?.preventDefault?.();
                      link.onClick();
                    }
                  }}
                  className={cn(
                    isActive
                      ? "bg-primary text-primary-foreground rounded-md px-1"
                      : "hover:bg-muted ml-1 text-muted-foreground"
                  )}
                />
              );
            })}
          </div>
        </SidebarBody>
      </Sidebar>

      <Dialog open={schemeDialogOpen} onOpenChange={setSchemeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Appearance</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Color scheme
              </Label>
              <Select
                value={pendingScheme}
                onValueChange={(v: string) => {
                  const next = v as (typeof SCHEMES)[number];
                  setPendingScheme(next);
                  setScheme(next);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a scheme" />
                </SelectTrigger>
                <SelectContent>
                  {SCHEMES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Appearance
              </Label>
              <Select
                value={pendingMode}
                onValueChange={(v) => {
                  setPendingMode(v);
                  setTheme(v);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="System / Light / Dark" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <p className="text-xs text-muted-foreground">
              Schemes change the app colors; appearance controls light/dark.
              Both are saved.
            </p>
          </div>
        </DialogContent>
      </Dialog>
      {children}
    </div>
  );
}
