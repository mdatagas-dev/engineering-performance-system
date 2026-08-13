"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

function norm(v: number): string {
  if (!Number.isFinite(v)) return "Error";
  return String(Math.round(v * 1e10) / 1e10);
}

function apply(a: number, b: number, op: string): number {
  switch (op) {
    case "+": return a + b;
    case "−": case "-": return a - b;
    case "×": case "*": return a * b;
    case "÷": case "/": return a / b;
    default: return b;
  }
}

type BtnProps = { label: string; wide?: boolean; op?: boolean; onClick: () => void };

function Btn({ label, wide, op, onClick }: BtnProps): ReactNode {
  return (
    <button
      type="button"
      className={`win95-calc__btn ${wide ? "win95-calc__btn--wide" : ""} ${op ? "win95-calc__btn--op" : ""}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export function CalculatorApp(): ReactNode {
  const [display, setDisplay] = useState("0");
  const [acc, setAcc] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [fresh, setFresh] = useState(true);
  const [menu, setMenu] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    rootRef.current?.focus();
  }, []);

  const digit = (d: string) => {
    setDisplay((cur) => (fresh || cur === "0" ? d : cur + d));
    setFresh(false);
  };

  const dot = () => {
    setDisplay((cur) => {
      if (fresh) return "0.";
      return cur.includes(".") ? cur : cur + ".";
    });
    setFresh(false);
  };

  const clearAll = () => {
    setDisplay("0");
    setAcc(null);
    setOp(null);
    setFresh(true);
  };

  const clearEntry = () => {
    setDisplay("0");
    setFresh(true);
  };

  const backspace = () => {
    if (fresh) return;
    setDisplay((cur) => (cur.length <= 1 ? "0" : cur.slice(0, -1)));
  };

  const negate = () => {
    if (fresh) return;
    setDisplay((cur) => (cur.startsWith("-") ? cur.slice(1) : cur === "0" ? cur : "-" + cur));
  };

  const sqrt = () => {
    const v = parseFloat(display);
    if (v < 0) { setDisplay("Error"); setAcc(null); setOp(null); setFresh(true); return; }
    setDisplay(norm(Math.sqrt(v)));
    setFresh(true);
  };

  const percent = () => {
    setDisplay(norm(parseFloat(display) / 100));
    setFresh(false);
  };

  const setOperator = (o: string) => {
    if (op && !fresh && acc !== null) {
      const r = apply(acc, parseFloat(display), op);
      if (!Number.isFinite(r)) { setDisplay("Error"); setAcc(null); setOp(null); setFresh(true); return; }
      setAcc(r);
      setDisplay(norm(r));
    } else {
      setAcc(parseFloat(display));
    }
    setOp(o);
    setFresh(true);
  };

  const equals = () => {
    if (op === null || acc === null) return;
    const r = apply(acc, parseFloat(display), op);
    if (!Number.isFinite(r)) {
      setDisplay("Error");
      setAcc(null);
      setOp(null);
      setFresh(true);
      return;
    }
    setDisplay(norm(r));
    setAcc(null);
    setOp(null);
    setFresh(true);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (/^[0-9]$/.test(e.key)) digit(e.key);
    else if (e.key === ".") dot();
    else if (e.key === "+") setOperator("+");
    else if (e.key === "-") setOperator("−");
    else if (e.key === "*") setOperator("×");
    else if (e.key === "/") { e.preventDefault(); setOperator("÷"); }
    else if (e.key === "%") percent();
    else if (e.key === "Enter") { e.preventDefault(); equals(); }
    else if (e.key === "Escape") clearAll();
    else if (e.key === "Backspace") { e.preventDefault(); backspace(); }
  };

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      className="win95-app win95-calc"
      onKeyDown={onKey}
      onMouseDown={() => setMenu(null)}
    >
      <div className="win95-menubar" role="menubar">
        <MenuButton label="Edit" open={menu === "edit"} onToggle={() => setMenu(menu === "edit" ? null : "edit")}>
          <button
            type="button"
            className="win95-menu__item"
            onClick={() => {
              setMenu(null);
              if (display !== "Error" && typeof navigator !== "undefined") {
                navigator.clipboard?.writeText(display).catch(() => undefined);
              }
            }}
          >
            Copy
          </button>
          <button
            type="button"
            className="win95-menu__item win95-menu__item--disabled"
            disabled
          >
            Paste
          </button>
        </MenuButton>
      </div>
      <div className="win95-calc__display">{display}</div>
      <div className="win95-calc__grid">
        <Btn label="C" onClick={clearAll} />
        <Btn label="CE" onClick={clearEntry} />
        <Btn label="⌫" onClick={backspace} />
        <Btn label="√" op onClick={sqrt} />
        <Btn label="7" onClick={() => digit("7")} />
        <Btn label="8" onClick={() => digit("8")} />
        <Btn label="9" onClick={() => digit("9")} />
        <Btn label="÷" op onClick={() => setOperator("÷")} />
        <Btn label="4" onClick={() => digit("4")} />
        <Btn label="5" onClick={() => digit("5")} />
        <Btn label="6" onClick={() => digit("6")} />
        <Btn label="×" op onClick={() => setOperator("×")} />
        <Btn label="1" onClick={() => digit("1")} />
        <Btn label="2" onClick={() => digit("2")} />
        <Btn label="3" onClick={() => digit("3")} />
        <Btn label="−" op onClick={() => setOperator("−")} />
        <Btn label="0" onClick={() => digit("0")} />
        <Btn label="." onClick={dot} />
        <Btn label="±" onClick={negate} />
        <Btn label="+" op onClick={() => setOperator("+")} />
        <Btn label="%" onClick={percent} />
        <Btn label="=" wide op onClick={equals} />
      </div>
    </div>
  );
}

function MenuButton({ label, open, onToggle, children }: { label: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <div className="win95-menubar__wrap" onMouseDown={(e) => e.stopPropagation()}>
      <button
        type="button"
        className={`win95-menubar__item ${open ? "win95-menubar__item--open" : ""}`}
        onClick={onToggle}
      >
        {label}
      </button>
      {open && <div className="win95-menu">{children}</div>}
    </div>
  );
}
