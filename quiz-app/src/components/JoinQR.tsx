"use client";

import { QRCodeSVG } from "qrcode.react";
import { useSyncExternalStore } from "react";

/** 参加者に配る URL。本番は NEXT_PUBLIC_APP_URL、ローカルでは PC の LAN アドレスを優先する */
export function joinUrl(roomId: string): string {
  if (typeof window === "undefined") return "";
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  const local = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const origin = configured || (local && process.env.NEXT_PUBLIC_DEV_LAN_ORIGIN) || window.location.origin;
  return `${origin.replace(/\/$/, "")}/play/${roomId}`;
}

const noop = () => () => {};

export function JoinQR({ roomId, size = 180, showUrl = true }: { roomId: string; size?: number; showUrl?: boolean }) {
  const url = useSyncExternalStore(noop, () => joinUrl(roomId), () => "");
  if (!url) return null;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="rounded-3xl bg-white p-4 shadow-md">
        <QRCodeSVG value={url} size={size} fgColor="#4a3a40" marginSize={0} />
      </div>
      {showUrl && <p className="break-all text-center text-xs text-ink-soft">{url}</p>}
    </div>
  );
}
