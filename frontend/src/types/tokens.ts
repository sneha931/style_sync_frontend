export interface VersionChange {
  before: unknown;
  after: unknown;
}

export interface VersionEntry {
  version: number;
  timestamp: string;
  changes: Record<string, VersionChange>;
}

export interface TokenColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  muted: string;
  border: string;
  neutrals?: string[];
}

export interface TokenTypographyScale {
  h1?: string;
  h2?: string;
  h3?: string;
  h4?: string;
  body?: string;
  caption?: string;
}

export interface TokenTypography {
  fontFamily?: string;
  scale?: TokenTypographyScale;
}

export interface TokenSpacingScale {
  xs?: string;
  sm?: string;
  md?: string;
  lg?: string;
  xl?: string;
  '2xl'?: string;
}

export interface TokenSpacing {
  unit?: number;
  scale?: TokenSpacingScale;
}

export interface AnalysisScore {
  colorConfidence: number;
  typographyConfidence: number;
  spacingConfidence: number;
}

export interface TokenPayload {
  colors: TokenColors;
  typography: TokenTypography;
  spacing: TokenSpacing;
  analysisScore?: AnalysisScore;
}

export interface TokenManagementResponse {
  url: string;
  tokens: TokenPayload;
  lockedTokens: Record<string, boolean>;
  versionHistory: VersionEntry[];
}
