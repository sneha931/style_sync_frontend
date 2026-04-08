import { axiosInstance } from '../api';
import type { TokenManagementResponse } from '../types/tokens';

const SCRAPE_TIMEOUT_MS = 120_000;

export async function analyzeWebsite(url: string): Promise<TokenManagementResponse> {
  const res = await axiosInstance.post<TokenManagementResponse>(
    '/api/scrape',
    { url },
    { timeout: SCRAPE_TIMEOUT_MS },
  );
  return res.data;
}

export function getAnalyzeErrorMessage(err: unknown): string {
  const msg = String((err as { message?: string })?.message ?? '').toLowerCase();

  if (msg.includes('timeout') || (err as { code?: string })?.code === 'ECONNABORTED') {
    return 'Analysis is taking longer than expected. Please try again in a moment.';
  }

  if (msg.includes('network error')) {
    return 'Cannot reach the backend. Check that the server is running.';
  }

  return (
    (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
    'Something went wrong. Please try again.'
  );
}
