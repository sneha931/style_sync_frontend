import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { Vibrant } from 'node-vibrant/node';

type ColorSourceType = 'css' | 'image' | 'logo' | 'hero';

interface RawFontMetric {
  tag: string;
  family: string;
  size: number;
  weight: number;
  lineHeight: number;
}

interface ScrapedStyleData {
  cssColors: string[];
  headingFonts: RawFontMetric[];
  bodyFonts: RawFontMetric[];
  spacingValues: number[];
  imageUrls: string[];
  logoUrls: string[];
  heroUrls: string[];
}

interface ColorOccurrence {
  hex: string;
  count: number;
  sources: Record<ColorSourceType, number>;
}

export interface ExtractedDesignTokens {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    muted: string;
    border: string;
    neutrals: string[];
    palette: Array<{
      color: string;
      count: number;
      sources: Record<ColorSourceType, number>;
    }>;
    imageExtracted: {
      logos: string[];
      heroBanners: string[];
      images: string[];
    };
  };
  typography: {
    fontFamily: string;
    scale: {
      h1: string;
      h2: string;
      h3: string;
      h4: string;
      body: string;
      caption: string;
    };
  };
  spacing: {
    unit: number;
    scale: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
      '2xl': string;
    };
  };
  analysisScore: {
    colorConfidence: number;
    typographyConfidence: number;
    spacingConfidence: number;
  };
}

const MAX_STYLE_SAMPLE = 1800;
const MAX_IMAGE_SAMPLE = 10;

const DEFAULT_FALLBACK = {
  primary: '#2563EB',
  secondary: '#0EA5E9',
  accent: '#F59E0B',
  neutral: ['#111827', '#374151', '#6B7280', '#E5E7EB'],
};

const quantile = (values: number[], q: number): number => {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor(q * sorted.length)),
  );
  return sorted[index] ?? sorted[0] ?? 0;
};

const toPxToken = (value: number): string =>
  `${Math.max(0, Math.round(value))}px`;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (value: number) =>
    clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
};

const normalizeHex = (value: string): string | null => {
  const color = value.trim();
  if (!color) {
    return null;
  }

  const hexMatch = color.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (hexMatch) {
    const hex = hexMatch[1] ?? '';
    if (hex.length === 3) {
      return `#${hex
        .split('')
        .map((segment) => `${segment}${segment}`)
        .join('')}`.toUpperCase();
    }
    return `#${hex}`.toUpperCase();
  }

  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgbMatch) {
    const r = Number.parseInt(rgbMatch[1] ?? '0', 10);
    const g = Number.parseInt(rgbMatch[2] ?? '0', 10);
    const b = Number.parseInt(rgbMatch[3] ?? '0', 10);
    return rgbToHex(r, g, b);
  }

  return null;
};

const hexToHsl = (hex: string): { h: number; s: number; l: number } => {
  const sanitized = normalizeHex(hex) ?? '#000000';
  const r = Number.parseInt(sanitized.slice(1, 3), 16) / 255;
  const g = Number.parseInt(sanitized.slice(3, 5), 16) / 255;
  const b = Number.parseInt(sanitized.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;

  if (delta !== 0) {
    if (max === r) {
      h = ((g - b) / delta) % 6;
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }
  }

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return {
    h: ((h * 60 + 360) % 360) / 360,
    s,
    l,
  };
};

const isNeutral = (hex: string): boolean => {
  const { s, l } = hexToHsl(hex);
  return s < 0.12 || l < 0.12 || l > 0.9;
};

const hueDistance = (hexA: string, hexB: string): number => {
  const hueA = hexToHsl(hexA).h;
  const hueB = hexToHsl(hexB).h;
  const distance = Math.abs(hueA - hueB);
  return Math.min(distance, 1 - distance) * 360;
};

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const sanitized = normalizeHex(hex) ?? '#000000';
  return {
    r: Number.parseInt(sanitized.slice(1, 3), 16),
    g: Number.parseInt(sanitized.slice(3, 5), 16),
    b: Number.parseInt(sanitized.slice(5, 7), 16),
  };
};

const rgbDistance = (a: string, b: string): number => {
  const c1 = hexToRgb(a);
  const c2 = hexToRgb(b);
  return Math.sqrt(
    (c1.r - c2.r) ** 2 + (c1.g - c2.g) ** 2 + (c1.b - c2.b) ** 2,
  );
};

const luminance = (hex: string): number => {
  const { r, g, b } = hexToRgb(hex);
  const srgb = [r, g, b].map((v) => {
    const normalized = v / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return (
    0.2126 * (srgb[0] ?? 0) + 0.7152 * (srgb[1] ?? 0) + 0.0722 * (srgb[2] ?? 0)
  );
};

interface ColorCluster {
  count: number;
  sourceTotals: Record<ColorSourceType, number>;
  members: ColorOccurrence[];
}

const combineSourceTotals = (
  totals: Record<ColorSourceType, number>,
  next: Record<ColorSourceType, number>,
): Record<ColorSourceType, number> => ({
  css: totals.css + next.css,
  image: totals.image + next.image,
  logo: totals.logo + next.logo,
  hero: totals.hero + next.hero,
});

const representativeColor = (cluster: ColorCluster): string =>
  [...cluster.members].sort((a, b) => b.count - a.count)[0]?.hex ?? '#000000';

const clusterColorOccurrences = (
  occurrences: ColorOccurrence[],
): ColorOccurrence[] => {
  const clusters: ColorCluster[] = [];

  for (const occurrence of occurrences) {
    const nearest = clusters.find(
      (cluster) =>
        rgbDistance(representativeColor(cluster), occurrence.hex) <= 24,
    );

    if (!nearest) {
      clusters.push({
        count: occurrence.count,
        sourceTotals: { ...occurrence.sources },
        members: [occurrence],
      });
      continue;
    }

    nearest.count += occurrence.count;
    nearest.sourceTotals = combineSourceTotals(
      nearest.sourceTotals,
      occurrence.sources,
    );
    nearest.members.push(occurrence);
  }

  return clusters
    .map((cluster) => ({
      hex: representativeColor(cluster),
      count: cluster.count,
      sources: cluster.sourceTotals,
    }))
    .sort((a, b) => b.count - a.count);
};

const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const roundConfidence = (value: number): number =>
  Number(clampNumber(value, 0.2, 0.99).toFixed(2));

const buildSourceRecord = (): Record<ColorSourceType, number> => ({
  css: 0,
  image: 0,
  logo: 0,
  hero: 0,
});

const upsertColor = (
  colorMap: Map<string, ColorOccurrence>,
  maybeColor: string | null,
  source: ColorSourceType,
): void => {
  if (!maybeColor) {
    return;
  }

  const color = normalizeHex(maybeColor);
  if (!color) {
    return;
  }

  const existing = colorMap.get(color);
  if (existing) {
    existing.count += 1;
    existing.sources[source] += 1;
    colorMap.set(color, existing);
    return;
  }

  const sources = buildSourceRecord();
  sources[source] = 1;
  colorMap.set(color, {
    hex: color,
    count: 1,
    sources,
  });
};

const getMostCommonFont = (
  metrics: RawFontMetric[],
  fallback: RawFontMetric,
): RawFontMetric => {
  if (metrics.length === 0) {
    return fallback;
  }

  const fontFrequency = new Map<string, number>();
  const sizeValues: number[] = [];
  const weightValues: number[] = [];
  const lineHeightValues: number[] = [];

  for (const metric of metrics) {
    const key = metric.family.trim() || fallback.family;
    fontFrequency.set(key, (fontFrequency.get(key) ?? 0) + 1);
    if (metric.size > 0) {
      sizeValues.push(metric.size);
    }
    if (metric.weight > 0) {
      weightValues.push(metric.weight);
    }
    if (metric.lineHeight > 0) {
      lineHeightValues.push(metric.lineHeight);
    }
  }

  const family =
    [...fontFrequency.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
    fallback.family;
  const size = quantile(sizeValues, 0.5) || fallback.size;
  const weight = quantile(weightValues, 0.5) || fallback.weight;
  const lineHeight = quantile(lineHeightValues, 0.5) || Math.round(size * 1.4);

  return {
    tag: fallback.tag,
    family,
    size,
    weight,
    lineHeight,
  };
};

const extractPaletteFromImage = async (imageUrl: string): Promise<string[]> => {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      return [];
    }

    const arrayBuffer = await response.arrayBuffer();
    const palette = await Vibrant.from(Buffer.from(arrayBuffer)).getPalette();
    const swatches = Object.values(palette)
      .filter((swatch): swatch is NonNullable<typeof swatch> => Boolean(swatch))
      .map((swatch) => swatch.hex)
      .map((hex) => normalizeHex(hex))
      .filter((hex): hex is string => Boolean(hex));

    return Array.from(new Set(swatches));
  } catch {
    return [];
  }
};

const scrapeStyles = async (url: string): Promise<ScrapedStyleData> => {
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 45000,
    });

    const scraped = (await page.evaluate(`
      (() => {
        const maxSample = ${MAX_STYLE_SAMPLE};
        const parsePx = (value) => {
          const numeric = Number.parseFloat(value);
          return Number.isFinite(numeric) ? numeric : 0;
        };

        const styleNodes = Array.from(document.querySelectorAll('*'))
          .filter((node) => node instanceof HTMLElement)
          .slice(0, maxSample);

        const cssColors = [];
        const headingFonts = [];
        const bodyFonts = [];
        const spacingValues = [];

        const textTags = new Set([
          'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'SPAN', 'A', 'LI', 'BUTTON', 'LABEL',
        ]);

        for (const element of styleNodes) {
          const computed = getComputedStyle(element);
          cssColors.push(computed.color, computed.backgroundColor, computed.borderColor);

          const marginValues = [
            computed.marginTop,
            computed.marginRight,
            computed.marginBottom,
            computed.marginLeft,
          ];
          const paddingValues = [
            computed.paddingTop,
            computed.paddingRight,
            computed.paddingBottom,
            computed.paddingLeft,
          ];
          const gapValues = [computed.gap, computed.rowGap, computed.columnGap];

          for (const value of [...marginValues, ...paddingValues, ...gapValues]) {
            const parsed = parsePx(value);
            if (parsed > 0) {
              spacingValues.push(parsed);
            }
          }

          const hasText = (element.textContent || '').trim().length > 1;
          if (hasText && textTags.has(element.tagName)) {
            const size = parsePx(computed.fontSize);
            const weight = Number.parseInt(computed.fontWeight, 10) || 400;
            const lineHeight = parsePx(computed.lineHeight) || Math.round(size * 1.4);
            const metric = {
              tag: element.tagName,
              family: computed.fontFamily,
              size,
              weight,
              lineHeight,
            };

            if (/^H[1-6]$/.test(element.tagName)) {
              headingFonts.push(metric);
            } else {
              bodyFonts.push(metric);
            }
          }
        }

        const allImages = Array.from(document.querySelectorAll('img'))
          .filter((img) => img instanceof HTMLImageElement)
          .map((img) => {
            const rect = img.getBoundingClientRect();
            const src = img.currentSrc || img.src;
            const hintText = String((img.alt || '') + ' ' + (img.className || '') + ' ' + (img.id || '')).toLowerCase();
            return {
              src,
              hintText,
              area: Math.max(0, rect.width) * Math.max(0, rect.height),
            };
          })
          .filter((image) => Boolean(image.src));

        const uniq = (urls) => Array.from(new Set(urls));

        const logoUrls = uniq(
          allImages
            .filter((image) => image.hintText.includes('logo') || image.hintText.includes('brand') || image.hintText.includes('mark'))
            .sort((a, b) => b.area - a.area)
            .map((image) => image.src)
            .slice(0, 4),
        );

        const heroUrls = uniq(
          allImages
            .filter(
              (image) =>
                image.hintText.includes('hero') ||
                image.hintText.includes('banner') ||
                image.hintText.includes('masthead') ||
                image.area > window.innerWidth * (window.innerHeight * 0.25),
            )
            .sort((a, b) => b.area - a.area)
            .map((image) => image.src)
            .slice(0, 4),
        );

        const imageUrls = uniq(
          allImages
            .sort((a, b) => b.area - a.area)
            .map((image) => image.src)
            .slice(0, 10),
        );

        return {
          cssColors,
          headingFonts,
          bodyFonts,
          spacingValues,
          imageUrls,
          logoUrls,
          heroUrls,
        };
      })();
    `)) as ScrapedStyleData;

    return scraped;
  } finally {
    await browser.close();
  }
};

export const extractDesignTokensFromUrl = async (
  url: string,
): Promise<ExtractedDesignTokens> => {
  const scraped = await scrapeStyles(url);

  const colorMap = new Map<string, ColorOccurrence>();
  for (const color of scraped.cssColors) {
    upsertColor(colorMap, color, 'css');
  }

  const [imagePalettes, logoPalettes, heroPalettes] = await Promise.all([
    Promise.all(
      scraped.imageUrls
        .slice(0, MAX_IMAGE_SAMPLE)
        .map((imageUrl) => extractPaletteFromImage(imageUrl)),
    ),
    Promise.all(
      scraped.logoUrls
        .slice(0, MAX_IMAGE_SAMPLE)
        .map((imageUrl) => extractPaletteFromImage(imageUrl)),
    ),
    Promise.all(
      scraped.heroUrls
        .slice(0, MAX_IMAGE_SAMPLE)
        .map((imageUrl) => extractPaletteFromImage(imageUrl)),
    ),
  ]);

  const flatImages = imagePalettes.flat();
  const flatLogos = logoPalettes.flat();
  const flatHero = heroPalettes.flat();

  for (const color of flatImages) {
    upsertColor(colorMap, color, 'image');
  }
  for (const color of flatLogos) {
    upsertColor(colorMap, color, 'logo');
  }
  for (const color of flatHero) {
    upsertColor(colorMap, color, 'hero');
  }

  const rawOccurrences = [...colorMap.values()].sort(
    (a, b) => b.count - a.count,
  );
  const frequentOccurrences = rawOccurrences.filter(
    (entry) => entry.count >= 5,
  );
  const filteredOccurrences = frequentOccurrences;
  const clustered = clusterColorOccurrences(filteredOccurrences);

  const colorful = clustered.filter((entry) => !isNeutral(entry.hex));
  const colorfulFallback =
    colorful.length > 0
      ? colorful
      : clusterColorOccurrences(rawOccurrences)
          .filter((entry) => !isNeutral(entry.hex))
          .slice(0, 6);
  const neutrals = clustered.filter((entry) => isNeutral(entry.hex));

  const colorDistinctiveness = (entry: ColorOccurrence): number => {
    const hsl = hexToHsl(entry.hex);
    const sourceSpread =
      (Object.values(entry.sources).filter((count) => count > 0).length / 4) *
      0.35;
    const saturationScore = hsl.s * 0.45;
    const lightnessPenalty = hsl.l > 0.85 || hsl.l < 0.15 ? -0.2 : 0;
    const frequencyScore = Math.min(0.2, entry.count / 100);
    return saturationScore + sourceSpread + frequencyScore + lightnessPenalty;
  };

  const colorfulByDistinctiveness = [...colorfulFallback].sort(
    (a, b) => colorDistinctiveness(b) - colorDistinctiveness(a),
  );

  const primary = colorfulByDistinctiveness[0]?.hex ?? DEFAULT_FALLBACK.primary;
  const secondary =
    colorfulByDistinctiveness.find(
      (entry) => entry.hex !== primary && hueDistance(entry.hex, primary) > 20,
    )?.hex ??
    colorfulByDistinctiveness.find((entry) => entry.hex !== primary)?.hex ??
    DEFAULT_FALLBACK.secondary;

  const accent =
    [...colorfulFallback]
      .sort((a, b) => {
        const satDelta = hexToHsl(b.hex).s - hexToHsl(a.hex).s;
        return satDelta !== 0 ? satDelta : b.count - a.count;
      })
      .find((entry) => entry.hex !== primary && entry.hex !== secondary)?.hex ??
    DEFAULT_FALLBACK.accent;

  const neutralPalette = [...neutrals].sort(
    (a, b) => luminance(a.hex) - luminance(b.hex),
  );

  const text = neutralPalette[0]?.hex ?? '#061B31';
  const background =
    neutralPalette[neutralPalette.length - 1]?.hex ?? '#FFFFFF';
  const muted =
    [...neutralPalette]
      .sort(
        (a, b) =>
          Math.abs(luminance(a.hex) - 0.72) - Math.abs(luminance(b.hex) - 0.72),
      )
      .find(
        (entry) =>
          rgbDistance(entry.hex, background) > 8 &&
          rgbDistance(entry.hex, text) > 8,
      )?.hex ?? '#E5EDF5';
  const borderCandidate = [...neutralPalette]
    .sort(
      (a, b) =>
        Math.abs(luminance(a.hex) - 0.8) - Math.abs(luminance(b.hex) - 0.8),
    )
    .find(
      (entry) =>
        rgbDistance(entry.hex, background) > 10 &&
        rgbDistance(entry.hex, text) > 18,
    )?.hex;
  const border = borderCandidate ?? '#D1D9E6';

  const allFontMetrics = [...scraped.headingFonts, ...scraped.bodyFonts];
  const fontFrequency = new Map<string, number>();
  for (const metric of allFontMetrics) {
    const family = metric.family.split(',')[0]?.trim() || 'system-ui';
    fontFrequency.set(family, (fontFrequency.get(family) ?? 0) + 1);
  }

  const primaryFontFamily =
    [...fontFrequency.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
    'system-ui';
  const fontFamily = `${primaryFontFamily}, system-ui`;

  const bodySizes = scraped.bodyFonts
    .map((metric) => metric.size)
    .filter((size) => size > 0);
  const bodySize = quantile(bodySizes, 0.5) || 16;

  const byTag = (tag: string): number[] =>
    scraped.headingFonts
      .filter((metric) => metric.tag.toUpperCase() === tag)
      .map((metric) => metric.size)
      .filter((size) => size > 0);

  const h1SizeObserved = quantile(byTag('H1'), 0.5);
  const h2SizeObserved = quantile(byTag('H2'), 0.5);
  const h3SizeObserved = quantile(byTag('H3'), 0.5);

  const headingSizes = scraped.headingFonts
    .map((metric) => metric.size)
    .filter((size) => size > 0)
    .sort((a, b) => b - a);
  const inferredRatio =
    headingSizes.length > 0
      ? (headingSizes[0] ?? bodySize * 1.5) / Math.max(1, bodySize)
      : 1.5;
  const scaleRatio = clampNumber(inferredRatio, 1.15, 1.6);

  const h1Size = h1SizeObserved || Math.round(bodySize * scaleRatio * 1.6);
  const h2Size = h2SizeObserved || Math.round(h1Size / 1.28);
  const h3Size = h3SizeObserved || Math.round(h2Size / 1.22);
  const h4Size = Math.round(h3Size / 1.2);
  const captionSize = Math.max(10, Math.round(bodySize * 0.75));

  const spacingValues = Array.from(
    new Set(
      scraped.spacingValues
        .filter((value) => value > 0 && value < 256)
        .map((value) => Math.round(value)),
    ),
  ).sort((a, b) => a - b);

  const unitCandidates = [4, 8];
  const candidateScores = unitCandidates.map((unit) => {
    if (spacingValues.length === 0) {
      return { unit, score: 0 };
    }

    const aligned = spacingValues.filter((value) => {
      const remainder = value % unit;
      return remainder === 0 || remainder === 1 || remainder === unit - 1;
    }).length;

    const score = aligned / spacingValues.length;
    return { unit, score };
  });

  const spacingUnit =
    [...candidateScores].sort((a, b) => b.score - a.score)[0]?.unit ?? 4;
  const spacingScale = {
    xs: toPxToken(spacingUnit),
    sm: toPxToken(spacingUnit * 2),
    md: toPxToken(spacingUnit * 4),
    lg: toPxToken(spacingUnit * 6),
    xl: toPxToken(spacingUnit * 8),
    '2xl': toPxToken(spacingUnit * 12),
  };

  const colorCoverage =
    rawOccurrences.length > 0
      ? clustered.reduce((sum, item) => sum + item.count, 0) /
        rawOccurrences.reduce((sum, item) => sum + item.count, 0)
      : 0;
  const colorConfidence = roundConfidence(
    colorCoverage * 0.6 +
      Math.min(1, clustered.length / 8) * 0.2 +
      Math.min(1, colorfulFallback.length / 4) * 0.2,
  );

  const typographyConfidence = roundConfidence(
    Math.min(1, bodySizes.length / 15) * 0.35 +
      Math.min(1, headingSizes.length / 10) * 0.35 +
      (h1SizeObserved > 0 || h2SizeObserved > 0 || h3SizeObserved > 0
        ? 0.3
        : 0.1),
  );

  const spacingAlignment =
    spacingValues.length === 0
      ? 0
      : spacingValues.filter((value) => value % spacingUnit === 0).length /
        spacingValues.length;
  const spacingConfidence = roundConfidence(
    spacingAlignment * 0.65 + Math.min(1, spacingValues.length / 18) * 0.35,
  );

  return {
    colors: {
      primary,
      secondary,
      accent,
      background,
      text,
      muted,
      border,
      neutrals: Array.from(new Set([background, muted, border, text])).slice(
        0,
        4,
      ),
      palette: clustered.slice(0, 20).map((entry) => ({
        color: entry.hex,
        count: entry.count,
        sources: entry.sources,
      })),
      imageExtracted: {
        logos: Array.from(new Set(flatLogos)).slice(0, 8),
        heroBanners: Array.from(new Set(flatHero)).slice(0, 8),
        images: Array.from(new Set(flatImages)).slice(0, 8),
      },
    },
    typography: {
      fontFamily,
      scale: {
        h1: toPxToken(h1Size),
        h2: toPxToken(h2Size),
        h3: toPxToken(h3Size),
        h4: toPxToken(h4Size),
        body: toPxToken(bodySize),
        caption: toPxToken(captionSize),
      },
    },
    spacing: {
      unit: spacingUnit,
      scale: spacingScale,
    },
    analysisScore: {
      colorConfidence,
      typographyConfidence,
      spacingConfidence,
    },
  };
};
