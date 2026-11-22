"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { deleteField, doc, onSnapshot, setDoc } from "firebase/firestore";
import { firebaseEnabled, getFirebase } from "./firebase";

export type UserList = { name: string; color: string; createdAt: number; items: Record<string, true> };
export type CustomMarker = { x: number; y: number; name: string; cat: string | null; createdAt: number };
export type UserData = {
  done: Record<string, true>;
  notes: Record<string, string>;
  lists: Record<string, UserList>;
  custom: Record<string, CustomMarker>;
};

const EMPTY: UserData = { done: {}, notes: {}, lists: {}, custom: {} };
const LOCAL_KEY = "leonida:userdata:v1";
const DEL = Symbol("delete");
type Op = { path: string[]; value: unknown | typeof DEL };

const LIST_COLORS = ["#f472b6", "#60a5fa", "#34d399", "#fbbf24", "#a78bfa", "#f87171", "#22d3ee", "#fb923c"];
const uid = (p: string) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function readLocal(): UserData {
  try {
    const v = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "null");
    return v ? { ...EMPTY, ...v } : EMPTY;
  } catch {
    return EMPTY;
  }
}
const isEmpty = (d: UserData) =>
  !Object.keys(d.done).length && !Object.keys(d.notes).length && !Object.keys(d.lists).length && !Object.keys(d.custom).length;

/** Immutable apply of path ops to plain data. */
function applyOps(data: UserData, ops: Op[]): UserData {
  const next = structuredClone(data) as Record<string, unknown>;
  for (const { path, value } of ops) {
    let node = next;
    for (const key of path.slice(0, -1)) {
      if (typeof node[key] !== "object" || node[key] === null) node[key] = {};
      node = node[key] as Record<string, unknown>;
    }
    const last = path[path.length - 1];
    if (value === DEL) delete node[last];
    else node[last] = value;
  }
  return next as UserData;
}

/** Turn ops into a nested object for setDoc(..., { merge: true }). */
function opsToMerge(ops: Op[]) {
  const out: Record<string, unknown> = {};
  for (const { path, value } of ops) {
    let node = out;
    for (const key of path.slice(0, -1)) {
      if (typeof node[key] !== "object" || node[key] === null) node[key] = {};
      node = node[key] as Record<string, unknown>;
    }
    node[path[path.length - 1]] = value === DEL ? deleteField() : value;
  }
  return out;
}

export type AuthState = { status: "loading" | "signed-out" | "signed-in" | "local"; user: User | null };

export function useUserData() {
  // client-only component (MapApp is loaded with ssr: false), so localStorage is available here
  const [data, setData] = useState<UserData>(readLocal);
  const [auth, setAuth] = useState<AuthState>({ status: firebaseEnabled ? "loading" : "local", user: null });
  const [syncError, setSyncError] = useState<string | null>(null);
  const dataRef = useRef(data);
  const userRef = useRef<User | null>(null);
  const replaceData = useCallback((d: UserData) => {
    dataRef.current = d;
    setData(d);
  }, []);

  // auth + live Firestore sync
  useEffect(() => {
    const fb = getFirebase();
    if (!fb) return;
    let unsubDoc: (() => void) | null = null;
    const unsubAuth = onAuthStateChanged(fb.auth, async (user) => {
      unsubDoc?.();
      unsubDoc = null;
      userRef.current = user;
      if (!user) {
        setAuth({ status: "signed-out", user: null });
        replaceData(readLocal());
        return;
      }
      setAuth({ status: "signed-in", user });
      const ref = doc(fb.db, "users", user.uid);
      // first sign-in on this device: push whatever was saved locally into the account
      const local = readLocal();
      if (!isEmpty(local)) {
        try {
          await setDoc(ref, local, { merge: true });
          localStorage.removeItem(LOCAL_KEY);
        } catch (e) {
          setSyncError(String(e));
        }
      }
      unsubDoc = onSnapshot(
        ref,
        (snap) => replaceData({ ...EMPTY, ...(snap.data() as Partial<UserData> | undefined) }),
        (err) => setSyncError(err.message),
      );
    });
    return () => {
      unsubAuth();
      unsubDoc?.();
    };
  }, [replaceData]);

  const commit = useCallback((ops: Op[]) => {
    const next = applyOps(dataRef.current, ops);
    replaceData(next);
    const fb = getFirebase();
    const user = userRef.current;
    if (fb && user) {
      setDoc(doc(fb.db, "users", user.uid), opsToMerge(ops), { merge: true }).catch((e) => setSyncError(String(e)));
    } else {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
    }
  }, [replaceData]);

  const actions = {
    toggleDone: (id: string, value?: boolean) => {
      const on = value ?? !dataRef.current.done[id];
      commit([{ path: ["done", id], value: on ? true : DEL }]);
    },
    setManyDone: (ids: string[], on: boolean) =>
      commit(ids.map((id) => ({ path: ["done", id], value: on ? true : DEL }))),
    setNote: (id: string, text: string) =>
      commit([{ path: ["notes", id], value: text.trim() ? text : DEL }]),
    createList: (name: string) => {
      const id = uid("l_");
      const n = Object.keys(dataRef.current.lists).length;
      commit([{ path: ["lists", id], value: { name, color: LIST_COLORS[n % LIST_COLORS.length], createdAt: Date.now(), items: {} } }]);
      return id;
    },
    renameList: (id: string, name: string) => commit([{ path: ["lists", id, "name"], value: name }]),
    deleteList: (id: string) => commit([{ path: ["lists", id], value: DEL }]),
    toggleInList: (listId: string, markerId: string) => {
      const has = dataRef.current.lists[listId]?.items?.[markerId];
      commit([{ path: ["lists", listId, "items", markerId], value: has ? DEL : true }]);
    },
    addCustom: (m: Omit<CustomMarker, "createdAt">) => {
      const id = uid("c_");
      commit([{ path: ["custom", id], value: { ...m, createdAt: Date.now() } }]);
      return id;
    },
    updateCustom: (id: string, patch: Partial<Omit<CustomMarker, "createdAt">>) =>
      commit(Object.entries(patch).map(([k, v]) => ({ path: ["custom", id, k], value: v }))),
    deleteCustom: (id: string) => {
      const d = dataRef.current;
      const ops: Op[] = [
        { path: ["custom", id], value: DEL },
        { path: ["done", id], value: DEL },
        { path: ["notes", id], value: DEL },
      ];
      for (const [lid, l] of Object.entries(d.lists)) if (l.items?.[id]) ops.push({ path: ["lists", lid, "items", id], value: DEL });
      commit(ops);
    },
    importData: (incoming: Partial<UserData>) => {
      const ops: Op[] = [];
      for (const key of ["done", "notes", "lists", "custom"] as const) {
        for (const [k, v] of Object.entries(incoming[key] ?? {})) ops.push({ path: [key, k], value: v });
      }
      commit(ops);
    },
  };

  const signIn = async () => {
    const fb = getFirebase();
    if (!fb) return;
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(fb.auth, provider);
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") {
        await signInWithRedirect(fb.auth, provider);
      } else if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        setSyncError(String(e));
      }
    }
  };
  const signOut = async () => {
    const fb = getFirebase();
    if (fb) await fbSignOut(fb.auth);
  };

  return { data, auth, actions, signIn, signOut, syncError, clearSyncError: () => setSyncError(null) };
}

export type UserDataApi = ReturnType<typeof useUserData>;
