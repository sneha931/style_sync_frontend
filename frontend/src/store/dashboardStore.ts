import { create } from 'zustand';
import type { TokenManagementResponse, TokenPayload, VersionEntry } from '../types/tokens';
import { editTokens, setTokenLocks, getTokens } from '../services/tokenService';

function setValueAtPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> {
  const result = JSON.parse(JSON.stringify(obj)) as Record<string, unknown>;
  const parts = path.split('.');
  let cursor: Record<string, unknown> = result;
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof cursor[parts[i]] !== 'object' || cursor[parts[i]] === null) {
      cursor[parts[i]] = {};
    }
    cursor = cursor[parts[i]] as Record<string, unknown>;
  }
  cursor[parts[parts.length - 1]] = value;
  return result;
}

interface DashboardState {
  url: string;
  tokens: TokenPayload | null;
  lockedTokens: Record<string, boolean>;
  versionHistory: VersionEntry[];
  loading: boolean;
  saving: boolean;
  error: string | null;

  setFromResponse: (res: TokenManagementResponse) => void;
  updateTokenLocal: (path: string, value: unknown) => void;
  persistToken: (path: string, value: unknown) => Promise<void>;
  toggleLock: (path: string) => Promise<void>;
  fetchForUrl: (url: string) => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  url: '',
  tokens: null,
  lockedTokens: {},
  versionHistory: [],
  loading: false,
  saving: false,
  error: null,

  setFromResponse: (res) => {
    set({
      url: res.url,
      tokens: res.tokens,
      lockedTokens: res.lockedTokens,
      versionHistory: res.versionHistory,
    });
  },

  updateTokenLocal: (path, value) => {
    const { tokens } = get();
    if (!tokens) return;
    const updated = setValueAtPath(tokens as unknown as Record<string, unknown>, path, value);
    set({ tokens: updated as unknown as TokenPayload });
  },

  persistToken: async (path, value) => {
    const { url } = get();
    if (!url) return;
    set({ saving: true });
    try {
      const res = await editTokens(url, { [path]: value });
      set({
        tokens: res.tokens,
        versionHistory: res.versionHistory,
        saving: false,
      });
    } catch {
      set({ saving: false });
    }
  },

  toggleLock: async (path) => {
    const { url, lockedTokens } = get();
    if (!url) return;
    const newVal = !lockedTokens[path];
    // Optimistic update
    set({ lockedTokens: { ...lockedTokens, [path]: newVal } });
    try {
      const res = await setTokenLocks(url, { [path]: newVal });
      set({ lockedTokens: res.lockedTokens });
    } catch {
      // Revert on failure
      set({ lockedTokens });
    }
  },

  fetchForUrl: async (url) => {
    set({ loading: true, error: null });
    try {
      const res = await getTokens(url);
      set({
        url: res.url,
        tokens: res.tokens,
        lockedTokens: res.lockedTokens,
        versionHistory: res.versionHistory,
        loading: false,
      });
    } catch {
      set({ loading: false, error: 'Failed to load tokens for this URL.' });
    }
  },
}));
