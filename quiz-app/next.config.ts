import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

// 同じ Wi-Fi のスマホから `next dev` に繋げるよう、PC の LAN アドレスを QR に出す
const lanAddresses = Object.values(networkInterfaces())
  .flat()
  .filter((n) => n && n.family === "IPv4" && !n.internal)
  .map((n) => n!.address);

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost", ...lanAddresses],
  env: {
    NEXT_PUBLIC_DEV_LAN_ORIGIN: lanAddresses[0] ? `http://${lanAddresses[0]}:${process.env.PORT ?? 3000}` : "",
  },
};

export default nextConfig;
