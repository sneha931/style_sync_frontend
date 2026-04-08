import React from 'react';
import type { TokenPayload } from '../types/tokens';

interface Props {
  tokens: TokenPayload;
}

function buildCssVars(tokens: TokenPayload): React.CSSProperties {
  const { colors, typography, spacing } = tokens;
  return {
    '--color-primary': colors.primary ,
    '--color-secondary': colors.secondary ,
    '--color-accent': colors.accent ,
    '--color-bg': colors.background ,
    '--color-text': colors.text ,
    '--color-muted': colors.muted ,
    '--color-border': colors.border ,
    '--font-family': typography.fontFamily ,
    '--font-h1': typography.scale?.h1 ,
    '--font-h2': typography.scale?.h2 ,
    '--font-h3': typography.scale?.h3 ,
    '--font-h4': typography.scale?.h4,
    '--font-body': typography.scale?.body ,
    '--font-caption': typography.scale?.caption ,
    '--spacing-xs': spacing.scale?.xs ,
    '--spacing-sm': spacing.scale?.sm ,
    '--spacing-md': spacing.scale?.md ,
    '--spacing-lg': spacing.scale?.lg ,
    '--spacing-xl': spacing.scale?.xl ,
    '--spacing-2xl': spacing.scale?.['2xl'] ,
  } as React.CSSProperties;
}

export function ComponentPreview({ tokens }: Props) {
  const cssVars = buildCssVars(tokens);

  return (
    <div
      style={{
        ...cssVars,
        backgroundColor: 'var(--color-bg)',
        color: 'var(--color-text)',
        fontFamily: 'var(--font-family)',
      }}
      className="rounded-xl border border-gray-700 overflow-hidden"
    >
      {/* Canvas toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-gray-600" />
          <div className="w-3 h-3 rounded-full bg-gray-600" />
          <div className="w-3 h-3 rounded-full bg-gray-600" />
        </div>
        <span className="text-xs text-gray-500 ml-2">Component Preview</span>
      </div>

      {/* Preview content */}
      <div className="p-6 space-y-8">
        {/* Buttons */}
        <PreviewSection title="Buttons">
          <div className="flex flex-wrap gap-3">
            <button
              style={{
                backgroundColor: 'var(--color-primary)',
                color: '#fff',
                padding: 'var(--spacing-sm) var(--spacing-md)',
                fontSize: 'var(--font-body)',
                fontFamily: 'var(--font-family)',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Primary
            </button>
            <button
              style={{
                backgroundColor: 'var(--color-secondary)',
                color: '#fff',
                padding: 'var(--spacing-sm) var(--spacing-md)',
                fontSize: 'var(--font-body)',
                fontFamily: 'var(--font-family)',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Secondary
            </button>
            <button
              style={{
                backgroundColor: 'transparent',
                color: 'var(--color-primary)',
                padding: 'var(--spacing-sm) var(--spacing-md)',
                fontSize: 'var(--font-body)',
                fontFamily: 'var(--font-family)',
                border: '1.5px solid var(--color-primary)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Ghost
            </button>
            <button
              style={{
                backgroundColor: 'var(--color-accent)',
                color: '#fff',
                padding: 'var(--spacing-sm) var(--spacing-md)',
                fontSize: 'var(--font-body)',
                fontFamily: 'var(--font-family)',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Accent
            </button>
          </div>
        </PreviewSection>

        {/* Input Fields */}
        <PreviewSection title="Input Fields">
          <div className="space-y-3 max-w-xs">
            <input
              readOnly
              placeholder="Default input"
              style={{
                width: '100%',
                padding: 'var(--spacing-sm) var(--spacing-md)',
                fontSize: 'var(--font-body)',
                fontFamily: 'var(--font-family)',
                color: 'var(--color-text)',
                backgroundColor: 'var(--color-bg)',
                border: '1.5px solid var(--color-border)',
                borderRadius: '6px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <input
              readOnly
              placeholder="Focused input"
              style={{
                width: '100%',
                padding: 'var(--spacing-sm) var(--spacing-md)',
                fontSize: 'var(--font-body)',
                fontFamily: 'var(--font-family)',
                color: 'var(--color-text)',
                backgroundColor: 'var(--color-bg)',
                border: '1.5px solid var(--color-primary)',
                borderRadius: '6px',
                outline: 'none',
                boxShadow: '0 0 0 3px color-mix(in srgb, var(--color-primary) 20%, transparent)',
                boxSizing: 'border-box',
              }}
            />
            <input
              readOnly
              placeholder="Error state"
              style={{
                width: '100%',
                padding: 'var(--spacing-sm) var(--spacing-md)',
                fontSize: 'var(--font-body)',
                fontFamily: 'var(--font-family)',
                color: '#dc2626',
                backgroundColor: 'var(--color-bg)',
                border: '1.5px solid #dc2626',
                borderRadius: '6px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </PreviewSection>

        {/* Cards */}
        <PreviewSection title="Cards">
          <div className="grid grid-cols-3 gap-4">
            {/* Shadow card */}
            <div
              style={{
                padding: 'var(--spacing-md)',
                backgroundColor: 'var(--color-bg)',
                borderRadius: '8px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                fontFamily: 'var(--font-family)',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--color-primary)',
                  marginBottom: 'var(--spacing-sm)',
                }}
              />
              <div style={{ fontSize: 'var(--font-body)', fontWeight: 600, color: 'var(--color-text)' }}>
                Shadow
              </div>
              <div style={{ fontSize: 'var(--font-caption)', color: 'var(--color-muted)', marginTop: '4px' }}>
                Box shadow card
              </div>
            </div>

            {/* Border card */}
            <div
              style={{
                padding: 'var(--spacing-md)',
                backgroundColor: 'var(--color-bg)',
                borderRadius: '8px',
                border: '1.5px solid var(--color-border)',
                fontFamily: 'var(--font-family)',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--color-secondary)',
                  marginBottom: 'var(--spacing-sm)',
                }}
              />
              <div style={{ fontSize: 'var(--font-body)', fontWeight: 600, color: 'var(--color-text)' }}>
                Border
              </div>
              <div style={{ fontSize: 'var(--font-caption)', color: 'var(--color-muted)', marginTop: '4px' }}>
                Outlined card
              </div>
            </div>

            {/* Accent card */}
            <div
              style={{
                padding: 'var(--spacing-md)',
                backgroundColor: 'var(--color-accent)',
                borderRadius: '16px',
                fontFamily: 'var(--font-family)',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.3)',
                  marginBottom: 'var(--spacing-sm)',
                }}
              />
              <div style={{ fontSize: 'var(--font-body)', fontWeight: 600, color: '#fff' }}>
                Rounded
              </div>
              <div style={{ fontSize: 'var(--font-caption)', color: 'rgba(255,255,255,0.75)', marginTop: '4px' }}>
                Accent filled
              </div>
            </div>
          </div>
        </PreviewSection>

        {/* Typography */}
        <PreviewSection title="Typography">
          <div className="space-y-3">
            <div style={{ fontSize: 'var(--font-h1)', fontWeight: 700, lineHeight: 1.1, color: 'var(--color-text)', fontFamily: 'var(--font-family)' }}>
              H1 Heading
            </div>
            <div style={{ fontSize: 'var(--font-h2)', fontWeight: 600, lineHeight: 1.2, color: 'var(--color-text)', fontFamily: 'var(--font-family)' }}>
              H2 Sub-heading
            </div>
            <div style={{ fontSize: 'var(--font-h3)', fontWeight: 600, lineHeight: 1.3, color: 'var(--color-text)', fontFamily: 'var(--font-family)' }}>
              H3 Section title
            </div>
            <div style={{ fontSize: 'var(--font-body)', lineHeight: 1.6, color: 'var(--color-text)', fontFamily: 'var(--font-family)' }}>
              Body — The quick brown fox jumps over the lazy dog. Design tokens make consistent UI fast.
            </div>
            <div style={{ fontSize: 'var(--font-caption)', color: 'var(--color-muted)', fontFamily: 'var(--font-family)' }}>
              Caption — Smaller supporting text, labels, and metadata
            </div>
          </div>
        </PreviewSection>

        {/* Spacing scale */}
        <PreviewSection title="Spacing Scale">
          <div className="space-y-2">
            {(['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const).map((key) => (
              <div key={key} className="flex items-center gap-3">
                <span
                  style={{
                    fontSize: 'var(--font-caption)',
                    color: 'var(--color-muted)',
                    fontFamily: 'var(--font-family)',
                    width: '32px',
                    textAlign: 'right',
                  }}
                >
                  {key}
                </span>
                <div
                  style={{
                    height: '8px',
                    width: `var(--spacing-${key})`,
                    backgroundColor: 'var(--color-primary)',
                    borderRadius: '2px',
                    minWidth: '4px',
                  }}
                />
                <span style={{ fontSize: 'var(--font-caption)', color: 'var(--color-muted)', fontFamily: 'var(--font-family)' }}>
                  {tokens.spacing.scale?.[key]}
                </span>
              </div>
            ))}
          </div>
        </PreviewSection>
      </div>
    </div>
  );
}

function PreviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
        {title}
      </div>
      {children}
    </div>
  );
}
