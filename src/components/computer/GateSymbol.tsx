import { memo } from "react";
import { verifiedCircuitIdentity } from "../../lib/computer/recognition";
import type { Circuit, GateType } from "../../lib/computer/logic";

/** One renderer for primitive, registered, and verified reader-built identities. */
export const GateSymbol = memo(function GateSymbol({
  type: sourceType,
  circuit,
}: {
  type: GateType;
  circuit?: Circuit;
}) {
  const identity = sourceType === "module" ? verifiedCircuitIdentity(circuit) : null;
  const type = identity?.component.symbol ?? sourceType;
  const gate = type === "nand" ? "and" : type === "nor" ? "or" : type === "xnor" ? "xor" : type;
  const bubble = type === "nand" || type === "nor" || type === "not" || type === "xnor";
  return (
    <span
      role="img"
      aria-hidden={!identity?.yours || undefined}
      aria-label={`${identity?.component.label || type}${identity?.yours ? " — Yours, exhaustively verified" : ""}`}
      data-symbol={type}
      style={{ display: "inline-flex", position: "relative", verticalAlign: "middle" }}
    >
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
        {(["and", "or", "xor", "xnor", "not", "nand", "nor"] as string[]).includes(type) && (
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
        {type === "sevensegment" && <><path d="M23 5 H42 M45 8 V19 M45 24 V35 M23 38 H42 M19 24 V35 M19 8 V19 M23 21 H42" /></>}
        {type === "pulse" && <path d="M5 29 H18 V12 H34 V29 H59" />}
        {type === "clock" && (
          <>
            <rect x="7" y="7" width="50" height="28" rx="3" />
            <path d="M12 26 H22 V15 H33 V26 H44 V15 H53" />
          </>
        )}
        {type === "lamp" && (
          <>
            <path d="M5 21 H17 M47 21 H59" />
            <circle cx="32" cy="21" r="15" />
            <path d="M21 10 L43 32 M43 10 L21 32" />
          </>
        )}
        {(type === "input4" || type === "input8" || type === "input14") && (
          <>
            <rect x="4" y="7" width="56" height="28" rx="4" />
            <text
              x="32"
              y="26"
              textAnchor="middle"
              stroke="none"
              fill="currentColor"
              fontSize="14"
              fontFamily="monospace"
            >
              {type === "input4" ? "0101" : "10101010"}
            </text>
          </>
        )}
        {(type === "display4" || type === "display8") && (
          <>
            <rect x="4" y="5" width="56" height="32" rx="4" />
            <text
              x="32"
              y="27"
              textAnchor="middle"
              stroke="none"
              fill="currentColor"
              fontSize="19"
              fontFamily="monospace"
            >
              {type === "display4" ? "15" : "255"}
            </text>
          </>
        )}
        {(type === "dff" || type === "srlatch" || type === "dlatch" || type === "dramcell") && (
          <>
            <rect x="12" y="3" width="40" height="36" rx="1" />
            <path d="M2 12 H12 M2 30 H12 M52 12 H62" />
            <g stroke="none" fill="currentColor" fontSize="10">
              <text x="17" y="16">
                {type === "srlatch" ? "S" : "D"}
              </text>
              <text x="40" y="16">
                Q
              </text>
              {type !== "dff" && (
                <text x="17" y="34">
                  {type === "srlatch" ? "R" : type === "dramcell" ? "W" : "E"}
                </text>
              )}
            </g>
            {type === "dff" && <path d="M12 25 L19 30 L12 35" />}
            {type === "dramcell" && (
              <path d="M33 21 V27 M28 27 H38 M28 31 H38 M33 31 V36" strokeWidth="1.5" />
            )}
          </>
        )}
        {(type === "nmos" || type === "pmos") && (
          <>
            <path d="M32 5 V14 M32 28 V37 M20 14 V28 M25 14 V28 M25 16 H38 V26 H25 M8 21 H20" />
            {type === "pmos" && <circle cx="22" cy="21" r="3" fill="#1a2440" />}
          </>
        )}
        {type === "high" && <path d="M32 5 V34 M20 13 H44 M25 20 H39 M29 27 H35" />}
        {(type === "mux" || type === "demux") && (
          <>
            <path
              d={
                type === "mux"
                  ? "M16 4 L47 12 V30 L16 38 Z M4 12 H16 M4 30 H16 M47 21 H60 M32 34 V41"
                  : "M16 12 L47 4 V38 L16 30 Z M4 21 H16 M47 12 H60 M47 30 H60 M32 34 V41"
              }
            />
            <g stroke="none" fill="currentColor" fontSize="8">
              <text x="21" y="16">
                0
              </text>
              <text x="21" y="30">
                1
              </text>
              <text x="35" y="37">
                S
              </text>
            </g>
          </>
        )}
        {(type === "decoder" || type === "encoder") && (
          <>
            <rect x="15" y="3" width="34" height="36" rx="1" />
            <path
              d={
                type === "decoder"
                  ? "M3 14 H15 M3 28 H15 M49 8 H61 M49 17 H61 M49 26 H61 M49 35 H61"
                  : "M3 8 H15 M3 17 H15 M3 26 H15 M3 35 H15 M49 14 H61 M49 28 H61"
              }
            />
            <g stroke="none" fill="currentColor" fontSize="7" textAnchor="middle">
              <text x="32" y="19">
                {type === "decoder" ? "BIN" : "1-of-n"}
              </text>
              <text x="32" y="29">
                {type === "decoder" ? "1-of-n" : "BIN"}
              </text>
            </g>
          </>
        )}
        {(type === "adder" || type === "comparator" || type === "alu") && (
          <>
            {type === "alu" ? (
              <path d="M15 3 L29 10 L15 17 V38 L49 29 V11 Z M4 7 H15 M4 32 H15 M49 21 H61 M32 34 V41" />
            ) : (
              <>
                <rect x="15" y="3" width="34" height="36" />
                <path d="M3 12 H15 M3 29 H15 M49 12 H61 M49 29 H61 M32 39 V42" />
              </>
            )}
            <text x="32" y="27" textAnchor="middle" stroke="none" fill="currentColor" fontSize="19">
              {type === "adder" ? "Σ" : type === "comparator" ? "≷" : "+"}
            </text>
          </>
        )}
        {(type === "register" || type === "counter" || type === "memory") && (
          <>
            <rect x="14" y="3" width="36" height="36" />
            <path d="M3 12 H14 M3 30 H14 L21 34 L14 38 M50 12 H61 M50 30 H61" />
            <g stroke="none" fill="currentColor" fontSize="9">
              <text x="19" y="15">
                D
              </text>
              <text x="39" y="15">
                Q
              </text>
            </g>
            {type === "memory" ? (
              <path d="M23 21 H42 M23 25 H42 M28 18 V28 M36 18 V28" strokeWidth="1" />
            ) : (
              <text
                x="33"
                y="29"
                textAnchor="middle"
                stroke="none"
                fill="currentColor"
                fontSize="12"
              >
                {type === "counter" ? identity?.component.counterMode === "down" ? "−1" : identity?.component.counterMode === "up-down" ? "±1" : "+1" : "→"}
              </text>
            )}
          </>
        )}
        {type === "module" && (
          <>
            <rect x="13" y="5" width="38" height="32" rx="2" />
            <path d="M3 14 H13 M3 28 H13 M51 14 H61 M51 28 H61 M25 14 H39 V28 H25 Z" />
          </>
        )}
        {type === "merger" && (
          <path d="M6 7 L30 21 M6 14 L30 21 M6 28 L30 21 M6 35 L30 21 M30 21 H58" strokeWidth="2" />
        )}
        {type === "splitter" && (
          <path d="M6 21 H34 L58 7 M34 21 L58 14 M34 21 L58 28 M34 21 L58 35" strokeWidth="2" />
        )}
        {type === "busdriver" && (
          <>
            <path d="M18 7 V35 L46 21 Z M4 21 H18 M46 21 H60 M32 4 V14" />
            <circle cx="32" cy="4" r="2" />
          </>
        )}
        {type === "bus" && (
          <path d="M4 21 H60 M14 9 V21 M28 9 V21 M42 33 V21 M50 9 V21" strokeWidth="2" />
        )}
        {type === "ground" && <path d="M32 5 V16 M16 16 H48 M21 23 H43 M27 30 H37" />}
        {type === "junction" && <path d="M8 10 H28 V21 H55 M8 32 H28 V21 M28 21 H29" />}
      </svg>
      {identity?.yours && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            right: -5,
            bottom: -8,
            fontSize: 8,
            lineHeight: 1,
            padding: "2px 3px",
            borderRadius: 3,
            background: "#16363a",
            color: "#a3ece0",
          }}
        >
          Yours
        </span>
      )}
    </span>
  );
});
