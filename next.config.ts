import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // El middleware protege /api/upload-informe (gate de admin) y Next.js
    // trunca a 10MB el body de cualquier request que pase por middleware a
    // menos que se suba este límite. Los informes reales (ej. Esmeralda,
    // 12.4MB) superan eso, así que lo alineamos con el tope de 80MB que ya
    // valida la propia ruta (MAX_SIZE_BYTES en api/upload-informe/route.ts).
    proxyClientMaxBodySize: "80mb",
  },
};

export default nextConfig;
