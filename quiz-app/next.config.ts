import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

// 同じ Wi-Fi のスマホから `next dev` に繋げるよう、PC の LAN アドレスを許可しておく
const lanAddresses = Object.values(networkInterfaces())
  .flat()
  .filter((n) => n && n.family === "IPv4" && !n.internal)
  .map((n) => n!.address);

// エミュレータ利用時、ブラウザからの Firestore / Auth 通信をこのサーバー経由でエミュレータへ中継する
const emulatorRoutes = [
  { source: "/google.firestore.v1.Firestore/:path*", destination: "http://127.0.0.1:8080/google.firestore.v1.Firestore/:path*" },
  { source: "/v1/projects/:path*", destination: "http://127.0.0.1:8080/v1/projects/:path*" },
  { source: "/identitytoolkit.googleapis.com/:path*", destination: "http://127.0.0.1:9099/identitytoolkit.googleapis.com/:path*" },
  { source: "/securetoken.googleapis.com/:path*", destination: "http://127.0.0.1:9099/securetoken.googleapis.com/:path*" },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: [...lanAddresses, "*.trycloudflare.com"],
  experimental: { proxyTimeout: 120_000 },
  async rewrites() {
    return process.env.NEXT_PUBLIC_USE_EMULATORS === "true" ? emulatorRoutes : [];
  },
  env: {
    NEXT_PUBLIC_DEV_LAN_ORIGIN: lanAddresses[0] ? `http://${lanAddresses[0]}:${process.env.PORT ?? 3000}` : "",
  },
};

export default nextConfig;
