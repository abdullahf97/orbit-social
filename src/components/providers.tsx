"use client";

import { useEffect, useState, type ReactNode } from "react";
import { QueryClient, onlineManager } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { openDB, type IDBPDatabase } from "idb";
import { Toaster } from "sonner";
import { HttpError } from "@/lib/api-error";
import { registerMutationDefaults } from "@/features/api/mutations";

const DB_NAME = "orbit";
const STORE = "kv";
const CACHE_KEY = "orbit-query-cache";

/**
 * TanStack's onlineManager assumes it is online until it observes an
 * `online`/`offline` event. A cold reload while already offline never fires
 * one, which would leave the banner hidden and pause nothing, so seed it from
 * the browser as soon as this client module loads.
 */
if (typeof window !== "undefined") {
  onlineManager.setOnline(navigator.onLine);
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(STORE)) {
          database.createObjectStore(STORE);
        }
      },
    });
  }
  return dbPromise;
}

const storage = {
  getItem: async (key: string) => {
    const db = await getDb();
    return (await db.get(STORE, key)) ?? null;
  },
  setItem: async (key: string, value: string) => {
    const db = await getDb();
    await db.put(STORE, value, key);
  },
  removeItem: async (key: string) => {
    const db = await getDb();
    await db.delete(STORE, key);
  },
};

function makeQueryClient() {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 1000 * 60 * 60 * 24 * 7,
        refetchOnWindowFocus: false,
        networkMode: "offlineFirst",
        retry: (failureCount, error) => {
          if (error instanceof HttpError && error.status < 500) return false;
          return failureCount < 2;
        },
      },
      mutations: {
        networkMode: "online",
        retry: 0,
      },
    },
  });

  registerMutationDefaults(client);
  return client;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(makeQueryClient);
  const [persister] = useState(() =>
    createAsyncStoragePersister({
      storage,
      key: CACHE_KEY,
      throttleTime: 1200,
    }),
  );

  useEffect(() => {
    if (
      process.env.NODE_ENV === "production" &&
      "serviceWorker" in navigator
    ) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Offline shell is a progressive enhancement; ignore failures.
      });
    }
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24 * 7,
        buster: "orbit-v1",
        dehydrateOptions: {
          shouldDehydrateQuery: (query) =>
            query.state.status === "success" &&
            query.queryKey[0] !== "session",
        },
      }}
    >
      {children}
      <Toaster
        position="bottom-center"
        theme="system"
        toastOptions={{
          style: {
            background: "var(--surface-2)",
            color: "var(--text)",
            border: "1px solid var(--line)",
          },
        }}
      />
    </PersistQueryClientProvider>
  );
}
