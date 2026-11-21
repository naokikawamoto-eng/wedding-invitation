"use client";

import { QRCodeSVG } from "qrcode.react";
import { useSyncExternalStore } from "react";
import { quizEntryUrl } from "@/lib/join-url";

/** 参加者に配る URL。会場では公開入口、手元の開発ではその端末の入口 */
export function joinUrl(roomId: string): string {
  if (typeof window === "undefined") return "";
  return quizEntryUrl({
    hostname: window.location.hostname,
    origin: window.location.origin,
    roomId,
    lanOrigin: process.env.NEXT_PUBLIC_DEV_LAN_ORIGIN,
  });
}

const noop = () => () => {};

export function JoinQR({
  roomId,
  size = 180,
  showUrl = true,
  large = false,
}: {
  roomId: string;
  size?: number;
  showUrl?: boolean;
  large?: boolean;
}) {
  const url = useSyncExternalStore(noop, () => joinUrl(roomId), () => "");
  if (!url) return null;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="rounded-2xl bg-white p-2 shadow-md">
        <QRCodeSVG value={url} size={size} level="Q" marginSize={4} bgColor="#ffffff" fgColor="#000000" title="クイズに参加" />
      </div>
      {showUrl && (
        <p className={large ? "break-all text-center text-sm font-bold tracking-wide sm:text-lg" : "break-all text-center text-xs text-ink-soft"}>
          {url}
        </p>
      )}
    </div>
  );
}
