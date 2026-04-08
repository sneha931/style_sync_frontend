import prisma from '../db/prismaClient.js';
import type { Prisma } from '@prisma/client';
import type { ExtractedDesignTokens } from './designTokenExtractor.js';

export type TokenPayload = Pick<
  ExtractedDesignTokens,
  'colors' | 'typography' | 'spacing' | 'analysisScore'
>;

interface VersionChange {
  before: unknown;
  after: unknown;
}

interface VersionHistorySummary {
  version: number;
  timestamp: Date;
  changes: Record<string, VersionChange>;
}

export interface TokenManagementResponse {
  url: string;
  tokens: TokenPayload;
  lockedTokens: Record<string, boolean>;
  versionHistory: VersionHistorySummary[];
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const flattenObject = (
  value: unknown,
  prefix = '',
  acc: Record<string, unknown> = {},
): Record<string, unknown> => {
  if (!isObject(value) && !Array.isArray(value)) {
    if (prefix) {
      acc[prefix] = value;
    }
    return acc;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      const key = prefix ? `${prefix}.${index}` : `${index}`;
      flattenObject(item, key, acc);
    });
    return acc;
  }

  Object.entries(value).forEach(([key, nestedValue]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    flattenObject(nestedValue, path, acc);
  });

  return acc;
};

const getValueByPath = (obj: unknown, path: string): unknown => {
  const parts = path.split('.');
  let cursor: unknown = obj;

  for (const part of parts) {
    if (!isObject(cursor) && !Array.isArray(cursor)) {
      return undefined;
    }

    cursor = (cursor as Record<string, unknown>)[part];
  }

  return cursor;
};

const setValueByPath = (
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
) => {
  const parts = path.split('.');
  const last = parts.pop();
  if (!last) {
    return;
  }

  let cursor: Record<string, unknown> = obj;
  for (const part of parts) {
    const next = cursor[part];
    if (!isObject(next)) {
      cursor[part] = {};
    }
    cursor = cursor[part] as Record<string, unknown>;
  }

  cursor[last] = value;
};

const cloneTokens = (tokens: TokenPayload): TokenPayload =>
  JSON.parse(JSON.stringify(tokens)) as TokenPayload;

const normalizeVersionChanges = (
  beforeState: TokenPayload,
  afterState: TokenPayload,
): Record<string, VersionChange> => {
  const beforeFlat = flattenObject(beforeState);
  const afterFlat = flattenObject(afterState);
  const allKeys = new Set([
    ...Object.keys(beforeFlat),
    ...Object.keys(afterFlat),
  ]);

  const changes: Record<string, VersionChange> = {};

  allKeys.forEach((key) => {
    const before = beforeFlat[key];
    const after = afterFlat[key];

    if (JSON.stringify(before) !== JSON.stringify(after)) {
      changes[key] = { before, after };
    }
  });

  return changes;
};

const nextVersionNumber = async (siteId: string): Promise<number> => {
  const latest = await prisma.versionHistory.findFirst({
    where: { siteId },
    orderBy: { version: 'desc' },
  });

  return (latest?.version ?? 0) + 1;
};

const getLockMap = async (siteId: string): Promise<Record<string, boolean>> => {
  const lockRows = await prisma.lockedToken.findMany({ where: { siteId } });
  return lockRows.reduce<Record<string, boolean>>((acc, row) => {
    acc[row.tokenKey] = row.isLocked;
    return acc;
  }, {});
};

const persistVersionEntry = async (
  siteId: string,
  beforeState: TokenPayload,
  afterState: TokenPayload,
) => {
  const changes = normalizeVersionChanges(beforeState, afterState);
  if (Object.keys(changes).length === 0) {
    return;
  }

  const version = await nextVersionNumber(siteId);
  await prisma.versionHistory.create({
    data: {
      siteId,
      version,
      beforeState,
      afterState,
      changes: changes as unknown as Prisma.InputJsonValue,
    },
  });
};

const ensureSite = async (url: string) => {
  const existing = await prisma.scrapedSite.findUnique({ where: { url } });
  if (existing) {
    return existing;
  }

  return prisma.scrapedSite.create({
    data: {
      url,
      extractionStatus: 'initialized',
    },
  });
};

export const getCurrentTokensForSite = async (
  url: string,
): Promise<TokenManagementResponse | null> => {
  const site = await prisma.scrapedSite.findUnique({ where: { url } });
  if (!site) {
    return null;
  }

  const designToken = await prisma.designToken.findUnique({
    where: { siteId: site.id },
  });

  if (!designToken) {
    return null;
  }

  const lockMap = await getLockMap(site.id);
  const versions = await prisma.versionHistory.findMany({
    where: { siteId: site.id },
    orderBy: { version: 'asc' },
  });

  return {
    url,
    tokens: {
      colors: designToken.colors as TokenPayload['colors'],
      typography: designToken.typography as TokenPayload['typography'],
      spacing: designToken.spacing as TokenPayload['spacing'],
      analysisScore: (designToken.analysisScore ?? {
        colorConfidence: 0,
        typographyConfidence: 0,
        spacingConfidence: 0,
      }) as TokenPayload['analysisScore'],
    },
    lockedTokens: lockMap,
    versionHistory: versions.map((version) => ({
      version: version.version,
      timestamp: version.timestamp,
      changes: version.changes as unknown as Record<string, VersionChange>,
    })),
  };
};

export const saveScrapedTokens = async (
  url: string,
  scrapedTokens: TokenPayload,
): Promise<TokenManagementResponse> => {
  const site = await ensureSite(url);

  const existing = await prisma.designToken.findUnique({
    where: { siteId: site.id },
  });

  const lockMap = await getLockMap(site.id);

  const baseTokens: TokenPayload | null = existing
    ? {
        colors: existing.colors as TokenPayload['colors'],
        typography: existing.typography as TokenPayload['typography'],
        spacing: existing.spacing as TokenPayload['spacing'],
        analysisScore: (existing.analysisScore ??
          scrapedTokens.analysisScore) as TokenPayload['analysisScore'],
      }
    : null;

  const merged = cloneTokens(scrapedTokens);

  if (baseTokens) {
    const currentFlat = flattenObject(baseTokens);
    const mergedFlat = flattenObject(merged);
    const allKeys = new Set([
      ...Object.keys(currentFlat),
      ...Object.keys(mergedFlat),
    ]);

    allKeys.forEach((key) => {
      if (lockMap[key]) {
        setValueByPath(
          merged as unknown as Record<string, unknown>,
          key,
          currentFlat[key],
        );
      }
    });
  }

  await prisma.scrapedSite.update({
    where: { id: site.id },
    data: { extractionStatus: 'completed' },
  });

  await prisma.designToken.upsert({
    where: { siteId: site.id },
    create: {
      siteId: site.id,
      colors: merged.colors,
      typography: merged.typography,
      spacing: merged.spacing,
      analysisScore: merged.analysisScore,
    },
    update: {
      colors: merged.colors,
      typography: merged.typography,
      spacing: merged.spacing,
      analysisScore: merged.analysisScore,
    },
  });

  if (baseTokens) {
    await persistVersionEntry(site.id, baseTokens, merged);
  } else {
    const version = await nextVersionNumber(site.id);
    await prisma.versionHistory.create({
      data: {
        siteId: site.id,
        version,
        beforeState: {},
        afterState: merged,
        changes: normalizeVersionChanges(
          {
            colors: {},
            typography: {},
            spacing: {},
            analysisScore: {
              colorConfidence: 0,
              typographyConfidence: 0,
              spacingConfidence: 0,
            },
          } as unknown as TokenPayload,
          merged,
        ) as unknown as Prisma.InputJsonValue,
      },
    });
  }

  const versions = await prisma.versionHistory.findMany({
    where: { siteId: site.id },
    orderBy: { version: 'asc' },
  });

  return {
    url,
    tokens: merged,
    lockedTokens: lockMap,
    versionHistory: versions.map((version) => ({
      version: version.version,
      timestamp: version.timestamp,
      changes: version.changes as unknown as Record<string, VersionChange>,
    })),
  };
};

export const updateTokenValues = async (
  url: string,
  updates: Record<string, unknown>,
): Promise<TokenManagementResponse> => {
  const site = await ensureSite(url);
  const existing = await prisma.designToken.findUnique({
    where: { siteId: site.id },
  });

  if (!existing) {
    throw new Error('No tokens exist for this site. Run scrape first.');
  }

  const current: TokenPayload = {
    colors: existing.colors as TokenPayload['colors'],
    typography: existing.typography as TokenPayload['typography'],
    spacing: existing.spacing as TokenPayload['spacing'],
    analysisScore: (existing.analysisScore ?? {
      colorConfidence: 0,
      typographyConfidence: 0,
      spacingConfidence: 0,
    }) as TokenPayload['analysisScore'],
  };

  const next = cloneTokens(current);
  Object.entries(updates).forEach(([path, value]) => {
    setValueByPath(next as unknown as Record<string, unknown>, path, value);
  });

  await prisma.designToken.update({
    where: { siteId: site.id },
    data: {
      colors: next.colors,
      typography: next.typography,
      spacing: next.spacing,
      analysisScore: next.analysisScore,
    },
  });

  await persistVersionEntry(site.id, current, next);

  const lockMap = await getLockMap(site.id);
  const versions = await prisma.versionHistory.findMany({
    where: { siteId: site.id },
    orderBy: { version: 'asc' },
  });

  return {
    url,
    tokens: next,
    lockedTokens: lockMap,
    versionHistory: versions.map((version) => ({
      version: version.version,
      timestamp: version.timestamp,
      changes: version.changes as unknown as Record<string, VersionChange>,
    })),
  };
};

export const updateTokenLocks = async (
  url: string,
  locks: Record<string, boolean>,
): Promise<TokenManagementResponse> => {
  const site = await ensureSite(url);

  await Promise.all(
    Object.entries(locks).map(([tokenKey, isLocked]) =>
      prisma.lockedToken.upsert({
        where: {
          siteId_tokenKey: {
            siteId: site.id,
            tokenKey,
          },
        },
        create: {
          siteId: site.id,
          tokenKey,
          isLocked,
        },
        update: {
          isLocked,
        },
      }),
    ),
  );

  const current = await getCurrentTokensForSite(url);
  if (!current) {
    return {
      url,
      tokens: {
        colors: {} as TokenPayload['colors'],
        typography: {} as TokenPayload['typography'],
        spacing: {} as TokenPayload['spacing'],
        analysisScore: {
          colorConfidence: 0,
          typographyConfidence: 0,
          spacingConfidence: 0,
        },
      },
      lockedTokens: await getLockMap(site.id),
      versionHistory: [],
    };
  }

  return {
    ...current,
    lockedTokens: await getLockMap(site.id),
  };
};

export const getLatestSiteUrl = async (): Promise<string | null> => {
  const site = await prisma.scrapedSite.findFirst({
    orderBy: { createdAt: 'desc' },
  });
  return site?.url ?? null;
};

export const getVersionHistory = async (
  url: string,
): Promise<VersionHistorySummary[]> => {
  const site = await prisma.scrapedSite.findUnique({ where: { url } });
  if (!site) {
    return [];
  }

  const versions = await prisma.versionHistory.findMany({
    where: { siteId: site.id },
    orderBy: { version: 'asc' },
  });

  return versions.map((v) => ({
    version: v.version,
    timestamp: v.timestamp,
    changes: v.changes as unknown as Record<string, VersionChange>,
  }));
};

export const markSiteAsFailed = async (url: string) => {
  const site = await ensureSite(url);
  await prisma.scrapedSite.update({
    where: { id: site.id },
    data: {
      extractionStatus: 'failed',
    },
  });
};
