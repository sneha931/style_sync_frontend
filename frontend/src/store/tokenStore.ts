import { create } from 'zustand';
import { axiosInstance } from '../api';

interface DesignTokens {
  colors: Record<string, string>;
  typography: Record<string, string>;
  spacing: Record<string, string>;
}

interface TokenStore {
  tokens: DesignTokens | null;
  loading: boolean;
  error: string | null;
  fetchTokens: () => Promise<void>;
}

export const useTokenStore = create<TokenStore>((set) => ({
  tokens: null,
  loading: false,
  error: null,
  fetchTokens: async () => {
    set({ loading: true, error: null });
    try {
      const res = await axiosInstance.get('/api/tokens');
      set({ tokens: res.data, loading: false });
    } catch {
      // No tokens yet — silently ignore on initial load
      set({ loading: false });
    }
  },
}));
