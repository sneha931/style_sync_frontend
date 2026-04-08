import type { Request, Response } from 'express';
import { z } from 'zod';
import Logger from '../logger.js';
import { extractDesignTokensFromUrl } from '../services/designTokenExtractor.js';
import {
  markSiteAsFailed,
  saveScrapedTokens,
} from '../services/tokenManagementService.js';

const scrapeSchema = z.object({
  url: z
    .string({ message: 'URL is required.' })
    .refine((v) => URL.canParse(v), { message: 'Invalid URL. Please include http:// or https://.' }),
});

export const scrapeWebsite = async (req: Request, res: Response) => {
  const result = scrapeSchema.safeParse(req.body);
  if (!result.success) {
    const error = result.error.issues[0]?.message ?? 'Invalid request.';
    res.status(400).json({ error });
    return;
  }

  const { url } = result.data;

  try {
    const tokens = await extractDesignTokensFromUrl(url);
    const managed = await saveScrapedTokens(url, {
      colors: tokens.colors,
      typography: tokens.typography,
      spacing: tokens.spacing,
      analysisScore: tokens.analysisScore,
    });

    res.status(200).json(managed);
  } catch (error) {
    Logger.error(`Scrape failed for ${url}: ${(error as Error).message}`);
    await markSiteAsFailed(url);
    res.status(500).json({ error: 'Unable to extract design tokens for this URL right now.' });
  }
};
