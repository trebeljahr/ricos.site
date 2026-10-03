import type { GateType } from "../../lib/computer/logic";

export function GateSymbol({ type }: { type: GateType }) {
  const gate = type === "nand" ? "and" : type === "nor" ? "or" : type === "xnor" ? "xor" : type;
  const bubble = type === "nand" || type === "nor" || type === "not" || type === "xnor";
  return (
    <svg
      viewBox="0 0 64 42"
      width="48"
      height="32"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {(["and", "or", "xor", "xnor", "not", "nand", "nor"] as GateType[]).includes(type) && (
        <>
          {gate === "and" && <path d="M13 5 H30 C50 5 50 37 30 37 H13 Z" />}
          {gate === "or" && <path d="M12 5 Q25 21 12 37 Q34 37 49 21 Q34 5 12 5 Z" />}
          {gate === "xor" && (
            <>
              <path d="M8 5 Q21 21 8 37" />
              <path d="M14 5 Q27 21 14 37 Q36 37 51 21 Q36 5 14 5 Z" />
            </>
          )}
          {gate === "not" && <path d="M13 5 V37 L48 21 Z" />}
          {bubble && <circle cx={gate === "not" ? 53 : 53} cy="21" r="4" />}
        </>
      )}
      {type === "switch" && (
        <>
          <path d="M8 21 H20 M42 21 H56 M20 21 L41 9" />
          <circle cx="20" cy="21" r="2" />
          <circle cx="42" cy="21" r="2" />
        </>
      )}
      {type === "pulse" && <path d="M5 29 H18 V12 H34 V29 H59" />}
      {type === "clock" && (
        <>
          <rect x="7" y="7" width="50" height="28" rx="3" />
          <path d="M12 26 H22 V15 H33 V26 H44 V15 H53" />
        </>
      )}
      {type === "lamp" && (
        <>
          <circle cx="32" cy="21" r="14" fill="#ad242c" stroke="#ff817b" />
          <circle cx="27" cy="15" r="5" fill="#ffd3c4" stroke="none" opacity=".85" />
        </>
      )}
      {(type === "input4" || type === "input8") && (
        <>
          <rect x="4" y="7" width="56" height="28" rx="4" />
          <text x="32" y="26" textAnchor="middle" stroke="none" fill="currentColor" fontSize="14" fontFamily="monospace">{type === "input4" ? "0101" : "10101010"}</text>
        </>
      )}
      {(type === "display4" || type === "display8") && (
        <>
          <rect x="4" y="5" width="56" height="32" rx="4" />
          <text x="32" y="27" textAnchor="middle" stroke="none" fill="currentColor" fontSize="19" fontFamily="monospace">{type === "display4" ? "15" : "255"}</text>
        </>
      )}
      {type === "dff" && (
        <>
          <rect x="9" y="4" width="46" height="34" rx="2" />
          <text
            x="32"
            y="26"
            textAnchor="middle"
            stroke="none"
            fill="currentColor"
            fontSize="16"
            fontWeight="700"
          >
            D
          </text>
          <path d="M9 28 L16 32 L9 36" />
        </>
      )}
      {(type === "nmos" || type === "pmos") && (
        <>
          <path d="M32 5 V14 M32 28 V37 M20 14 V28 M25 14 V28 M25 16 H38 V26 H25 M8 21 H20" />
          {type === "pmos" && <circle cx="22" cy="21" r="3" fill="#1a2440" />}
        </>
      )}
      {type === "high" && <path d="M32 5 V34 M20 13 H44 M25 20 H39 M29 27 H35" />}
      {type === "module" && (
        <>
          <rect x="10" y="5" width="44" height="32" rx="3" />
          <path d="M5 15 H10 M5 27 H10 M54 15 H59 M54 27 H59" />
        </>
      )}
      {type === "ground" && <path d="M32 5 V16 M16 16 H48 M21 23 H43 M27 30 H37" />}
      {type === "junction" && <path d="M8 10 H28 V21 H55 M8 32 H28 V21 M28 21 H29" />}
    </svg>
  );
}
