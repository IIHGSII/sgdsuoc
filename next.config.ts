import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Obliga a usar HTTPS por 2 años (el navegador lo ignora en http://localhost).
          // Sin includeSubDomains, para no afectar otros subdominios del mismo dominio.
          { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
          // CSP mínima que no interfiere con los scripts de Next: impide que el
          // sistema se muestre dentro de otro sitio, que se carguen plugins y que
          // los formularios envíen datos a otro dominio.
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
