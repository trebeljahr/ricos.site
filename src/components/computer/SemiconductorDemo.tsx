import { type ReactNode, useId, useState } from "react";
import styles from "./SemiconductorDemo.module.css";

type Material = "silicon" | "donor" | "acceptor" | "vacancy";
type Bias = "equilibrium" | "forward" | "reverse";
type Direction = "electrons" | "current";
type Device = "bjt" | "mosfet" | "finfet";

const MIT =
  "https://ocw.mit.edu/courses/6-012-microelectronic-devices-and-circuits-spring-2009/resources/";
const TOSHIBA = "https://toshiba.semicon-storage.com/us/semiconductor/knowledge/";
const SOURCES = {
  lattice: `${MIT}mit6_012s09_lec02/`,
  donor: `${TOSHIBA}e-learning/discrete/chap1/chap1-3.html`,
  acceptor: `${TOSHIBA}e-learning/discrete/chap1/chap1-4.html`,
  vacancy:
    "https://ocw.mit.edu/courses/3-091sc-introduction-to-solid-state-chemistry-fall-2010/91578fa1c9dd3badf920ba989def52cb_Fg78tInX5Vg.pdf",
  junction: `${MIT}mit6_012s09_lec14/`,
  bjt: `${MIT}mit6_012s09_lec17/`,
  mosfet: `${MIT}mit6_012s09_lec08/`,
  gateCharge: `${TOSHIBA}faq/mosfet/electrical-characteristics-of-mosfetscharge-characteristic-qg-qg.html`,
  leakage:
    "https://toshiba.semicon-storage.com/eu/semiconductor/knowledge/faq/mosfet/why-do-toshibas-power-mosfets-exhibit-larger-gate-source-leakage.html",
  finfet:
    "https://www.intc.com/news-events/press-releases/detail/655/intel-reinvents-transistors-using-new-3-d-structure",
};

function Choice<T extends string>({
  label,
  value,
  choices,
  onChange,
}: {
  label: string;
  value: T;
  choices: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className={styles.choices} aria-label={label}>
      {choices.map((choice) => (
        <button
          type="button"
          key={choice.value}
          aria-pressed={value === choice.value}
          onClick={() => onChange(choice.value)}
        >
          {choice.label}
        </button>
      ))}
    </fieldset>
  );
}

function Diagram({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <section
        className={styles.diagramScroll}
        aria-label="Scrollable semiconductor diagram"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: keyboard users need to scroll the diagram
        tabIndex={0}
      >
        <svg className={styles.diagram} viewBox="0 0 660 420" role="img" aria-label={label}>
          <title>{label}</title>
          {children}
        </svg>
      </section>
      <p className={styles.scrollHint}>
        Scroll the diagram sideways to see its full width. Keyboard: focus the diagram, then use the
        arrow keys.
      </p>
    </>
  );
}

/** Direction symbols show net transport, never an individual carrier's trajectory. */
function Arrow({
  x1,
  x2,
  y,
  label,
  weak = false,
  field = false,
}: {
  x1: number;
  x2: number;
  y: number;
  label?: string;
  weak?: boolean;
  field?: boolean;
}) {
  const direction = x2 > x1 ? 1 : -1;
  return (
    <g className={field ? styles.fieldArrow : styles.transport} data-weak={weak || undefined}>
      <line x1={x1} x2={x2} y1={y} y2={y} strokeDasharray={weak ? "4 6" : undefined} />
      <path
        d={`M ${x2 - direction * 10} ${y - 6} L ${x2} ${y} L ${x2 - direction * 10} ${y + 6}`}
      />
      {label && (
        <text x={(x1 + x2) / 2} y={y - 13} textAnchor="middle">
          {label}
        </text>
      )}
    </g>
  );
}

function Charge({
  x,
  y,
  kind,
}: {
  x: number;
  y: number;
  kind: "electron" | "hole" | "donor" | "acceptor";
}) {
  const mobile = kind === "electron" || kind === "hole";
  const positive = kind === "hole" || kind === "donor";
  return (
    <g className={mobile ? (kind === "electron" ? styles.electron : styles.hole) : styles.ion}>
      {mobile ? (
        <circle cx={x} cy={y} r={9} />
      ) : (
        <rect x={x - 9} y={y - 9} width={18} height={18} rx={2} />
      )}
      <text x={x} y={y + 5} textAnchor="middle">
        {positive ? "+" : "−"}
      </text>
    </g>
  );
}

function DirectionChoice({
  value,
  onChange,
}: {
  value: Direction;
  onChange: (direction: Direction) => void;
}) {
  return (
    <Choice
      label="Arrow convention"
      value={value}
      onChange={onChange}
      choices={[
        { value: "electrons", label: "Electron motion" },
        { value: "current", label: "Conventional current" },
      ]}
    />
  );
}

const materialNames: Record<Material, string> = {
  silicon: "Pure silicon",
  donor: "Phosphorus donor",
  acceptor: "Boron acceptor",
  vacancy: "Missing atom",
};

function LatticeView() {
  const [material, setMaterial] = useState<Material>("silicon");
  const [ionized, setIonized] = useState(false);
  const [thermalPair, setThermalPair] = useState(false);
  const [hole, setHole] = useState(3);
  const isDopant = material === "donor" || material === "acceptor";
  const atom =
    material === "donor"
      ? `P${ionized ? "+" : ""}`
      : material === "acceptor"
        ? `B${ionized ? "−" : ""}`
        : "Si";
  const state =
    material === "silicon"
      ? thermalPair
        ? "An electron–hole pair: mobile negative and positive charge, created together."
        : "Four shared bonds around each silicon atom. Bonding electrons are not free carriers."
      : material === "donor"
        ? ionized
          ? "n-type: an ionized donor stays positive at its lattice site; its released electron is mobile."
          : "Phosphorus has five valence electrons. Four participate in bonding; the extra electron is easy to release."
        : material === "acceptor"
          ? ionized
            ? "p-type: the acceptor stays negative at its lattice site; a mobile hole remains in the bond system."
            : "Boron has three valence electrons. It can accept a neighboring bond electron, leaving a mobile hole."
          : "A vacancy is an absent atom. A hole is an absent electron state, not an empty atom site.";
  return (
    <section className={styles.view} aria-label="Crystal and doping">
      <h4>Change one lattice site</h4>
      <Choice
        label="Lattice material"
        value={material}
        choices={(Object.keys(materialNames) as Material[]).map((value) => ({
          value,
          label: materialNames[value],
        }))}
        onChange={(value) => {
          setMaterial(value);
          setIonized(false);
          setThermalPair(false);
          setHole(3);
        }}
      />
      <Diagram
        label={`${materialNames[material]} in a flattened silicon bond model${ionized ? ", ionized" : ""}`}
      >
        <text x={30} y={30} className={styles.smallLabel}>
          FLATTENED BOND MODEL · NOT ATOMIC ORBITS
        </text>
        {[
          [330, 68],
          [170, 210],
          [490, 210],
          [330, 352],
        ].map(([x, y]) => {
          const dx = (x - 330) / 4;
          const dy = (y - 210) / 4;
          const incomplete =
            x === 490 &&
            ((material === "acceptor" && !ionized) || (material === "silicon" && thermalPair));
          return (
            <g key={`${x}-${y}`}>
              <line
                className={styles.bond}
                x1={330 + dx}
                y1={210 + dy}
                x2={x - dx}
                y2={y - dy}
                strokeDasharray={material === "vacancy" ? "4 7" : undefined}
              />
              {material !== "vacancy" && (
                <>
                  <circle
                    className={styles.bondElectron}
                    cx={(330 + x) / 2 + (dy ? -7 : 0)}
                    cy={(210 + y) / 2 + (dx ? -7 : 0)}
                    r={4}
                  />
                  <circle
                    className={incomplete ? styles.emptyBond : styles.bondElectron}
                    cx={(330 + x) / 2 + (dy ? 7 : 0)}
                    cy={(210 + y) / 2 + (dx ? 7 : 0)}
                    r={4}
                  />
                </>
              )}
              <circle className={styles.atom} cx={x} cy={y} r={25} />
              <text x={x} y={y + 6} textAnchor="middle">
                Si
              </text>
            </g>
          );
        })}
        {material === "vacancy" ? (
          <>
            <circle className={styles.emptySite} cx={330} cy={210} r={28} />
            <text x={330} y={255} textAnchor="middle">
              atom absent
            </text>
          </>
        ) : (
          <>
            <circle
              className={material === "silicon" ? styles.atom : styles.dopant}
              cx={330}
              cy={210}
              r={29}
            />
            <text x={330} y={216} textAnchor="middle">
              {atom}
            </text>
          </>
        )}
        {material === "donor" && (
          <>
            <Charge x={ionized ? 495 : 375} y={ionized ? 85 : 170} kind="electron" />
            <text x={ionized ? 495 : 410} y={ionized ? 122 : 144} textAnchor="middle">
              {ionized ? "mobile electron" : "fifth electron"}
            </text>
          </>
        )}
        {material === "acceptor" && ionized && (
          <>
            <Charge x={495} y={85} kind="hole" />
            <text x={495} y={122} textAnchor="middle">
              mobile hole
            </text>
          </>
        )}
        {material === "silicon" && thermalPair && (
          <>
            <Charge x={495} y={85} kind="electron" />
            <Charge x={150} y={85} kind="hole" />
            <text x={495} y={122} textAnchor="middle">
              mobile electron
            </text>
            <text x={150} y={122} textAnchor="middle">
              mobile hole
            </text>
          </>
        )}
        <text x={330} y={402} textAnchor="middle" className={styles.smallLabel}>
          Each bond shares two electrons. Neighboring bonds continue beyond this drawing.
        </text>
      </Diagram>
      <div className={styles.actions}>
        {isDopant && (
          <button
            type="button"
            aria-pressed={ionized}
            onClick={() => {
              setIonized(!ionized);
              setHole(3);
            }}
          >
            {ionized
              ? "Show before ionization"
              : material === "donor"
                ? "Release the donor electron"
                : "Accept a bond electron"}
          </button>
        )}
        {material === "silicon" && (
          <button
            type="button"
            aria-pressed={thermalPair}
            onClick={() => setThermalPair(!thermalPair)}
          >
            {thermalPair ? "Remove the illustrated pair" : "Create an electron–hole pair"}
          </button>
        )}
      </div>
      <p className={styles.state} aria-live="polite">
        {state}
      </p>
      {material === "acceptor" && ionized && (
        <div className={styles.holeSteps}>
          <p>Move a bonding electron into the hole. The empty state moves the other way.</p>
          <div
            className={styles.occupations}
            role="img"
            aria-label={`Four electron states. Hole at position ${hole + 1}.`}
          >
            {[0, 1, 2, 3].map((index) => (
              <span key={`state-${index}`} data-hole={index === hole}>
                {index === hole ? "○" : "●"}
              </span>
            ))}
            <span>
              electron →<br />← hole
            </span>
          </div>
          <button type="button" onClick={() => setHole(hole ? hole - 1 : 3)}>
            {hole ? "Fill the hole from the left" : "Reset the hole example"}
          </button>
        </div>
      )}
      <p className={styles.explanation}>
        Doping substitutes an atom into the lattice. It does not make the whole material
        electrically positive or negative. Mobile carriers balance the ionized dopants in neutral
        bulk. Heat can also create electron–hole pairs in pure silicon.
      </p>
      <p className={styles.limit}>
        The real lattice is three-dimensional and tetrahedral. These charge symbols summarize
        electronic states spread across many atoms. Ionization is illustrated as a step; at ordinary
        temperatures many shallow dopants are already ionized. Vacancy relaxation and defect energy
        levels are omitted.
      </p>
      <p className={styles.sources}>
        Sources: <a href={SOURCES.lattice}>MIT: bonds, carriers and charge neutrality</a>;{" "}
        <a href={SOURCES.donor}>Toshiba: donors</a>; <a href={SOURCES.acceptor}>acceptors</a>;{" "}
        <a href={SOURCES.vacancy}>MIT: vacancies</a>.
      </p>
    </section>
  );
}

const biasState = {
  equilibrium: {
    label: "No applied bias",
    halfWidth: 65,
    polarityP: "",
    polarityN: "",
    width: "Equilibrium width",
    message:
      "A built-in field balances diffusion. Carriers still move, but their opposing currents give zero net current at equilibrium.",
  },
  forward: {
    label: "Forward bias",
    halfWidth: 32,
    polarityP: "+",
    polarityN: "−",
    width: "Narrower depletion region",
    message:
      "Make p positive relative to n. The barrier falls and the depletion region narrows. Electrons enter p; holes enter n.",
  },
  reverse: {
    label: "Reverse bias",
    halfWidth: 115,
    polarityP: "−",
    polarityN: "+",
    width: "Wider depletion region",
    message:
      "Make p negative relative to n. The barrier rises and the depletion region widens. A small reverse leakage remains below breakdown.",
  },
} as const;

function JunctionView() {
  const [bias, setBias] = useState<Bias>("equilibrium");
  const [direction, setDirection] = useState<Direction>("electrons");
  const state = biasState[bias];
  const rightward = (direction === "electrons") === (bias === "reverse");
  return (
    <section className={styles.view} aria-label="PN junction and bias">
      <h4>Change the voltage across a PN junction</h4>
      <Choice
        label="Junction bias"
        value={bias}
        onChange={setBias}
        choices={(Object.keys(biasState) as Bias[]).map((value) => ({
          value,
          label: biasState[value].label,
        }))}
      />
      <Diagram label={`PN junction: ${state.label.toLowerCase()}. ${state.width}.`}>
        <text x={170} y={34} textAnchor="middle">
          p-type · acceptors
        </text>
        <text x={490} y={34} textAnchor="middle">
          n-type · donors
        </text>
        <text x={170} y={62} textAnchor="middle" className={styles.smallLabel}>
          holes are majority carriers
        </text>
        <text x={490} y={62} textAnchor="middle" className={styles.smallLabel}>
          electrons are majority carriers
        </text>
        <rect className={styles.pRegion} x={70} y={100} width={260} height={175} />
        <rect className={styles.nRegion} x={330} y={100} width={260} height={175} />
        <rect
          className={styles.depletion}
          x={330 - state.halfWidth}
          y={100}
          width={state.halfWidth * 2}
          height={175}
        />
        <line className={styles.boundary} x1={330} x2={330} y1={86} y2={286} />
        {[0, 1].flatMap((row) =>
          [110, 160, 210, 260, 300].map((x) => (
            <g key={`p-${row}-${x}`}>
              <Charge x={x} y={145 + row * 75} kind="acceptor" />
              {x < 330 - state.halfWidth && <Charge x={x - 16} y={164 + row * 75} kind="hole" />}
            </g>
          )),
        )}
        {[0, 1].flatMap((row) =>
          [360, 400, 450, 500, 550].map((x) => (
            <g key={`n-${row}-${x}`}>
              <Charge x={x} y={145 + row * 75} kind="donor" />
              {x > 330 + state.halfWidth && (
                <Charge x={x + 16} y={164 + row * 75} kind="electron" />
              )}
            </g>
          )),
        )}
        <line className={styles.contact} x1={25} x2={70} y1={188} y2={188} />
        <line className={styles.contact} x1={590} x2={635} y1={188} y2={188} />
        <text className={styles.polarity} x={35} y={163} textAnchor="middle" data-contact="p">
          {state.polarityP}
        </text>
        <text className={styles.polarity} x={625} y={163} textAnchor="middle" data-contact="n">
          {state.polarityN}
        </text>
        <text x={330} y={310} textAnchor="middle">
          {state.width}
        </text>
        {bias === "equilibrium" ? (
          <>
            <Arrow x1={405} x2={255} y={365} label="field: n → p" field />
            <text x={330} y={405} textAnchor="middle">
              drift and diffusion balance · net current 0
            </text>
          </>
        ) : (
          <>
            <Arrow
              x1={rightward ? 150 : 510}
              x2={rightward ? 510 : 150}
              y={371}
              weak={bias === "reverse"}
              label={`${bias === "reverse" ? "small leakage · " : ""}${direction === "electrons" ? "electron contribution" : "conventional current"}`}
            />
            <text x={330} y={411} textAnchor="middle" className={styles.smallLabel}>
              {bias === "forward"
                ? "Holes travel p → n; both carrier types contribute conventional current p → n."
                : "Minority carriers supply reverse current. Breakdown is outside this view."}
            </text>
          </>
        )}
      </Diagram>
      <DirectionChoice value={direction} onChange={setDirection} />
      <p className={styles.state} aria-live="polite">
        {state.message}
      </p>
      <div className={styles.legend}>
        <span>
          <i className={styles.ionSwatch} />
          Square ±: fixed dopant ion
        </span>
        <span>
          <i className={styles.electronSwatch} />
          Filled −: mobile electron
        </span>
        <span>
          <i className={styles.holeSwatch} />
          Outlined +: mobile hole
        </span>
      </div>
      <p className={styles.explanation}>
        Carriers diffuse across the junction and recombine. Unbalanced, fixed acceptor ions remain
        on the p side; donor ions remain on the n side. Their field opposes further majority-carrier
        diffusion. The depleted region still contains atoms, bonding electrons and fixed charge.
      </p>
      <p className={styles.limit}>
        This is a depletion approximation with equal doping pictured on both sides. Width and
        carrier symbols are illustrative, not a voltage or current calculation. Forward conduction
        rises continuously; there is no universal 0.7 V switch. Reverse leakage and breakdown depend
        on the device and temperature.
      </p>
      <p className={styles.sources}>
        Sources: <a href={SOURCES.lattice}>MIT: ionized dopants</a>;{" "}
        <a href={SOURCES.junction}>MIT: PN-junction bias and carrier transport</a>.
      </p>
    </section>
  );
}

function BjtDiagram({ active, direction }: { active: boolean; direction: Direction }) {
  return (
    <Diagram
      label={`NPN bipolar transistor: ${active ? "forward active, electrons injected across the thin base and collected" : "no forward emitter injection"}.`}
    >
      <text x={157} y={40} textAnchor="middle">
        EMITTER · n+
      </text>
      <text x={305} y={40} textAnchor="middle">
        BASE · p
      </text>
      <text x={485} y={40} textAnchor="middle">
        COLLECTOR · n
      </text>
      <rect className={styles.nRegion} x={60} y={140} width={190} height={180} />
      <rect className={styles.pRegion} x={250} y={140} width={110} height={180} />
      <rect className={styles.nRegion} x={360} y={140} width={240} height={180} />
      <rect
        className={styles.depletion}
        data-region="depletion"
        x={active ? 240 : 225}
        y={140}
        width={active ? 20 : 50}
        height={180}
      />
      <rect className={styles.depletion} x={342} y={140} width={65} height={180} />
      <text x={305} y={178} textAnchor="middle" className={styles.smallLabel}>
        thin base
      </text>
      <line className={styles.contact} x1={305} x2={305} y1={70} y2={140} />
      <text x={305} y={96} textAnchor="end" dx={-15} className={styles.smallLabel}>
        {active ? "base drive · conventional IB" : "base tied to emitter"}
      </text>
      {active && (
        <>
          <path className={styles.fieldArrow} d="M 305 103 V 135 M 299 125 L 305 135 L 311 125" />
          <Arrow
            x1={direction === "electrons" ? 95 : 565}
            x2={direction === "electrons" ? 565 : 95}
            y={240}
            label={
              direction === "electrons"
                ? "injection → diffusion → collection"
                : "conventional collector current"
            }
          />
          <Arrow x1={412} x2={338} y={292} label="field" field />
        </>
      )}
      {!active && (
        <text x={330} y={242} textAnchor="middle">
          no strong emitter injection · leakage omitted
        </text>
      )}
      <text x={155} y={362} textAnchor="middle" className={styles.smallLabel}>
        {active ? "base–emitter: forward bias" : "base–emitter: no forward bias"}
      </text>
      <text x={485} y={362} textAnchor="middle" className={styles.smallLabel}>
        base–collector: reverse bias
      </text>
      <text x={330} y={408} textAnchor="middle" className={styles.smallLabel}>
        Collector is held above base potential; emitter is the reference.
      </text>
    </Diagram>
  );
}

function MosDiagram({ active, direction }: { active: boolean; direction: Direction }) {
  return (
    <Diagram
      label={`Planar n-channel MOSFET: ${active ? "electron inversion channel formed beneath the insulated gate" : "no strong inversion channel"}.`}
    >
      <rect className={styles.pRegion} x={65} y={195} width={530} height={160} />
      <rect className={styles.nRegion} x={65} y={195} width={155} height={110} />
      <rect className={styles.nRegion} x={440} y={195} width={155} height={110} />
      <rect className={styles.insulator} x={220} y={170} width={220} height={25} />
      <rect className={styles.metal} x={220} y={105} width={220} height={65} />
      <text x={330} y={144} textAnchor="middle" className={styles.metalLabel}>
        GATE {active ? "+ + +" : ""}
      </text>
      <text x={330} y={188} textAnchor="middle" className={styles.smallLabel}>
        insulating dielectric
      </text>
      <text x={140} y={280} textAnchor="middle">
        SOURCE · n+
      </text>
      <text x={520} y={280} textAnchor="middle">
        DRAIN · n+
      </text>
      <text x={330} y={327} textAnchor="middle">
        p-type body · tied to source
      </text>
      {active ? (
        <>
          <rect className={styles.channel} x={218} y={197} width={224} height={19} />
          {[260, 330, 400].map((x) => (
            <path
              key={x}
              className={styles.fieldArrow}
              d={`M ${x} 170 V 205 M ${x - 5} 197 L ${x} 205 L ${x + 5} 197`}
            />
          ))}
          <Arrow
            x1={direction === "electrons" ? 95 : 565}
            x2={direction === "electrons" ? 565 : 95}
            y={210}
          />
          <text x={330} y={246} textAnchor="middle" className={styles.smallLabel}>
            electron inversion channel
          </text>
        </>
      ) : (
        <text x={330} y={241} textAnchor="middle" className={styles.smallLabel}>
          no strong channel
        </text>
      )}
      <text x={330} y={394} textAnchor="middle">
        Drain held positive relative to source
      </text>
    </Diagram>
  );
}

function FinDiagram({ active }: { active: boolean }) {
  return (
    <Diagram
      label={`Tri-gate FinFET cross-section: gate surrounds top and both sides of an insulated silicon fin. ${active ? "Channel at the fin surfaces." : "No strong channel."}`}
    >
      <text x={330} y={36} textAnchor="middle">
        CROSS-SECTION ACROSS THE FIN
      </text>
      <rect className={styles.pRegion} x={95} y={330} width={470} height={38} />
      <rect className={styles.pRegion} x={280} y={160} width={100} height={170} />
      <path className={styles.finGate} d="M 254.5 330 V 134.5 H 405.5 V 330" />
      <path className={styles.finInsulator} d="M 273 330 V 153 H 387 V 330" />
      {active && (
        <>
          <path className={styles.finChannel} d="M 286 324 V 167 H 374 V 324" />
          <Arrow x1={266} x2={288} y={235} field />
          <Arrow x1={394} x2={372} y={235} field />
          <path className={styles.fieldArrow} d="M 330 146 V 171 M 325 163 L 330 171 L 335 163" />
        </>
      )}
      <text x={330} y={254} textAnchor="middle">
        silicon
      </text>
      <text x={330} y={279} textAnchor="middle">
        fin
      </text>
      <text x={153} y={90} textAnchor="middle">
        gate
      </text>
      <path className={styles.leader} d="M 174 94 L 242 126" />
      <text x={510} y={130} textAnchor="middle">
        insulator
      </text>
      <path className={styles.leader} d="M 465 135 L 395 160" />
      <text x={330} y={404} textAnchor="middle" className={styles.smallLabel}>
        Source and drain lie along the fin, into and out of this cross-section.
      </text>
    </Diagram>
  );
}

function TransistorView() {
  const [device, setDevice] = useState<Device>("bjt");
  const [active, setActive] = useState(false);
  const [direction, setDirection] = useState<Direction>("electrons");
  const bjt = device === "bjt";
  return (
    <section className={styles.view} aria-label="Transistor mechanisms">
      <h4>Compare carrier injection with field control</h4>
      <Choice
        label="Transistor structure"
        value={device}
        onChange={(value) => {
          setDevice(value);
          setActive(false);
        }}
        choices={[
          { value: "bjt", label: "NPN bipolar" },
          { value: "mosfet", label: "Planar nMOS" },
          { value: "finfet", label: "Tri-gate FinFET" },
        ]}
      />
      {bjt ? (
        <BjtDiagram active={active} direction={direction} />
      ) : device === "mosfet" ? (
        <MosDiagram active={active} direction={direction} />
      ) : (
        <FinDiagram active={active} />
      )}
      <div className={styles.actions}>
        <button type="button" aria-pressed={active} onClick={() => setActive(!active)}>
          {bjt
            ? active
              ? "Remove forward base–emitter bias"
              : "Forward-bias base–emitter"
            : active
              ? "Lower gate relative to source"
              : "Raise gate relative to source"}
        </button>
      </div>
      <DirectionChoice value={direction} onChange={setDirection} />
      <p className={styles.state} aria-live="polite">
        {bjt
          ? active
            ? "Forward active: electrons enter from the emitter, diffuse across the thin base, and are swept into the collector by its depletion-region field."
            : "Without forward base–emitter bias, there is little emitter injection. The collector–base junction remains reverse biased."
          : active
            ? "Positive gate bias attracts electrons to the silicon surface. A conducting channel connects source to drain; the dielectric separates gate charge from channel charge."
            : "Low gate bias leaves no strong inversion channel in this enhancement-mode example. Real devices still leak."}
      </p>
      <p className={styles.explanation}>
        {direction === "electrons"
          ? bjt
            ? "Main electron transport: emitter → collector."
            : "Electron transport: source → positive drain, along the channel."
          : bjt
            ? "Conventional collector current: collector → emitter. Conventional base current enters the base."
            : "Conventional channel current: drain → source. It points opposite electron motion."}
      </p>
      {bjt ? (
        <>
          <p className={styles.explanation}>
            The thin shared base lets most injected electrons reach the collector junction. Some
            recombine; hole injection toward the emitter also contributes to base current. Two
            separate back-to-back diodes lack this shared carrier-transport region.
          </p>
          <p className={styles.sources}>
            Source: <a href={SOURCES.bjt}>MIT: NPN transport in the forward-active regime</a>.
          </p>
        </>
      ) : (
        <>
          <p className={styles.explanation}>
            {device === "finfet"
              ? "In this tri-gate geometry, one gate controls the fin from its top and two sides. The insulator stays between gate and silicon. "
              : "The gate’s electric field acts through the insulator; channel electrons come from source and drain contacts. "}
            Charging or discharging the gate requires transient current. Real gate structures also
            have leakage.
          </p>
          <p className={styles.sources}>
            Sources: <a href={SOURCES.mosfet}>MIT: MOSFET structure and inversion</a>;{" "}
            <a href={SOURCES.gateCharge}>Toshiba: gate charge</a>;{" "}
            <a href={SOURCES.leakage}>gate leakage</a>
            {device === "finfet" && (
              <>
                ; <a href={SOURCES.finfet}>Intel: tri-gate geometry</a>
              </>
            )}
            .
          </p>
        </>
      )}
      <p className={styles.limit}>
        Cross-sections show selected mechanisms, not fabrication layouts or a numerical transport
        solver. Dimensions, dopant concentrations, carrier counts and arrows are illustrative. BJT
        saturation, MOS body-diode paths, subthreshold conduction and switching times are outside
        this view. The FinFET drawing shows geometry, not a particular manufacturing process.
      </p>
    </section>
  );
}

/** Qualitative material physics; separate from the digital circuit simulator. */
export function SemiconductorDemo() {
  const [view, setView] = useState("lattice");
  const headingId = useId();
  return (
    <section className={`not-prose ${styles.demo}`} aria-labelledby={headingId}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>FROM SILICON TO A SWITCH</p>
        <h3 id={headingId}>Move charge. Change conduction.</h3>
        <p>
          A qualitative explorable. The controls select physical situations, not measured voltages
          or currents.
        </p>
      </header>
      <Choice
        label="Semiconductor view"
        value={view}
        onChange={setView}
        choices={[
          { value: "lattice", label: "1 · Crystal and doping" },
          { value: "junction", label: "2 · The PN junction" },
          { value: "transistor", label: "3 · Two transistor families" },
        ]}
      />
      <div hidden={view !== "lattice"}>
        <LatticeView />
      </div>
      <div hidden={view !== "junction"}>
        <JunctionView />
      </div>
      <div hidden={view !== "transistor"}>
        <TransistorView />
      </div>
    </section>
  );
}
