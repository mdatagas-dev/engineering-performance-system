"use client";

import type { ReactNode } from "react";

export type WinXpIconName =
  | "my-computer"
  | "my-documents"
  | "recycle-bin"
  | "notepad"
  | "calculator"
  | "command-prompt"
  | "minesweeper"
  | "game-house"
  | "internet-explorer"
  | "network-places"
  | "control-panel"
  | "gas-pms"
  | "document-center"
  | "production"
  | "quality"
  | "engineering"
  | "maintenance"
  | "folder"
  | "folder-open"
  | "file"
  | "drive"
  | "shared-documents"
  | "windows-flag"
  | "run"
  | "help"
  | "search"
  | "shutdown"
  | "user";

const C = {
  face: "#ece9d8",
  hi: "#ffffff",
  lo: "#808080",
  dk: "#404040",
  k: "#000000",
  blue: "#3f8ee8",
  blueD: "#0a246a",
  blueL: "#a8cdf5",
  yl: "#ffcc66",
  ylD: "#d98a2b",
  ylL: "#ffe8a3",
  grn: "#3f9c3f",
  grnD: "#1e6b1e",
  red: "#c91f1f",
  redD: "#8f0f0f",
  sky: "#7db9ff",
  teal: "#1fa3b0",
} as const;

const R = ({ x, y, w, h, c }: { x: number; y: number; w: number; h: number; c: string }) => (
  <rect x={x} y={y} width={w} height={h} fill={c} />
);

const P = ({ d, c }: { d: string; c: string }) => <polygon points={d} fill={c} />;

function Icon({ name }: { name: WinXpIconName }) {
  switch (name) {
    case "my-computer":
      return (
        <g>
          <R x={3} y={3} w={21} h={16} c={C.k} />
          <R x={5} y={5} w={17} h={12} c={C.blueD} />
          <R x={6} y={6} w={15} h={10} c={C.blue} />
          <R x={10} y={18} w={5} h={3} c={C.dk} />
          <R x={8} y={21} w={9} h={2} c={C.face} />
          <R x={25} y={4} w={5} h={23} c={C.k} />
          <R x={26} y={5} w={3} h={21} c={C.face} />
          <R x={26} y={8} w={3} h={2} c={C.grn} />
          <R x={26} y={14} w={3} h={2} c={C.grn} />
        </g>
      );
    case "my-documents":
      return (
        <g>
          <R x={6} y={3} w={10} h={4} c={C.ylD} />
          <R x={5} y={6} w={22} h={4} c={C.ylD} />
          <R x={5} y={10} w={22} h={17} c={C.yl} />
          <R x={5} y={10} w={22} h={1} c={C.ylL} />
          <R x={26} y={10} w={1} h={17} c={C.ylD} />
          <R x={5} y={26} w={22} h={1} c={C.ylD} />
          <R x={13} y={12} w={10} h={13} c={C.hi} />
          <R x={14} y={15} w={8} h={1} c={C.blueL} />
          <R x={14} y={18} w={8} h={1} c={C.blueL} />
          <R x={14} y={21} w={5} h={1} c={C.blueL} />
        </g>
      );
    case "recycle-bin":
      return (
        <g>
          <R x={8} y={4} w={16} h={2} c={C.face} />
          <R x={6} y={6} w={20} h={3} c={C.face} />
          <R x={6} y={6} w={20} h={1} c={C.hi} />
          <R x={6} y={8} w={20} h={1} c={C.lo} />
          <R x={7} y={9} w={2} h={18} c={C.face} />
          <R x={9} y={9} w={14} h={18} c={C.face} />
          <R x={23} y={9} w={2} h={18} c={C.lo} />
          <R x={7} y={26} w={18} h={1} c={C.lo} />
          <R x={10} y={12} w={4} h={4} c={C.grn} />
          <R x={18} y={12} w={4} h={4} c={C.grn} />
          <R x={14} y={20} w={4} h={4} c={C.grn} />
          <P d="11,14 16,14 13.5,11" c={C.grnD} />
          <P d="16,14 11,14 13.5,17" c={C.grnD} />
          <P d="16,16 16,20 19,18" c={C.grnD} />
        </g>
      );
    case "notepad":
      return (
        <g>
          <R x={5} y={3} w={24} h={26} c={C.k} />
          <R x={4} y={2} w={21} h={26} c={C.hi} />
          <P d="21,2 25,2 25,6 21,6" c={C.hi} />
          <R x={25} y={2} w={1} h={1} c={C.k} />
          <R x={24} y={3} w={1} h={1} c={C.k} />
          <R x={23} y={4} w={1} h={1} c={C.k} />
          <R x={22} y={5} w={1} h={1} c={C.k} />
          <R x={25} y={2} w={1} h={26} c={C.lo} />
          <R x={4} y={27} w={21} h={1} c={C.lo} />
          <R x={7} y={9} w={14} h={1} c={C.blueL} />
          <R x={7} y={12} w={14} h={1} c={C.blueL} />
          <R x={7} y={15} w={14} h={1} c={C.blueL} />
          <R x={7} y={18} w={9} h={1} c={C.blueL} />
          <R x={27} y={8} w={2} h={4} c={C.red} />
          <R x={27} y={12} w={2} h={4} c={C.face} />
          <R x={27} y={16} w={2} h={2} c={C.dk} />
        </g>
      );
    case "calculator":
      return (
        <g>
          <R x={5} y={3} w={24} h={26} c={C.k} />
          <R x={4} y={2} w={24} h={26} c={C.face} />
          <R x={4} y={2} w={24} h={1} c={C.hi} />
          <R x={4} y={2} w={1} h={26} c={C.hi} />
          <R x={27} y={2} w={1} h={26} c={C.lo} />
          <R x={4} y={27} w={24} h={1} c={C.lo} />
          <R x={7} y={5} w={18} h={6} c={C.dk} />
          <R x={8} y={6} w={16} h={4} c={C.teal} />
          <R x={20} y={7} w={2} h={2} c={C.red} />
          {[13, 17, 21, 25].map((y) =>
            [6, 13, 20].map((x) => (
              <g key={`${x}-${y}`}>
                <R x={x} y={y} w={6} h={4} c={C.face} />
                <R x={x} y={y} w={6} h={1} c={C.hi} />
                <R x={x} y={y + 3} w={6} h={1} c={C.lo} />
                <R x={x} y={y} w={1} h={4} c={C.hi} />
                <R x={x + 5} y={y} w={1} h={4} c={C.lo} />
              </g>
            ))
          )}
        </g>
      );
    case "command-prompt":
      return (
        <g>
          <R x={3} y={4} w={26} h={22} c={C.k} />
          <R x={3} y={4} w={26} h={4} c={C.blueD} />
          <R x={3} y={4} w={26} h={1} c={C.hi} />
          <R x={5} y={5} w={2} h={2} c={C.hi} />
          <R x={8} y={6} w={4} h={1} c={C.hi} />
          <R x={3} y={8} w={26} h={18} c={C.k} />
          <R x={5} y={11} w={1} h={8} c={C.hi} />
          <R x={6} y={11} w={5} h={1} c={C.hi} />
          <R x={6} y={14} w={3} h={1} c={C.hi} />
          <R x={6} y={17} w={5} h={1} c={C.hi} />
          <R x={12} y={11} w={2} h={3} c={C.hi} />
          <R x={12} y={23} w={6} h={3} c={C.dk} />
          <R x={10} y={26} w={10} h={2} c={C.face} />
        </g>
      );
    case "minesweeper":
      return (
        <g>
          <R x={4} y={3} w={24} h={26} c={C.k} />
          <R x={3} y={2} w={24} h={26} c={C.face} />
          <R x={3} y={2} w={24} h={1} c={C.hi} />
          <R x={3} y={2} w={1} h={26} c={C.hi} />
          <R x={26} y={2} w={1} h={26} c={C.lo} />
          <R x={3} y={27} w={24} h={1} c={C.lo} />
          <R x={20} y={4} w={6} h={5} c={C.dk} />
          <R x={21} y={5} w={4} h={3} c={C.grn} />
          <R x={22} y={6} w={1} h={1} c={C.red} />
          <P d="15,8 19,12 15,16 11,12" c={C.k} />
          <R x={14} y={11} w={3} h={3} c={C.k} />
          <R x={11} y={12} w={1} h={1} c={C.k} />
          <R x={20} y={12} w={1} h={1} c={C.k} />
          <R x={15} y={8} w={1} h={1} c={C.k} />
          <R x={15} y={16} w={1} h={1} c={C.k} />
        </g>
      );
    case "game-house":
      return (
        <g>
          <P d="5,15 16,4 27,15" c={C.red} />
          <R x={5} y={15} w={22} h={2} c={C.redD} />
          <R x={7} y={17} w={18} h={12} c={C.yl} />
          <R x={7} y={17} w={18} h={1} c={C.ylL} />
          <R x={7} y={28} w={18} h={1} c={C.ylD} />
          <R x={14} y={21} w={4} h={8} c={C.redD} />
          <R x={9} y={20} w={3} h={3} c={C.blue} />
          <R x={18} y={20} w={3} h={3} c={C.blue} />
        </g>
      );
    case "internet-explorer":
      return (
        <g>
          <R x={8} y={5} w={16} h={2} c={C.k} />
          <R x={6} y={7} w={20} h={2} c={C.k} />
          <R x={5} y={9} w={22} h={14} c={C.k} />
          <R x={6} y={23} w={20} h={2} c={C.k} />
          <R x={8} y={25} w={16} h={2} c={C.k} />
          <R x={8} y={7} w={16} h={2} c={C.blue} />
          <R x={6} y={9} w={20} h={14} c={C.blue} />
          <R x={8} y={23} w={16} h={2} c={C.blue} />
          <R x={11} y={11} w={10} h={2} c={C.hi} />
          <R x={11} y={13} w={1} h={9} c={C.hi} />
          <R x={11} y={19} w={10} h={2} c={C.hi} />
          <R x={13} y={15} w={8} h={1} c={C.hi} />
          <R x={13} y={17} w={8} h={1} c={C.hi} />
        </g>
      );
    case "network-places":
      return (
        <g>
          <R x={2} y={5} w={13} h={11} c={C.k} />
          <R x={3} y={6} w={11} h={9} c={C.blue} />
          <R x={5} y={17} w={3} h={2} c={C.dk} />
          <R x={3} y={19} w={7} h={2} c={C.face} />
          <R x={17} y={5} w={13} h={11} c={C.k} />
          <R x={18} y={6} w={11} h={9} c={C.blue} />
          <R x={20} y={17} w={3} h={2} c={C.dk} />
          <R x={18} y={19} w={7} h={2} c={C.face} />
          <R x={15} y={9} w={2} h={3} c={C.k} />
          <R x={13} y={12} w={6} h={1} c={C.k} />
        </g>
      );
    case "control-panel":
      return (
        <g>
          <R x={3} y={3} w={26} h={22} c={C.k} />
          <R x={4} y={4} w={24} h={20} c={C.face} />
          <R x={4} y={4} w={24} h={5} c={C.blue} />
          <R x={4} y={4} w={24} h={1} c={C.blueL} />
          <R x={4} y={4} w={1} h={20} c={C.hi} />
          <R x={27} y={4} w={1} h={20} c={C.lo} />
          <R x={4} y={23} w={24} h={1} c={C.lo} />
          <R x={13} y={11} w={6} h={12} c={C.dk} />
          <R x={10} y={14} w={12} h={6} c={C.dk} />
          <R x={15} y={13} w={2} h={8} c={C.face} />
          <R x={12} y={16} w={8} h={2} c={C.face} />
        </g>
      );
    case "gas-pms":
      return (
        <g>
          <R x={6} y={6} w={20} h={20} c={C.k} />
          <R x={5} y={5} w={20} h={20} c={C.face} />
          <R x={5} y={5} w={20} h={1} c={C.hi} />
          <R x={5} y={5} w={1} h={20} c={C.hi} />
          <R x={24} y={5} w={1} h={20} c={C.lo} />
          <R x={5} y={24} w={20} h={1} c={C.lo} />
          <R x={8} y={8} w={14} h={14} c={C.k} />
          <R x={9} y={9} w={12} h={12} c={C.hi} />
          <P d="15,10 16,10 15,17" c={C.red} />
          <R x={14} y={16} w={3} h={3} c={C.dk} />
          <R x={12} y={19} w={7} h={1} c={C.lo} />
        </g>
      );
    case "document-center":
      return (
        <g>
          <R x={8} y={3} w={20} h={4} c={C.ylD} />
          <R x={7} y={6} w={20} h={4} c={C.yl} />
          <R x={9} y={9} w={20} h={4} c={C.blueD} />
          <R x={8} y={12} w={20} h={4} c={C.blue} />
          <R x={5} y={15} w={20} h={13} c={C.hi} />
          <R x={24} y={15} w={1} h={13} c={C.lo} />
          <R x={5} y={27} w={20} h={1} c={C.lo} />
          <R x={8} y={18} w={14} h={1} c={C.blueL} />
          <R x={8} y={21} w={14} h={1} c={C.blueL} />
          <R x={8} y={24} w={9} h={1} c={C.blueL} />
        </g>
      );
    case "production":
      return (
        <g>
          <P d="2,20 8,10 12,16 17,8 22,16 27,9 30,20" c={C.dk} />
          <R x={2} y={20} w={28} h={7} c={C.face} />
          <R x={2} y={26} w={28} h={1} c={C.lo} />
          <R x={6} y={22} w={4} h={5} c={C.k} />
          <R x={13} y={22} w={4} h={5} c={C.k} />
          <R x={21} y={22} w={4} h={5} c={C.k} />
          <R x={12} y={5} w={4} h={8} c={C.dk} />
          <R x={12} y={4} w={4} h={1} c={C.k} />
          <R x={24} y={6} w={3} h={7} c={C.dk} />
        </g>
      );
    case "quality":
      return (
        <g>
          <P d="8,5 24,5 24,15 16,27 8,15" c={C.blue} />
          <P d="10,6 22,6 22,14 16,24 10,14" c={C.blueL} />
          <P d="12,14 15,17 20,10 20,12 15,19 12,16" c={C.hi} />
        </g>
      );
    case "engineering":
      return (
        <g>
          <R x={13} y={6} w={6} h={20} c={C.dk} />
          <R x={6} y={13} w={20} h={6} c={C.dk} />
          <R x={10} y={10} w={12} h={12} c={C.face} />
          <R x={9} y={11} w={2} h={10} c={C.dk} />
          <R x={21} y={11} w={2} h={10} c={C.dk} />
          <R x={11} y={9} w={10} h={2} c={C.dk} />
          <R x={11} y={21} w={10} h={2} c={C.dk} />
          <R x={13} y={12} w={6} h={8} c={C.k} />
          <R x={15} y={14} w={2} h={4} c={C.face} />
        </g>
      );
    case "maintenance":
      return (
        <g>
          <R x={8} y={4} w={10} h={5} c={C.face} />
          <R x={8} y={4} w={10} h={1} c={C.hi} />
          <R x={8} y={8} w={10} h={1} c={C.lo} />
          <R x={10} y={5} w={1} h={3} c={C.dk} />
          <R x={15} y={5} w={1} h={3} c={C.dk} />
          <R x={11} y={9} w={5} h={14} c={C.face} />
          <R x={11} y={9} w={5} h={1} c={C.hi} />
          <R x={11} y={22} w={5} h={1} c={C.lo} />
          <R x={12} y={9} w={1} h={14} c={C.dk} />
          <R x={8} y={23} w={10} h={4} c={C.face} />
          <R x={8} y={23} w={10} h={1} c={C.hi} />
          <R x={8} y={26} w={10} h={1} c={C.lo} />
          <R x={10} y={24} w={1} h={2} c={C.dk} />
          <R x={15} y={24} w={1} h={2} c={C.dk} />
        </g>
      );
    case "folder":
      return (
        <g>
          <R x={5} y={6} w={11} h={4} c={C.ylD} />
          <R x={4} y={9} w={24} h={4} c={C.ylD} />
          <R x={4} y={9} w={24} h={1} c={C.hi} />
          <R x={4} y={13} w={24} h={14} c={C.yl} />
          <R x={4} y={13} w={24} h={1} c={C.ylL} />
          <R x={26} y={13} w={2} h={14} c={C.ylD} />
          <R x={4} y={26} w={24} h={1} c={C.ylD} />
        </g>
      );
    case "folder-open":
      return (
        <g>
          <R x={5} y={6} w={11} h={4} c={C.ylD} />
          <R x={4} y={9} w={24} h={4} c={C.ylD} />
          <R x={4} y={9} w={24} h={1} c={C.hi} />
          <R x={4} y={13} w={24} h={15} c={C.yl} />
          <R x={4} y={13} w={24} h={1} c={C.ylL} />
          <R x={26} y={13} w={2} h={15} c={C.ylD} />
          <R x={4} y={27} w={24} h={1} c={C.ylD} />
          <R x={6} y={16} w={2} h={2} c={C.dk} />
        </g>
      );
    case "file":
      return (
        <g>
          <R x={5} y={4} w={22} h={26} c={C.k} />
          <P d="5,4 20,4 25,9 25,29 5,29" c={C.hi} />
          <R x={21} y={5} w={1} h={1} c={C.k} />
          <R x={22} y={6} w={1} h={1} c={C.k} />
          <R x={23} y={7} w={1} h={1} c={C.k} />
          <R x={24} y={8} w={1} h={1} c={C.k} />
          <R x={25} y={9} w={1} h={20} c={C.lo} />
          <R x={5} y={29} w={20} h={1} c={C.lo} />
          <R x={8} y={12} w={13} h={1} c={C.blueL} />
          <R x={8} y={15} w={13} h={1} c={C.blueL} />
          <R x={8} y={18} w={9} h={1} c={C.blueL} />
        </g>
      );
    case "drive":
      return (
        <g>
          <R x={3} y={4} w={26} h={22} c={C.k} />
          <R x={3} y={4} w={26} h={22} c={C.face} />
          <R x={3} y={4} w={26} h={1} c={C.hi} />
          <R x={3} y={4} w={1} h={22} c={C.hi} />
          <R x={28} y={4} w={1} h={22} c={C.lo} />
          <R x={3} y={25} w={26} h={1} c={C.lo} />
          <R x={23} y={7} w={3} h={3} c={C.grn} />
          <R x={5} y={11} w={22} h={1} c={C.lo} />
          <R x={5} y={14} w={22} h={1} c={C.lo} />
          <R x={5} y={17} w={22} h={1} c={C.lo} />
          <R x={7} y={20} w={18} h={3} c={C.sky} />
          <R x={9} y={21} w={6} h={1} c={C.hi} />
        </g>
      );
    case "shared-documents":
      return (
        <g>
          <R x={12} y={3} w={11} h={4} c={C.ylD} />
          <R x={11} y={6} w={19} h={4} c={C.ylD} />
          <R x={11} y={10} w={19} h={12} c={C.yl} />
          <R x={11} y={10} w={19} h={1} c={C.ylL} />
          <R x={29} y={10} w={1} h={12} c={C.ylD} />
          <R x={11} y={21} w={19} h={1} c={C.ylD} />
          <R x={4} y={11} w={11} h={4} c={C.ylD} />
          <R x={3} y={14} w={22} h={4} c={C.ylD} />
          <R x={3} y={18} w={22} h={10} c={C.yl} />
          <R x={3} y={18} w={22} h={1} c={C.ylL} />
          <R x={24} y={18} w={1} h={10} c={C.ylD} />
          <R x={3} y={27} w={22} h={1} c={C.ylD} />
        </g>
      );
    case "windows-flag": {
      const bands: [number, number, number][] = [
        [2, 15, 26],
        [4, 14, 28],
        [6, 13, 29],
        [8, 12, 27],
        [10, 11, 25],
        [14, 12, 27],
        [16, 13, 29],
        [18, 14, 28],
        [20, 15, 26],
        [22, 14, 25],
      ];
      return (
        <g>
          <R x={3} y={1} w={23} h={1} c={C.k} />
          {bands.map(([y, mid, right], i) => (
            <g key={y}>
              <R x={3} y={y} w={right - 3} h={2} c={C.k} />
              <R x={4} y={y} w={mid - 4} h={2} c={i < 5 ? C.red : C.blue} />
              <R x={mid} y={y} w={1} h={2} c={C.k} />
              <R x={mid + 1} y={y} w={right - mid - 2} h={2} c={i < 5 ? C.grn : C.yl} />
            </g>
          ))}
          <R x={3} y={12} w={22} h={1} c={C.k} />
          <R x={3} y={13} w={23} h={1} c={C.k} />
          <R x={3} y={24} w={22} h={1} c={C.k} />
        </g>
      );
    }
    case "run":
      return (
        <g>
          <R x={3} y={3} w={26} h={21} c={C.k} />
          <R x={4} y={4} w={24} h={19} c={C.face} />
          <R x={4} y={4} w={24} h={4} c={C.blue} />
          <R x={4} y={4} w={24} h={1} c={C.blueL} />
          <P d="7,13 14,13 11,10" c={C.grnD} />
          <P d="7,13 14,13 11,16" c={C.grn} />
          <R x={14} y={12} w={9} h={2} c={C.grn} />
        </g>
      );
    case "help":
      return (
        <g>
          <R x={6} y={5} w={20} h={22} c={C.k} />
          <R x={5} y={4} w={20} h={22} c={C.blue} />
          <R x={5} y={4} w={20} h={1} c={C.blueL} />
          <R x={5} y={4} w={1} h={22} c={C.blueL} />
          <R x={24} y={4} w={1} h={22} c={C.blueD} />
          <R x={5} y={25} w={20} h={1} c={C.blueD} />
          <R x={10} y={8} w={11} h={3} c={C.hi} />
          <R x={9} y={11} w={2} h={4} c={C.hi} />
          <R x={10} y={14} w={11} h={2} c={C.hi} />
          <R x={19} y={16} w={3} h={3} c={C.hi} />
          <R x={10} y={19} w={2} h={3} c={C.hi} />
          <R x={14} y={21} w={3} h={2} c={C.hi} />
        </g>
      );
    case "search":
      return (
        <g>
          <R x={5} y={5} w={17} h={17} c={C.k} />
          <R x={7} y={7} w={13} h={13} c={C.sky} />
          <R x={7} y={7} w={13} h={1} c={C.blueL} />
          <R x={20} y={20} w={3} h={4} c={C.dk} />
          <R x={22} y={23} w={3} h={3} c={C.k} />
        </g>
      );
    case "shutdown":
      return (
        <g>
          <R x={8} y={6} w={16} h={20} c={C.k} />
          <R x={7} y={5} w={16} h={20} c={C.red} />
          <R x={7} y={5} w={16} h={1} c={C.redD} />
          <R x={7} y={5} w={1} h={20} c={C.redD} />
          <R x={22} y={5} w={1} h={20} c={C.redD} />
          <R x={7} y={24} w={16} h={1} c={C.redD} />
          <R x={14} y={8} w={3} h={9} c={C.hi} />
          <R x={13} y={11} w={1} h={2} c={C.hi} />
          <R x={17} y={11} w={1} h={2} c={C.hi} />
          <R x={12} y={13} w={1} h={2} c={C.hi} />
          <R x={18} y={13} w={1} h={2} c={C.hi} />
          <R x={11} y={15} w={1} h={2} c={C.hi} />
          <R x={19} y={15} w={1} h={2} c={C.hi} />
        </g>
      );
    case "user":
      return (
        <g>
          <R x={5} y={5} w={22} h={22} c={C.k} />
          <R x={4} y={4} w={22} h={22} c={C.blueD} />
          <R x={5} y={5} w={20} h={20} c={C.blue} />
          <R x={5} y={5} w={20} h={1} c={C.blueL} />
          <R x={5} y={5} w={1} h={20} c={C.blueL} />
          <R x={24} y={5} w={1} h={20} c={C.blueD} />
          <R x={5} y={24} w={20} h={1} c={C.blueD} />
          <R x={12} y={9} w={8} h={8} c={C.face} />
          <R x={11} y={12} w={10} h={4} c={C.face} />
          <R x={12} y={9} w={8} h={1} c={C.hi} />
          <R x={9} y={17} w={14} h={1} c={C.face} />
          <R x={8} y={18} w={16} h={1} c={C.face} />
          <R x={7} y={19} w={18} h={1} c={C.face} />
          <R x={7} y={20} w={18} h={3} c={C.face} />
          <R x={7} y={22} w={18} h={1} c={C.dk} />
          <R x={11} y={10} w={2} h={2} c={C.dk} />
          <R x={19} y={10} w={2} h={2} c={C.dk} />
        </g>
      );
    default:
      return null;
  }
}

export function WinXpIcon({
  name,
  size = 32,
  className,
  title,
}: {
  name: WinXpIconName;
  size?: number;
  className?: string;
  title?: string;
}): ReactNode {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      shapeRendering="crispEdges"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      aria-label={title}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {Icon({ name })}
    </svg>
  );
}

export default WinXpIcon;
