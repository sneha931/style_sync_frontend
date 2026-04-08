import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'StyleSync API',
      version: '1.0.0',
      description:
        'Design token extraction and management API. Scrape websites to extract colors, typography, and spacing tokens. Edit, lock, and version-track tokens.',
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server',
      },
    ],
    tags: [
      {
        name: 'Scrape',
        description: 'Extract design tokens from a website URL',
      },
      {
        name: 'Tokens',
        description: 'Read, edit, lock, and track version history for design tokens',
      },
    ],
    components: {
      schemas: {
        TokenManagementResponse: {
          type: 'object',
          properties: {
            url: { type: 'string', example: 'https://example.com' },
            tokens: {
              type: 'object',
              properties: {
                colors: {
                  type: 'object',
                  properties: {
                    primary: { type: 'string', example: '#2F6CDF' },
                    secondary: { type: 'string', example: '#E794C8' },
                    accent: { type: 'string', example: '#F5A623' },
                    background: { type: 'string', example: '#FFFFFF' },
                    text: { type: 'string', example: '#1A1A1A' },
                    muted: { type: 'string', example: '#888888' },
                    border: { type: 'string', example: '#E0E0E0' },
                  },
                },
                typography: {
                  type: 'object',
                  properties: {
                    fontFamily: { type: 'string', example: 'Inter' },
                    scale: {
                      type: 'object',
                      properties: {
                        h1: { type: 'string', example: '48px' },
                        h2: { type: 'string', example: '36px' },
                        h3: { type: 'string', example: '28px' },
                        h4: { type: 'string', example: '22px' },
                        body: { type: 'string', example: '16px' },
                        caption: { type: 'string', example: '12px' },
                      },
                    },
                  },
                },
                spacing: {
                  type: 'object',
                  properties: {
                    unit: { type: 'number', example: 8 },
                    scale: {
                      type: 'object',
                      properties: {
                        xs: { type: 'string', example: '4px' },
                        sm: { type: 'string', example: '8px' },
                        md: { type: 'string', example: '16px' },
                        lg: { type: 'string', example: '24px' },
                        xl: { type: 'string', example: '32px' },
                        '2xl': { type: 'string', example: '48px' },
                      },
                    },
                  },
                },
                analysisScore: {
                  type: 'object',
                  properties: {
                    colorConfidence: { type: 'number', example: 0.87 },
                    typographyConfidence: { type: 'number', example: 0.91 },
                    spacingConfidence: { type: 'number', example: 0.78 },
                  },
                },
              },
            },
            lockedTokens: {
              type: 'object',
              description: 'Map of token dot-paths to their lock state',
              example: { 'colors.primary': true, 'typography.fontFamily': false },
            },
            versionHistory: {
              type: 'array',
              items: { $ref: '#/components/schemas/VersionEntry' },
            },
          },
        },
        VersionEntry: {
          type: 'object',
          properties: {
            version: { type: 'integer', example: 2 },
            timestamp: { type: 'string', format: 'date-time', example: '2026-04-07T14:00:00Z' },
            changes: {
              type: 'object',
              description: 'Map of changed token paths to before/after values',
              example: {
                'colors.primary': { before: '#2F6CDF', after: '#FF0000' },
              },
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'No design tokens available yet for this URL.' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

export const specs = swaggerJsdoc(options);
