"use client";

import type { ReactNode } from "react";

export type Win95IconName =
  | "my-computer"
  | "my-documents"
  | "notepad"
  | "calculator"
  | "minesweeper"
  | "command-prompt"
  | "system-info"
  | "recycle-bin"
  | "about"
  | "access-terminal"
  | "folder"
  | "folder-open"
  | "file"
  | "drive"
  | "computer"
  | "key"
  | "login"
  | "wrench";

const C = {
  face: "#c0c0c0",
  hi: "#dfdfdf",
  lo: "#808080",
  dk: "#404040",
  w: "#ffffff",
  k: "#000000",
  yl: "#ffd700",
  yd: "#e8b800",
  navy: "#0000a8",
  sky: "#1084d0",
  sky2: "#7db9ff",
  grn: "#008000",
  red: "#ff0000",
  gold: "#ffcc00",
} as const;

const R = ({ x, y, w, h, c }: { x: number; y: number; w: number; h: number; c: string }) => (
  <rect x={x} y={y} width={w} height={h} fill={c} />
);

const P = ({ d, c }: { d: string; c: string }) => <polygon points={d} fill={c} />;

function Icon({ name }: { name: Win95IconName }) {
  switch (name) {
    case "my-computer":
      return (
        <g>
          <R x={3} y={3} w={28} h={28} c={C.k} />
          <R x={2} y={2} w={28} h={22} c={C.face} />
          <R x={2} y={2} w={28} h={1} c={C.hi} />
          <R x={2} y={2} w={1} h={22} c={C.hi} />
          <R x={29} y={2} w={1} h={22} c={C.lo} />
          <R x={2} y={23} w={28} h={1} c={C.lo} />
          <R x={5} y={5} w={22} h={15} c={C.dk} />
          <R x={7} y={7} w={18} h={11} c={C.sky} />
          <R x={9} y={9} w={3} h={1} c={C.w} />
          <R x={10} y={8} w={1} h={1} c={C.w} />
          <R x={15} y={9} w={3} h={1} c={C.w} />
          <R x={13} y={24} w={5} h={3} c={C.dk} />
          <R x={12} y={26} w={7} h={1} c={C.lo} />
          <R x={3} y={27} w={25} h={3} c={C.k} />
          <R x={5} y={28} w={1} h={1} c={C.face} />
          <R x={8} y={28} w={1} h={1} c={C.face} />
          <R x={11} y={28} w={1} h={1} c={C.face} />
          <R x={14} y={28} w={1} h={1} c={C.face} />
          <R x={17} y={28} w={1} h={1} c={C.face} />
          <R x={20} y={28} w={1} h={1} c={C.face} />
          <R x={23} y={28} w={1} h={1} c={C.face} />
        </g>
      );
    case "my-documents":
      return (
        <g>
          <R x={6} y={6} w={24} h={25} c={C.k} />
          <R x={5} y={5} w={20} h={25} c={C.w} />
          <R x={24} y={5} w={1} h={25} c={C.lo} />
          <R x={5} y={29} w={20} h={1} c={C.lo} />
          <R x={8} y={10} w={14} h={1} c={C.sky2} />
          <R x={8} y={12} w={14} h={1} c={C.sky2} />
          <R x={8} y={14} w={10} h={1} c={C.sky2} />
          <R x={8} y={14} w={12} h={4} c={C.yd} />
          <R x={8} y={18} w={21} h={2} c={C.yd} />
          <R x={8} y={20} w={21} h={5} c={C.yl} />
          <R x={8} y={20} w={21} h={1} c={C.hi} />
          <R x={28} y={20} w={1} h={5} c={C.lo} />
          <R x={8} y={24} w={21} h={1} c={C.yd} />
        </g>
      );
    case "notepad":
      return (
        <g>
          <R x={5} y={4} w={26} h={27} c={C.k} />
          <R x={4} y={3} w={23} h={27} c={C.w} />
          <P d="22,3 26,3 26,7 22,7" c={C.w} />
          <R x={26} y={3} w={1} h={1} c={C.k} />
          <R x={25} y={4} w={1} h={1} c={C.k} />
          <R x={24} y={5} w={1} h={1} c={C.k} />
          <R x={23} y={6} w={1} h={1} c={C.k} />
          <R x={22} y={7} w={1} h={1} c={C.k} />
          <R x={26} y={3} w={1} h={27} c={C.lo} />
          <R x={7} y={10} w={16} h={1} c={C.sky2} />
          <R x={7} y={13} w={16} h={1} c={C.sky2} />
          <R x={7} y={16} w={16} h={1} c={C.sky2} />
          <R x={7} y={19} w={11} h={1} c={C.sky2} />
          <R x={7} y={22} w={7} h={1} c={C.sky2} />
          <R x={4} y={29} w={23} h={1} c={C.lo} />
          <R x={28} y={8} w={2} h={2} c={C.red} />
          <R x={28} y={10} w={2} h={8} c={C.face} />
          <R x={28} y={18} w={2} h={2} c={C.k} />
          <R x={28} y={11} w={1} h={3} c={C.hi} />
        </g>
      );
    case "calculator":
      return (
        <g>
          <R x={5} y={4} w={25} h={26} c={C.k} />
          <R x={4} y={3} w={25} h={26} c={C.face} />
          <R x={4} y={3} w={25} h={1} c={C.hi} />
          <R x={4} y={3} w={1} h={26} c={C.hi} />
          <R x={28} y={3} w={1} h={26} c={C.lo} />
          <R x={4} y={28} w={25} h={1} c={C.lo} />
          <R x={7} y={6} w={19} h={8} c={C.dk} />
          <R x={8} y={7} w={17} h={6} c={C.grn} />
          <R x={22} y={8} w={2} h={4} c={C.red} />
          <R x={6} y={16} w={5} h={4} c={C.face} />
          <R x={6} y={16} w={5} h={1} c={C.hi} />
          <R x={6} y={19} w={5} h={1} c={C.lo} />
          <R x={12} y={16} w={5} h={4} c={C.face} />
          <R x={12} y={16} w={5} h={1} c={C.hi} />
          <R x={12} y={19} w={5} h={1} c={C.lo} />
          <R x={18} y={16} w={5} h={4} c={C.face} />
          <R x={18} y={16} w={5} h={1} c={C.hi} />
          <R x={18} y={19} w={5} h={1} c={C.lo} />
          <R x={24} y={16} w={5} h={4} c={C.face} />
          <R x={24} y={16} w={5} h={1} c={C.hi} />
          <R x={24} y={19} w={5} h={1} c={C.lo} />
          <R x={6} y={21} w={5} h={4} c={C.face} />
          <R x={6} y={21} w={5} h={1} c={C.hi} />
          <R x={6} y={24} w={5} h={1} c={C.lo} />
          <R x={12} y={21} w={5} h={4} c={C.face} />
          <R x={12} y={21} w={5} h={1} c={C.hi} />
          <R x={12} y={24} w={5} h={1} c={C.lo} />
          <R x={18} y={21} w={5} h={4} c={C.face} />
          <R x={18} y={21} w={5} h={1} c={C.hi} />
          <R x={18} y={24} w={5} h={1} c={C.lo} />
          <R x={24} y={21} w={5} h={4} c={C.face} />
          <R x={24} y={21} w={5} h={1} c={C.hi} />
          <R x={24} y={24} w={5} h={1} c={C.lo} />
          <R x={6} y={25} w={5} h={4} c={C.face} />
          <R x={6} y={25} w={5} h={1} c={C.hi} />
          <R x={6} y={28} w={5} h={1} c={C.lo} />
          <R x={12} y={25} w={5} h={4} c={C.face} />
          <R x={12} y={25} w={5} h={1} c={C.hi} />
          <R x={12} y={28} w={5} h={1} c={C.lo} />
          <R x={18} y={25} w={5} h={4} c={C.face} />
          <R x={18} y={25} w={5} h={1} c={C.hi} />
          <R x={18} y={28} w={5} h={1} c={C.lo} />
          <R x={24} y={25} w={5} h={4} c={C.face} />
          <R x={24} y={25} w={5} h={1} c={C.hi} />
          <R x={24} y={28} w={5} h={1} c={C.lo} />
        </g>
      );
    case "minesweeper":
      return (
        <g>
          <R x={4} y={3} w={27} h={27} c={C.k} />
          <R x={3} y={2} w={27} h={27} c={C.face} />
          <R x={3} y={2} w={27} h={1} c={C.hi} />
          <R x={3} y={2} w={1} h={27} c={C.hi} />
          <R x={29} y={2} w={1} h={27} c={C.lo} />
          <R x={3} y={28} w={27} h={1} c={C.lo} />
          <R x={20} y={5} w={8} h={6} c={C.dk} />
          <R x={21} y={6} w={6} h={4} c={C.grn} />
          <R x={22} y={7} w={1} h={2} c={C.red} />
          <R x={24} y={7} w={1} h={2} c={C.red} />
          <R x={15} y={11} w={1} h={1} c={C.k} />
          <R x={16} y={10} w={1} h={1} c={C.k} />
          <R x={17} y={9} w={1} h={1} c={C.k} />
          <R x={18} y={8} w={1} h={1} c={C.k} />
          <R x={13} y={12} w={5} h={1} c={C.k} />
          <R x={12} y={13} w={7} h={1} c={C.k} />
          <R x={11} y={14} w={9} h={1} c={C.k} />
          <R x={11} y={15} w={9} h={1} c={C.k} />
          <R x={11} y={16} w={9} h={1} c={C.k} />
          <R x={12} y={17} w={7} h={1} c={C.k} />
          <R x={13} y={18} w={5} h={1} c={C.k} />
          <R x={13} y={13} w={2} h={1} c={C.w} />
          <R x={17} y={6} w={1} h={1} c={C.yl} />
          <R x={18} y={7} w={1} h={1} c={C.w} />
          <R x={16} y={8} w={1} h={1} c={C.yl} />
        </g>
      );
    case "command-prompt":
      return (
        <g>
          <R x={4} y={3} w={27} h={23} c={C.k} />
          <R x={3} y={2} w={27} h={4} c={C.navy} />
          <R x={3} y={2} w={27} h={1} c={C.hi} />
          <R x={3} y={5} w={27} h={1} c={C.lo} />
          <R x={5} y={3} w={1} h={3} c={C.w} />
          <R x={6} y={3} w={2} h={1} c={C.w} />
          <R x={6} y={5} w={2} h={1} c={C.w} />
          <R x={9} y={4} w={1} h={1} c={C.w} />
          <R x={3} y={6} w={27} h={20} c={C.k} />
          <R x={29} y={6} w={1} h={20} c={C.lo} />
          <R x={3} y={25} w={27} h={1} c={C.lo} />
          <R x={5} y={8} w={1} h={5} c={C.w} />
          <R x={6} y={8} w={3} h={1} c={C.w} />
          <R x={6} y={12} w={3} h={1} c={C.w} />
          <R x={10} y={8} w={1} h={1} c={C.w} />
          <R x={11} y={9} w={1} h={1} c={C.w} />
          <R x={12} y={10} w={1} h={1} c={C.w} />
          <R x={14} y={9} w={1} h={1} c={C.w} />
          <R x={14} y={11} w={1} h={1} c={C.w} />
          <R x={15} y={10} w={1} h={1} c={C.w} />
          <R x={17} y={8} w={1} h={5} c={C.w} />
        </g>
      );
    case "system-info":
      return (
        <g>
          <R x={5} y={5} w={20} h={20} c={C.k} />
          <R x={4} y={4} w={18} h={15} c={C.face} />
          <R x={4} y={4} w={18} h={1} c={C.hi} />
          <R x={4} y={4} w={1} h={15} c={C.hi} />
          <R x={21} y={4} w={1} h={15} c={C.lo} />
          <R x={4} y={18} w={18} h={1} c={C.lo} />
          <R x={6} y={6} w={14} h={11} c={C.dk} />
          <R x={7} y={7} w={12} h={9} c={C.sky} />
          <R x={7} y={7} w={12} h={2} c={C.navy} />
          <R x={9} y={10} w={2} h={4} c={C.w} />
          <R x={12} y={19} w={4} h={3} c={C.dk} />
          <R x={10} y={22} w={8} h={2} c={C.face} />
          <R x={10} y={22} w={8} h={1} c={C.hi} />
          <R x={19} y={11} w={5} h={4} c={C.face} />
          <R x={19} y={11} w={5} h={1} c={C.hi} />
          <R x={21} y={12} w={1} h={2} c={C.k} />
          <R x={20} y={15} w={1} h={1} c={C.face} />
          <R x={19} y={16} w={1} h={1} c={C.face} />
          <R x={18} y={17} w={1} h={1} c={C.face} />
          <R x={17} y={18} w={1} h={1} c={C.face} />
          <R x={16} y={19} w={1} h={1} c={C.face} />
          <R x={21} y={15} w={1} h={1} c={C.face} />
          <R x={20} y={16} w={1} h={1} c={C.face} />
          <R x={19} y={17} w={1} h={1} c={C.face} />
          <R x={18} y={18} w={1} h={1} c={C.face} />
          <R x={17} y={19} w={1} h={1} c={C.face} />
          <R x={16} y={20} w={1} h={1} c={C.k} />
        </g>
      );
    case "recycle-bin":
      return (
        <g>
          <R x={6} y={4} w={22} h={26} c={C.k} />
          <R x={15} y={3} w={2} h={1} c={C.face} />
          <R x={5} y={4} w={22} h={4} c={C.face} />
          <R x={5} y={4} w={22} h={1} c={C.hi} />
          <R x={5} y={7} w={22} h={1} c={C.lo} />
          <R x={14} y={5} w={4} h={1} c={C.dk} />
          <R x={6} y={8} w={3} h={21} c={C.w} />
          <R x={9} y={8} w={16} h={21} c={C.face} />
          <R x={24} y={8} w={2} h={21} c={C.lo} />
          <R x={6} y={28} w={20} h={1} c={C.lo} />
          <R x={15} y={15} w={3} h={1} c={C.grn} />
          <R x={16} y={16} w={1} h={1} c={C.grn} />
          <R x={14} y={20} w={3} h={1} c={C.grn} />
          <R x={15} y={19} w={1} h={1} c={C.grn} />
          <R x={19} y={17} w={1} h={1} c={C.grn} />
          <R x={19} y={18} w={1} h={1} c={C.grn} />
          <R x={19} y={19} w={1} h={1} c={C.grn} />
          <R x={20} y={18} w={1} h={1} c={C.grn} />
          <R x={21} y={18} w={1} h={1} c={C.grn} />
          <R x={22} y={18} w={1} h={1} c={C.grn} />
        </g>
      );
    case "about":
      return (
        <g>
          <R x={6} y={5} w={22} h={22} c={C.k} />
          <R x={5} y={4} w={22} h={22} c={C.navy} />
          <R x={5} y={4} w={22} h={1} c={C.hi} />
          <R x={5} y={4} w={1} h={22} c={C.hi} />
          <R x={26} y={4} w={1} h={22} c={C.lo} />
          <R x={5} y={25} w={22} h={1} c={C.lo} />
          <R x={9} y={9} w={9} h={1} c={C.w} />
          <R x={9} y={9} w={1} h={7} c={C.w} />
          <R x={9} y={15} w={7} h={1} c={C.w} />
          <R x={17} y={9} w={1} h={4} c={C.w} />
          <R x={13} y={12} w={5} h={1} c={C.w} />
        </g>
      );
    case "access-terminal":
      return (
        <g>
          <R x={6} y={5} w={22} h={26} c={C.k} />
          <R x={8} y={4} w={15} h={1} c={C.gold} />
          <R x={6} y={5} w={20} h={1} c={C.gold} />
          <R x={5} y={6} w={22} h={1} c={C.gold} />
          <R x={5} y={7} w={1} h={22} c={C.gold} />
          <R x={26} y={7} w={1} h={22} c={C.gold} />
          <R x={5} y={29} w={22} h={1} c={C.gold} />
          <R x={7} y={7} w={18} h={22} c={C.navy} />
          <R x={15} y={7} w={1} h={22} c={C.gold} />
          <R x={14} y={17} w={1} h={1} c={C.gold} />
          <R x={16} y={17} w={1} h={1} c={C.gold} />
          <R x={20} y={18} w={4} h={1} c={C.w} />
          <R x={20} y={22} w={4} h={1} c={C.gold} />
          <R x={20} y={19} w={1} h={3} c={C.gold} />
          <R x={23} y={19} w={1} h={3} c={C.gold} />
          <R x={21} y={23} w={2} h={5} c={C.gold} />
          <R x={21} y={27} w={2} h={2} c={C.gold} />
        </g>
      );
    case "folder":
      return (
        <g>
          <R x={5} y={5} w={24} h={20} c={C.k} />
          <R x={4} y={4} w={11} h={4} c={C.yd} />
          <R x={4} y={4} w={11} h={1} c={C.hi} />
          <R x={4} y={7} w={11} h={1} c={C.lo} />
          <R x={4} y={8} w={24} h={5} c={C.yd} />
          <R x={4} y={8} w={24} h={1} c={C.hi} />
          <R x={4} y={13} w={24} h={11} c={C.yl} />
          <R x={4} y={13} w={24} h={1} c={C.hi} />
          <R x={26} y={13} w={2} h={11} c={C.lo} />
          <R x={4} y={23} w={24} h={1} c={C.lo} />
        </g>
      );
    case "folder-open":
      return (
        <g>
          <R x={5} y={5} w={24} h={21} c={C.k} />
          <R x={4} y={4} w={12} h={4} c={C.yd} />
          <R x={4} y={4} w={12} h={1} c={C.hi} />
          <R x={4} y={7} w={12} h={1} c={C.lo} />
          <R x={4} y={8} w={24} h={8} c={C.yl} />
          <R x={4} y={8} w={24} h={1} c={C.hi} />
          <R x={4} y={16} w={24} h={9} c={C.yl} />
          <R x={4} y={16} w={24} h={1} c={C.hi} />
          <R x={26} y={16} w={2} h={9} c={C.lo} />
          <R x={4} y={24} w={24} h={1} c={C.lo} />
          <R x={6} y={15} w={2} h={2} c={C.dk} />
        </g>
      );
    case "file":
      return (
        <g>
          <R x={6} y={5} w={21} h={26} c={C.k} />
          <P d="5,4 20,4 25,9 25,29 5,29" c={C.w} />
          <P d="20,4 25,4 25,9" c={C.w} />
          <R x={21} y={5} w={1} h={1} c={C.k} />
          <R x={22} y={6} w={1} h={1} c={C.k} />
          <R x={23} y={7} w={1} h={1} c={C.k} />
          <R x={24} y={8} w={1} h={1} c={C.k} />
          <R x={24} y={9} w={1} h={20} c={C.lo} />
          <R x={5} y={29} w={19} h={1} c={C.lo} />
          <R x={8} y={12} w={13} h={1} c={C.sky2} />
          <R x={8} y={15} w={13} h={1} c={C.sky2} />
          <R x={8} y={18} w={9} h={1} c={C.sky2} />
        </g>
      );
    case "drive":
      return (
        <g>
          <R x={4} y={5} w={26} h={21} c={C.k} />
          <R x={3} y={4} w={26} h={22} c={C.face} />
          <R x={3} y={4} w={26} h={1} c={C.hi} />
          <R x={3} y={4} w={1} h={22} c={C.hi} />
          <R x={28} y={4} w={1} h={22} c={C.lo} />
          <R x={3} y={25} w={26} h={1} c={C.lo} />
          <R x={24} y={7} w={2} h={2} c={C.grn} />
          <R x={5} y={9} w={22} h={1} c={C.lo} />
          <R x={5} y={12} w={22} h={1} c={C.lo} />
          <R x={5} y={15} w={22} h={1} c={C.lo} />
          <R x={5} y={18} w={22} h={1} c={C.lo} />
          <R x={8} y={20} w={16} h={3} c={C.sky2} />
          <R x={10} y={21} w={4} h={1} c={C.w} />
          <R x={15} y={21} w={6} h={1} c={C.w} />
        </g>
      );
    case "computer":
      return (
        <g>
          <R x={6} y={4} w={21} h={21} c={C.k} />
          <R x={5} y={3} w={21} h={16} c={C.face} />
          <R x={5} y={3} w={21} h={1} c={C.hi} />
          <R x={5} y={3} w={1} h={16} c={C.hi} />
          <R x={25} y={3} w={1} h={16} c={C.lo} />
          <R x={5} y={18} w={21} h={1} c={C.lo} />
          <R x={7} y={5} w={17} h={12} c={C.dk} />
          <R x={8} y={6} w={15} h={10} c={C.sky} />
          <R x={8} y={6} w={15} h={2} c={C.navy} />
          <R x={10} y={9} w={2} h={3} c={C.w} />
          <R x={13} y={19} w={4} h={3} c={C.dk} />
          <R x={11} y={22} w={8} h={2} c={C.face} />
          <R x={11} y={22} w={8} h={1} c={C.hi} />
        </g>
      );
    case "key":
      return (
        <g>
          <R x={9} y={6} w={6} h={18} c={C.k} />
          <R x={8} y={5} w={6} h={1} c={C.w} />
          <R x={8} y={11} w={6} h={1} c={C.gold} />
          <R x={8} y={6} w={1} h={5} c={C.gold} />
          <R x={13} y={6} w={1} h={5} c={C.gold} />
          <R x={10} y={11} w={3} h={10} c={C.gold} />
          <R x={12} y={13} w={1} h={1} c={C.k} />
          <R x={12} y={15} w={1} h={1} c={C.k} />
          <R x={12} y={17} w={1} h={1} c={C.k} />
          <R x={10} y={21} w={3} h={1} c={C.gold} />
          <R x={11} y={22} w={1} h={1} c={C.gold} />
        </g>
      );
    case "login":
      return (
        <g>
          <R x={4} y={5} w={28} h={25} c={C.k} />
          <R x={18} y={4} w={13} h={1} c={C.gold} />
          <R x={18} y={29} w={13} h={1} c={C.gold} />
          <R x={18} y={4} w={1} h={26} c={C.gold} />
          <R x={30} y={4} w={1} h={26} c={C.gold} />
          <R x={19} y={5} w={11} h={24} c={C.navy} />
          <R x={20} y={16} w={1} h={1} c={C.gold} />
          <R x={4} y={13} w={9} h={2} c={C.w} />
          <R x={13} y={12} w={1} h={1} c={C.w} />
          <R x={13} y={13} w={2} h={1} c={C.w} />
          <R x={13} y={14} w={3} h={1} c={C.w} />
          <R x={13} y={15} w={2} h={1} c={C.w} />
          <R x={13} y={16} w={1} h={1} c={C.w} />
        </g>
      );
    case "wrench":
      return (
        <g>
          <R x={8} y={7} w={21} h={22} c={C.k} />
          <R x={7} y={6} w={1} h={1} c={C.face} />
          <R x={8} y={7} w={1} h={1} c={C.face} />
          <R x={9} y={8} w={1} h={1} c={C.face} />
          <R x={10} y={9} w={1} h={1} c={C.face} />
          <R x={11} y={10} w={1} h={1} c={C.face} />
          <R x={12} y={11} w={1} h={1} c={C.face} />
          <R x={13} y={12} w={1} h={1} c={C.face} />
          <R x={14} y={13} w={1} h={1} c={C.face} />
          <R x={15} y={14} w={1} h={1} c={C.face} />
          <R x={16} y={15} w={1} h={1} c={C.face} />
          <R x={17} y={16} w={1} h={1} c={C.face} />
          <R x={18} y={17} w={1} h={1} c={C.face} />
          <R x={19} y={18} w={1} h={1} c={C.face} />
          <R x={20} y={19} w={1} h={1} c={C.face} />
          <R x={8} y={6} w={1} h={1} c={C.lo} />
          <R x={9} y={7} w={1} h={1} c={C.lo} />
          <R x={10} y={8} w={1} h={1} c={C.lo} />
          <R x={11} y={9} w={1} h={1} c={C.lo} />
          <R x={12} y={10} w={1} h={1} c={C.lo} />
          <R x={13} y={11} w={1} h={1} c={C.lo} />
          <R x={14} y={12} w={1} h={1} c={C.lo} />
          <R x={15} y={13} w={1} h={1} c={C.lo} />
          <R x={16} y={14} w={1} h={1} c={C.lo} />
          <R x={17} y={15} w={1} h={1} c={C.lo} />
          <R x={18} y={16} w={1} h={1} c={C.lo} />
          <R x={19} y={17} w={1} h={1} c={C.lo} />
          <R x={20} y={18} w={1} h={1} c={C.lo} />
          <R x={21} y={19} w={1} h={1} c={C.lo} />
          <R x={20} y={20} w={8} h={8} c={C.face} />
          <R x={20} y={20} w={8} h={1} c={C.hi} />
          <R x={20} y={27} w={8} h={1} c={C.lo} />
          <R x={23} y={23} w={2} h={4} c={C.k} />
        </g>
      );
    default:
      return null;
  }
}

export function Win95Icon({ name, size = 32 }: { name: Win95IconName; size?: number }): ReactNode {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      {Icon({ name })}
    </svg>
  );
}

export default Win95Icon;
