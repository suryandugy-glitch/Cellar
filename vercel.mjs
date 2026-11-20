import { workspaceOrigin } from './deploy/vercel-origins.mjs';

export const config = {
  framework: null,
  installCommand: '',
  buildCommand: 'node deploy/build-vercel.mjs',
  outputDirectory: 'build/vercel',
  headers: [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'none'", "script-src 'self'", "style-src 'self'", "img-src 'self'",
            ["connect-src 'self'", workspaceOrigin].filter(Boolean).join(' '),
            "base-uri 'none'", "frame-ancestors 'none'", "form-action 'self'"
          ].join('; ')
        },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'no-referrer' }
      ]
    }
  ]
};
