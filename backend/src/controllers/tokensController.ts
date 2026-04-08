import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  getCurrentTokensForSite,
  getLatestSiteUrl,
  getVersionHistory,
  updateTokenLocks,
  updateTokenValues,
} from '../services/tokenManagementService.js';

const urlField = z
  .string({ message: 'url is required.' })
  .refine((v) => URL.canParse(v), { message: 'Invalid URL. Please include http:// or https://.' });

const editTokensSchema = z.object({
  url: urlField,
  updates: z
    .record(z.string(), z.unknown())
    .refine((v) => Object.keys(v).length > 0, { message: 'updates must not be empty.' }),
});

const tokenLocksSchema = z.object({
  url: urlField,
  locks: z
    .record(z.string(), z.boolean())
    .refine((v) => Object.keys(v).length > 0, { message: 'locks must not be empty.' }),
});

export const getLatestTokens = async (req: Request, res: Response) => {
  const requestedUrl = String(req.query.url ?? '').trim();
  let url = requestedUrl;

  if (!url) {
    const latest = await getLatestSiteUrl();
    url = latest ?? '';
  }

  if (!url) {
    res.status(404).json({ error: 'No sites have been scraped yet.' });
    return;
  }

  const state = await getCurrentTokensForSite(url);
  if (!state) {
    res.status(404).json({ error: 'No design tokens available yet for this URL.' });
    return;
  }

  res.status(200).json(state);
};

export const editTokens = async (req: Request, res: Response) => {
  const result = editTokensSchema.safeParse(req.body);
  if (!result.success) {
    const error = result.error.issues[0]?.message ?? 'Invalid request.';
    res.status(400).json({ error });
    return;
  }

  const { url, updates } = result.data;

  try {
    const updated = await updateTokenValues(url, updates);
    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const setTokenLocks = async (req: Request, res: Response) => {
  const result = tokenLocksSchema.safeParse(req.body);
  if (!result.success) {
    const error = result.error.issues[0]?.message ?? 'Invalid request.';
    res.status(400).json({ error });
    return;
  }

  const { url, locks } = result.data;

  try {
    const updated = await updateTokenLocks(url, locks);
    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const getTokenHistory = async (req: Request, res: Response) => {
  const url = String(req.query.url ?? '').trim();

  if (!url) {
    res.status(400).json({ error: 'Query param "url" is required.' });
    return;
  }

  try {
    const history = await getVersionHistory(url);
    res.status(200).json({ url, versionHistory: history });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};
