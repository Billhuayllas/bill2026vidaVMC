import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';

// The Supabase script is loaded in index.html or through imported SDK
declare global {
  interface Window {
    supabase?: {
      createClient: (url: string, key: string) => SupabaseClient;
    };
  }
}

const SUPABASE_URL = 'https://iosdslhikguqyhspbpbn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlvc2RzbGhpa2d1cXloc3BicGJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwOTMzNjMsImV4cCI6MjA2ODY2OTM2M30.HbgX9g1e4kYZf1jn0-8RR8BctYZctVopigZgZVXBaJY';

let supabaseInstance: SupabaseClient;

try {
    if (typeof window !== 'undefined' && window.supabase?.createClient) {
        supabaseInstance = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
        supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
} catch (err) {
    console.error("Failed to initialize Supabase client:", err);
    // Provide a mock client to prevent runtime errors in components
    const mock = {
        from: () => mock,
        select: async () => ({ data: [], error: { message: 'Supabase not initialized' } }),
        insert: async () => ({ data: [], error: { message: 'Supabase not initialized' } }),
        update: async () => ({ data: [], error: { message: 'Supabase not initialized' } }),
        delete: async () => ({ data: [], error: { message: 'Supabase not initialized' } }),
        upsert: async () => ({ data: [], error: { message: 'Supabase not initialized' } }),
        order: () => mock,
        eq: () => mock,
    };
    supabaseInstance = mock as any;
}

// Global db operational status tracking state
let activeWrites = 0;
let activeReads = 0;
let lastWriteError: any = null;
let errorTimeout: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
    listeners.forEach(l => {
        try {
            l();
        } catch (e) {
            console.error('Error in status listener:', e);
        }
    });
}

export function subscribeToDBStatus(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function getDBStatus() {
    return {
        activeWrites,
        activeReads,
        lastWriteError,
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true
    };
}

function dispatchDBEvent(event: { type: 'start' | 'end', isWrite: boolean, error?: any }) {
    if (event.type === 'start') {
        if (event.isWrite) {
            activeWrites++;
        } else {
            activeReads++;
        }
    } else {
        if (event.isWrite) {
            activeWrites = Math.max(0, activeWrites - 1);
            if (event.error) {
                lastWriteError = event.error;
                if (errorTimeout) clearTimeout(errorTimeout);
                errorTimeout = setTimeout(() => {
                    lastWriteError = null;
                    notifyListeners();
                }, 6000); // clear error message state after 6 seconds
            }
        } else {
            activeReads = Math.max(0, activeReads - 1);
        }
    }
    notifyListeners();
}

// Wrap Postgrest queries with Proxy to capture network transactions
function wrapThenable(obj: any, isWrite: boolean = false): any {
    if (!obj || typeof obj !== 'object') return obj;

    return new Proxy(obj, {
        get(target, prop, receiver) {
            const value = Reflect.get(target, prop, receiver);

            if (typeof value === 'function') {
                if (prop === 'then') {
                    // Intercept the final execution promise (.then or await)
                    return function(onfulfilled: any, onrejected: any) {
                        dispatchDBEvent({ type: 'start', isWrite });

                        return value.call(target, 
                            (res: any) => {
                                const hasError = res && (res.error || res.errors);
                                dispatchDBEvent({ type: 'end', isWrite, error: hasError ? (res.error || res.errors) : null });
                                if (onfulfilled) return onfulfilled(res);
                                return res;
                            },
                            (err: any) => {
                                dispatchDBEvent({ type: 'end', isWrite, error: err });
                                if (onrejected) return onrejected(err);
                                throw err;
                            }
                        );
                    };
                }

                // If one of the write operations is invoked, set isWrite flag to true
                let nextIsWrite = isWrite;
                const propStr = String(prop);
                if (propStr === 'insert' || propStr === 'update' || propStr === 'delete' || propStr === 'upsert') {
                    nextIsWrite = true;
                }

                return function(...args: any[]) {
                    try {
                        const result = value.apply(target, args);
                        return wrapThenable(result, nextIsWrite);
                    } catch (e) {
                        dispatchDBEvent({ type: 'end', isWrite: nextIsWrite, error: e });
                        throw e;
                    }
                };
            }

            return value;
        }
    });
}

// Custom React hook to get live database and network status
export function useDBStatus() {
    const [status, setStatus] = useState(() => getDBStatus());

    useEffect(() => {
        const handleStatusChange = () => {
            setStatus(getDBStatus());
        };

        window.addEventListener('online', handleStatusChange);
        window.addEventListener('offline', handleStatusChange);
        const unsubscribe = subscribeToDBStatus(handleStatusChange);

        return () => {
            window.removeEventListener('online', handleStatusChange);
            window.removeEventListener('offline', handleStatusChange);
            unsubscribe();
        };
    }, []);

    return status;
}

export const supabase = wrapThenable(supabaseInstance);