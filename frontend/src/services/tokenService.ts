import { axiosInstance } from '../api';
import type { TokenManagementResponse, VersionEntry } from '../types/tokens';

export async function getTokens(url: string): Promise<TokenManagementResponse> {
  const res = await axiosInstance.get<TokenManagementResponse>('/api/tokens', {
    params: { url },
  });
  return res.data;
}

export async function editTokens(
  url: string,
  updates: Record<string, unknown>,
): Promise<TokenManagementResponse> {
  const res = await axiosInstance.patch<TokenManagementResponse>('/api/tokens', {
    url,
    updates,
  });
  return res.data;
}

export async function setTokenLocks(
  url: string,
  locks: Record<string, boolean>,
): Promise<TokenManagementResponse> {
  const res = await axiosInstance.patch<TokenManagementResponse>('/api/tokens/locks', {
    url,
    locks,
  });
  return res.data;
}

export async function fetchVersionHistory(
  url: string,
): Promise<{ url: string; versionHistory: VersionEntry[] }> {
  const res = await axiosInstance.get<{ url: string; versionHistory: VersionEntry[] }>(
    '/api/tokens/history',
    { params: { url } },
  );
  return res.data;
}
