"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- The missing-configuration fallback must work without client routing. */
import { useState, type ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
export function AppProvider({children}:{children:ReactNode}) {
  const [client] = useState(() => {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url || !/^https?:\/\//.test(url)) return null;
    return new ConvexReactClient(url);
  });
  if (!client) return <main className="setup-state"><h1>Life Maxim is getting ready.</h1><p>The workspace connection is being configured. Please check back shortly.</p><a href="/">Back to homepage</a></main>;
  return <ConvexAuthProvider client={client} storageNamespace="life-maxim-auth-original">{children}</ConvexAuthProvider>;
}
