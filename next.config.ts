import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // El default (1 MB) rechazaba los PDF de más de 1 MB aunque el sistema
      // admite hasta 10 MB (MAX_BYTES_ADJUNTO), y no alcanza para las fotos de
      // un expediente cargado desde el celular (MAX_BYTES_FOTOS_TOTAL = 20 MB).
      // Margen extra para el resto del formulario.
      bodySizeLimit: '21mb',
    },
  },
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
