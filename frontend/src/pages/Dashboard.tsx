import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HexColorPicker } from 'react-colorful';
import { Lock, Unlock, Download, ChevronDown, CheckCircle, RotateCcw } from 'lucide-react';
import { useDashboardStore } from '../store/dashboardStore';
import { ComponentPreview } from '../components/ComponentPreview';
import type { TokenPayload, VersionEntry } from '../types/tokens';

// ─── Export helpers ────────────────────────────────────────────────────────────

function downloadFile(content: string, filename: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportAsCss(tokens: TokenPayload) {
  const { colors, typography, spacing } = tokens;

  const line = (varName: string, value: string | number | undefined) =>
    value != null ? `  ${varName}: ${value};` : null;

  const lines = [
    ':root {',
    line('--color-primary', colors.primary),
    line('--color-secondary', colors.secondary),
    line('--color-accent', colors.accent),
    line('--color-background', colors.background),
    line('--color-text', colors.text),
    line('--color-muted', colors.muted),
    line('--color-border', colors.border),
    line('--font-family', typography.fontFamily),
    line('--font-h1', typography.scale?.h1),
    line('--font-h2', typography.scale?.h2),
    line('--font-h3', typography.scale?.h3),
    line('--font-h4', typography.scale?.h4),
    line('--font-body', typography.scale?.body),
    line('--font-caption', typography.scale?.caption),
    line('--spacing-unit', spacing.unit != null ? `${spacing.unit}px` : undefined),
    line('--spacing-xs', spacing.scale?.xs),
    line('--spacing-sm', spacing.scale?.sm),
    line('--spacing-md', spacing.scale?.md),
    line('--spacing-lg', spacing.scale?.lg),
    line('--spacing-xl', spacing.scale?.xl),
    line('--spacing-2xl', spacing.scale?.['2xl']),
    '}',
  ].filter((l): l is string => l !== null);

  downloadFile(lines.join('\n'), 'tokens.css');
}

function exportAsJson(tokens: TokenPayload) {
  const { colors, typography, spacing } = tokens;
  const out = {
    colors: {
      primary: colors.primary,
      secondary: colors.secondary,
      accent: colors.accent,
      background: colors.background,
      text: colors.text,
      muted: colors.muted,
      border: colors.border,
    },
    typography: {
      fontFamily: typography.fontFamily,
      scale: typography.scale,
    },
    spacing: {
      unit: spacing.unit,
      scale: spacing.scale,
    },
  };
  downloadFile(JSON.stringify(out, null, 2), 'tokens.json', 'application/json');
}

function exportAsTailwind(tokens: TokenPayload) {
  const { colors, typography, spacing } = tokens;

  const entry = (key: string, value: string | number | undefined) =>
    value != null ? `        ${key}: '${value}',` : null;

  const colorLines = [
    entry('primary', colors.primary),
    entry('secondary', colors.secondary),
    entry('accent', colors.accent),
    entry('background', colors.background),
    entry("'text-base'", colors.text),
    entry('muted', colors.muted),
    entry('border', colors.border),
  ].filter((l): l is string => l !== null);

  const fontSizeLines = [
    entry('h1', typography.scale?.h1),
    entry('h2', typography.scale?.h2),
    entry('h3', typography.scale?.h3),
    entry('body', typography.scale?.body),
    entry('caption', typography.scale?.caption),
  ].filter((l): l is string => l !== null);

  const spacingLines = [
    entry('xs', spacing.scale?.xs),
    entry('sm', spacing.scale?.sm),
    entry('md', spacing.scale?.md),
    entry('lg', spacing.scale?.lg),
    entry('xl', spacing.scale?.xl),
    entry("'2xl'", spacing.scale?.['2xl']),
  ].filter((l): l is string => l !== null);

  const sections: string[] = [
    '/** @type {import("tailwindcss").Config} */',
    'module.exports = {',
    '  theme: {',
    '    extend: {',
  ];

  if (colorLines.length) {
    sections.push('      colors: {', ...colorLines, '      },');
  }
  if (typography.fontFamily) {
    sections.push('      fontFamily: {', `        sans: ['${typography.fontFamily}'],`, '      },');
  }
  if (fontSizeLines.length) {
    sections.push('      fontSize: {', ...fontSizeLines, '      },');
  }
  if (spacingLines.length) {
    sections.push('      spacing: {', ...spacingLines, '      },');
  }

  sections.push('    },', '  },', '};');
  downloadFile(sections.join('\n'), 'tailwind.tokens.js');
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 px-3 py-2 mt-1">
      {children}
    </div>
  );
}

function LockButton({ locked, onClick }: { locked: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={locked ? 'Locked — click to unlock' : 'Unlocked — click to lock'}
      className={`p-1 rounded transition-colors ${
        locked
          ? 'text-amber-400 hover:text-amber-300'
          : 'text-gray-600 hover:text-gray-400'
      }`}
    >
      {locked ? <Lock size={11} /> : <Unlock size={11} />}
    </button>
  );
}

// ─── Color Row ─────────────────────────────────────────────────────────────────

interface ColorRowProps {
  label: string;
  tokenPath: string;
  value: string;
  locked: boolean;
  onToggleLock: () => void;
  onChange: (v: string) => void;
  onChangeComplete: (v: string) => void;
}

function ColorRow({ label, value, locked, onToggleLock, onChange, onChangeComplete }: ColorRowProps) {
  const [open, setOpen] = useState(false);
  const [localColor, setLocalColor] = useState(value || '#888888');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setLocalColor(value || '#888888'); }, [value]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        onChangeComplete(localColor);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, localColor, onChangeComplete]);

  const handleChange = (color: string) => {
    setLocalColor(color);
    onChange(color);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-800/50 rounded group">
        <button
          onClick={() => { if (!locked) setOpen((o) => !o); }}
          className={`w-7 h-7 rounded-md border border-white/10 flex-shrink-0 transition-transform ${locked ? 'cursor-not-allowed opacity-70' : 'hover:scale-110 cursor-pointer'}`}
          style={{ backgroundColor: localColor }}
          title={locked ? 'Locked' : 'Click to edit color'}
        />
        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-gray-400 leading-none mb-0.5">{label}</div>
          <div className="text-[11px] text-gray-300 font-mono leading-none">{localColor}</div>
        </div>
        <LockButton locked={locked} onClick={onToggleLock} />
      </div>

      {open && (
        <div className="absolute left-3 top-11 z-50 rounded-xl border border-gray-700 bg-gray-900 p-3 shadow-2xl">
          <HexColorPicker color={localColor} onChange={handleChange} style={{ width: '180px', height: '140px' }} />
          <div className="mt-2 flex items-center gap-2">
            <input
              type="text"
              value={localColor}
              onChange={(e) => {
                const v = e.target.value;
                if (/^#[0-9a-fA-F]{0,6}$/.test(v)) handleChange(v);
              }}
              className="flex-1 text-xs font-mono bg-gray-800 border border-gray-700 rounded-md px-2 py-1.5 text-gray-200 focus:outline-none focus:border-blue-500"
              maxLength={7}
            />
            <button
              onClick={() => { setOpen(false); onChangeComplete(localColor); }}
              className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-md font-medium transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Text Token Row ────────────────────────────────────────────────────────────

interface TextTokenRowProps {
  label: string;
  tokenPath: string;
  value: string;
  locked: boolean;
  onToggleLock: () => void;
  onSave: (v: string) => void;
  mono?: boolean;
}

function TextTokenRow({ label, value, locked, onToggleLock, onSave, mono }: TextTokenRowProps) {
  const [local, setLocal] = useState(value ?? '');
  const [dirty, setDirty] = useState(false);

  useEffect(() => { setLocal(value ?? ''); setDirty(false); }, [value]);

  const commit = () => {
    if (dirty && local !== value) onSave(local);
    setDirty(false);
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-800/50 rounded group">
      <div className="w-[70px] flex-shrink-0 text-[11px] text-gray-400 leading-none truncate" title={label}>
        {label}
      </div>
      <input
        type="text"
        value={local}
        disabled={locked}
        onChange={(e) => { setLocal(e.target.value); setDirty(true); }}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); } }}
        className={`flex-1 text-[11px] bg-gray-800 border border-gray-700 rounded px-2 py-1 focus:outline-none focus:border-blue-500 disabled:opacity-40 disabled:cursor-not-allowed ${mono ? 'font-mono' : ''} text-gray-200`}
      />
      <LockButton locked={locked} onClick={onToggleLock} />
    </div>
  );
}

// ─── Spacing Row ───────────────────────────────────────────────────────────────

function SpacingRow({ label, value, locked, onToggleLock, onSave }: TextTokenRowProps) {
  const [local, setLocal] = useState(value ?? '');

  useEffect(() => { setLocal(value ?? ''); }, [value]);

  const numVal = parseInt(local, 10) || 0;
  const maxPx = 80;

  const commit = (v: string) => {
    setLocal(v);
    if (v !== value) onSave(v);
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-800/50 rounded">
      <div className="w-8 flex-shrink-0 text-[11px] text-gray-500 font-mono">{label}</div>
      {/* Visual bar */}
      <div className="w-24 h-1.5 bg-gray-800 rounded-full flex-shrink-0 overflow-hidden">
        <div
          className="h-full rounded-full bg-blue-500 transition-all"
          style={{ width: `${Math.min((numVal / maxPx) * 100, 100)}%` }}
        />
      </div>
      <input
        type="text"
        value={local}
        disabled={locked}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => commit(local)}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(local); }}
        className="w-16 text-[11px] font-mono bg-gray-800 border border-gray-700 rounded px-2 py-1 focus:outline-none focus:border-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-gray-200"
      />
      <LockButton locked={locked} onClick={onToggleLock} />
    </div>
  );
}

// ─── Export Dropdown ───────────────────────────────────────────────────────────

function ExportDropdown({ tokens }: { tokens: TokenPayload }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const items = [
    { label: 'CSS Variables', ext: '.css', action: () => exportAsCss(tokens) },
    { label: 'JSON Tokens', ext: '.json', action: () => exportAsJson(tokens) },
    { label: 'Tailwind Config', ext: '.js', action: () => exportAsTailwind(tokens) },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
      >
        <Download size={12} />
        Export
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-50 w-44 rounded-lg border border-gray-700 bg-gray-900 shadow-2xl overflow-hidden">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => { item.action(); setOpen(false); }}
              className="w-full flex items-center justify-between px-3 py-2.5 text-xs text-gray-200 hover:bg-gray-800 transition-colors"
            >
              <span>{item.label}</span>
              <span className="text-gray-500 font-mono">{item.ext}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Version History Panel ─────────────────────────────────────────────────────

function VersionHistoryPanel({ history }: { history: VersionEntry[] }) {
  const sorted = [...history].reverse();

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-gray-800">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          Version History
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <RotateCcw size={20} className="text-gray-700 mx-auto mb-2" />
            <p className="text-xs text-gray-600">No changes yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {sorted.map((entry) => {
              const changedKeys = Object.keys(entry.changes);
              return (
                <div key={entry.version} className="px-4 py-3 hover:bg-gray-800/30">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-gray-300">v{entry.version}</span>
                    <span className="text-[10px] text-gray-500">
                      {new Date(entry.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-600 mb-1.5">
                    {new Date(entry.timestamp).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                  <div className="space-y-1">
                    {changedKeys.slice(0, 3).map((key) => {
                      const change = entry.changes[key];
                      return (
                        <div key={key} className="rounded bg-gray-800 px-2 py-1">
                          <div className="text-[10px] font-mono text-gray-400 truncate">{key}</div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[10px] font-mono text-red-400 truncate max-w-[60px]">
                              {String(change.before ?? '—')}
                            </span>
                            <span className="text-[10px] text-gray-600">→</span>
                            <span className="text-[10px] font-mono text-green-400 truncate max-w-[60px]">
                              {String(change.after ?? '—')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {changedKeys.length > 3 && (
                      <div className="text-[10px] text-gray-600 px-1">
                        +{changedKeys.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Token Editor Panel ────────────────────────────────────────────────────────

function TokenEditorPanel({
  tokens,
  lockedTokens,
}: {
  tokens: TokenPayload;
  lockedTokens: Record<string, boolean>;
}) {
  const { updateTokenLocal, persistToken, toggleLock } = useDashboardStore();

  const colorFields: { label: string; path: string; key: keyof typeof tokens.colors }[] = [
    { label: 'Primary', path: 'colors.primary', key: 'primary' },
    { label: 'Secondary', path: 'colors.secondary', key: 'secondary' },
    { label: 'Accent', path: 'colors.accent', key: 'accent' },
    { label: 'Background', path: 'colors.background', key: 'background' },
    { label: 'Text', path: 'colors.text', key: 'text' },
    { label: 'Muted', path: 'colors.muted', key: 'muted' },
    { label: 'Border', path: 'colors.border', key: 'border' },
  ];

  const typoFields: { label: string; path: string; value: string }[] = [
    { label: 'Font Family', path: 'typography.fontFamily', value: tokens.typography.fontFamily ?? '' },
    { label: 'H1', path: 'typography.scale.h1', value: tokens.typography.scale?.h1 ?? '' },
    { label: 'H2', path: 'typography.scale.h2', value: tokens.typography.scale?.h2 ?? '' },
    { label: 'H3', path: 'typography.scale.h3', value: tokens.typography.scale?.h3 ?? '' },
    { label: 'H4', path: 'typography.scale.h4', value: tokens.typography.scale?.h4 ?? '' },
    { label: 'Body', path: 'typography.scale.body', value: tokens.typography.scale?.body ?? '' },
    { label: 'Caption', path: 'typography.scale.caption', value: tokens.typography.scale?.caption ?? '' },
  ];

  const spacingFields: { label: string; path: string; key: string }[] = [
    { label: 'xs', path: 'spacing.scale.xs', key: 'xs' },
    { label: 'sm', path: 'spacing.scale.sm', key: 'sm' },
    { label: 'md', path: 'spacing.scale.md', key: 'md' },
    { label: 'lg', path: 'spacing.scale.lg', key: 'lg' },
    { label: 'xl', path: 'spacing.scale.xl', key: 'xl' },
    { label: '2xl', path: 'spacing.scale.2xl', key: '2xl' },
  ];

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      {/* Colors */}
      <SectionLabel>Colors</SectionLabel>
      {colorFields.map((field) => (
        <ColorRow
          key={field.path}
          label={field.label}
          tokenPath={field.path}
          value={String(tokens.colors[field.key] ?? '#888888')}
          locked={lockedTokens[field.path] ?? false}
          onToggleLock={() => toggleLock(field.path)}
          onChange={(v) => updateTokenLocal(field.path, v)}
          onChangeComplete={(v) => persistToken(field.path, v)}
        />
      ))}

      {/* Typography */}
      <SectionLabel>Typography</SectionLabel>
      {typoFields.map((field) => (
        <TextTokenRow
          key={field.path}
          label={field.label}
          tokenPath={field.path}
          value={field.value}
          locked={lockedTokens[field.path] ?? false}
          onToggleLock={() => toggleLock(field.path)}
          onSave={(v) => persistToken(field.path, v)}
          mono={field.label !== 'Font Family'}
        />
      ))}

      {/* Spacing */}
      <SectionLabel>Spacing</SectionLabel>
      <div className="px-3 py-1.5">
        <div className="text-[11px] text-gray-400">
          Unit: <span className="font-mono text-gray-300">{tokens.spacing.unit ?? 8}px</span>
        </div>
      </div>
      {spacingFields.map((field) => (
        <SpacingRow
          key={field.path}
          label={field.label}
          tokenPath={field.path}
          value={tokens.spacing.scale?.[field.key as keyof typeof tokens.spacing.scale] ?? ''}
          locked={lockedTokens[field.path] ?? false}
          onToggleLock={() => toggleLock(field.path)}
          onSave={(v) => persistToken(field.path, v)}
        />
      ))}

    </div>
  );
}

// ─── Top Bar ───────────────────────────────────────────────────────────────────

function TopBar({
  url,
  saving,
  onNewAnalysis,
  tokens,
}: {
  url: string;
  saving: boolean;
  onNewAnalysis: () => void;
  tokens: TokenPayload;
}) {
  return (
    <header className="flex items-center justify-between px-4 h-11 border-b border-gray-800 bg-gray-900 flex-shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        {/* Logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="5" height="5" rx="1" fill="white" />
              <rect x="9" y="2" width="5" height="5" rx="1" fill="white" fillOpacity="0.6" />
              <rect x="2" y="9" width="5" height="5" rx="1" fill="white" fillOpacity="0.6" />
              <rect x="9" y="9" width="5" height="5" rx="1" fill="white" fillOpacity="0.3" />
            </svg>
          </div>
          <span className="text-sm font-bold text-white">StyleSync</span>
        </div>

        <div className="w-px h-4 bg-gray-700 flex-shrink-0" />

        {/* URL */}
        <span className="text-xs text-gray-400 truncate max-w-xs" title={url}>
          {url}
        </span>

        {/* Save indicator */}
        {saving ? (
          <span className="text-[10px] text-blue-400 flex-shrink-0">Saving…</span>
        ) : (
          <span className="text-[10px] text-green-500 flex-shrink-0 flex items-center gap-1">
            <CheckCircle size={10} /> Saved
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onNewAnalysis}
          className="px-3 py-1.5 rounded-md text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
        >
          ← New Analysis
        </button>
        <ExportDropdown tokens={tokens} />
      </div>
    </header>
  );
}

// ─── Dashboard (main) ──────────────────────────────────────────────────────────

export function Dashboard() {
  const navigate = useNavigate();
  const { tokens, lockedTokens, versionHistory, url, saving, loading, error } = useDashboardStore();

  // If no tokens in store (e.g. hard refresh), redirect to landing
  useEffect(() => {
    if (!tokens && !loading) {
      navigate('/', { replace: true });
    }
  }, [tokens, loading, navigate]);

  if (loading) {
    return (
      <div className="h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading tokens…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  if (!tokens) return null;

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-gray-100 overflow-hidden">
      <TopBar
        url={url}
        saving={saving}
        onNewAnalysis={() => navigate('/')}
        tokens={tokens}
      />

      <div className="flex flex-1 min-h-0">
        {/* Left: Token Editor */}
        <div className="w-64 flex-shrink-0 border-r border-gray-800 bg-gray-900 overflow-hidden">
          <TokenEditorPanel tokens={tokens} lockedTokens={lockedTokens} />
        </div>

        {/* Center: Component Preview */}
        <div className="flex-1 overflow-y-auto p-5 bg-gray-950">
          <ComponentPreview tokens={tokens} />
        </div>

        {/* Right: Version History */}
        <div className="w-56 flex-shrink-0 border-l border-gray-800 bg-gray-900 overflow-hidden">
          <VersionHistoryPanel history={versionHistory} />
        </div>
      </div>
    </div>
  );
}
