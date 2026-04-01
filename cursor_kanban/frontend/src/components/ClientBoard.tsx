"use client";

import dynamic from "next/dynamic";

const Board = dynamic(() => import("@/components/Board").then((module) => module.Board), {
  ssr: false,
});

export function ClientBoard() {
  return <Board />;
}
