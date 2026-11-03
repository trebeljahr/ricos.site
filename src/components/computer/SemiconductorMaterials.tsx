import { type CSSProperties, useContext, useEffect, useState } from "react";
import styles from "./SemiconductorDemo.module.css";
import { Charge, Choice, Details, Diagram, Flow, MotionContext } from "./SemiconductorDemo.shared";

const DOPING_SOURCE = "https://www.iue.tuwien.ac.at/phd/wittmann/node7.html";
const DEFECT_SOURCE = "https://www.iue.tuwien.ac.at/activities/characterization/";
const HISTORY_SOURCE =
  "https://www.computerhistory.org/siliconengine/invention-of-the-point-contact-transistor/";
const DATASHEET = "https://www.onsemi.com/download/data-sheet/pdf/bc550-d.pdf";
const FIRST_PHOTO =
  "https://commons.wikimedia.org/wiki/File:The_First_Transistor_ever_made,_built_in_1947_-_Bell_Labs.jpg";
const MODERN_PHOTO = "https://commons.wikimedia.org/wiki/File:BC547_Transistor_-_01.jpg";

const elements = [
  { symbol: "B", name: "Boron", number: 5, group: 13, period: 2 },
  { symbol: "C", name: "Carbon", number: 6, group: 14, period: 2 },
  { symbol: "N", name: "Nitrogen", number: 7, group: 15, period: 2 },
  { symbol: "Al", name: "Aluminium", number: 13, group: 13, period: 3 },
  { symbol: "Si", name: "Silicon", number: 14, group: 14, period: 3 },
  { symbol: "P", name: "Phosphorus", number: 15, group: 15, period: 3 },
  { symbol: "Ga", name: "Gallium", number: 31, group: 13, period: 4 },
  { symbol: "Ge", name: "Germanium", number: 32, group: 14, period: 4 },
  { symbol: "As", name: "Arsenic", number: 33, group: 15, period: 4 },
  { symbol: "In", name: "Indium", number: 49, group: 13, period: 5 },
  { symbol: "Sn", name: "Tin", number: 50, group: 14, period: 5 },
  { symbol: "Sb", name: "Antimony", number: 51, group: 15, period: 5 },
];

export function ElementsView() {
  const [host, setHost] = useState("Si");
  const [dopant, setDopant] = useState("P");
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const running = useContext(MotionContext);
  const selected = elements.find((element) => element.symbol === dopant)!;
  const donor = selected.group === 15;
  useEffect(() => {
    if (!playing || !running) return;
    const timer = window.setTimeout(() => {
      if (step < 2) setStep(step + 1);
      else setPlaying(false);
    }, 1600);
    return () => window.clearTimeout(timer);
  }, [playing, running, step]);
  return (
    <>
      <div className={styles.controlRow}>
        <Choice
          label="Semiconductor host"
          value={host}
          onChange={(value) => {
            setHost(value);
            setStep(0);
            setPlaying(false);
          }}
          choices={[
            { value: "Si", label: "Silicon" },
            { value: "Ge", label: "Germanium" },
          ]}
        />
        <Choice
          label="Element to add"
          value={dopant}
          onChange={(value) => {
            setDopant(value);
            setStep(0);
            setPlaying(false);
          }}
          choices={[
            { value: "B", label: "Boron · left" },
            { value: "P", label: "Phosphorus · right" },
            { value: "As", label: "Arsenic · right" },
          ]}
        />
      </div>
      <Diagram
        split
        label={`Periodic table groups 13, 14 and 15. ${host === "Si" ? "Silicon" : "Germanium"} has four valence electrons. ${selected.name} has ${donor ? "five" : "three"}. ${step === 2 ? (donor ? "Positive donor ion and mobile negative electron." : "Negative acceptor ion and mobile positive hole.") : "Select an element, then substitute it into the crystal."}`}
      >
        {[13, 14, 15].map((group, index) => (
          <g key={group}>
            <text x={75 + index * 100} y={28} textAnchor="middle">
              {group}
            </text>
            <text x={75 + index * 100} y={48} textAnchor="middle" className={styles.smallLabel}>
              {group - 10} outer e−
            </text>
          </g>
        ))}
        {elements.map((element) => {
          const x = 30 + (element.group - 13) * 100;
          const y = 64 + (element.period - 2) * 68;
          const highlight = element.symbol === host || element.symbol === dopant;
          return (
            <g
              key={element.symbol}
              className={styles.elementCell}
              data-highlight={highlight || undefined}
              data-kind={
                element.symbol === host ? "host" : element.group === 13 ? "acceptor" : "donor"
              }
            >
              <rect x={x} y={y} width={90} height={60} rx={4} />
              <text x={x + 7} y={y + 13} className={styles.atomicNumber}>
                {element.number}
              </text>
              <text x={x + 45} y={y + 32} textAnchor="middle" className={styles.elementSymbol}>
                {element.symbol}
              </text>
              <text x={x + 45} y={y + 49} textAnchor="middle" className={styles.elementName}>
                {element.name}
              </text>
            </g>
          );
        })}
        <text x={175} y={365} textAnchor="middle" className={styles.smallLabel}>
          PERIODIC TABLE · GROUPS 13–15
        </text>
        <text x={497} y={40} textAnchor="middle">
          {step === 0
            ? "Choose the replacement"
            : step === 1
              ? "Take a lattice site"
              : donor
                ? "Donate an electron"
                : "Accept an electron"}
        </text>
        {[
          [497, 115],
          [415, 205],
          [579, 205],
          [497, 295],
        ].map(([x, y]) => (
          <g key={`${x}-${y}`}>
            <line className={styles.bond} x1={497} y1={205} x2={x} y2={y} />
            <circle className={styles.atom} cx={x} cy={y} r={22} />
            <text x={x} y={y + 5} textAnchor="middle">
              {host}
            </text>
          </g>
        ))}
        <circle className={styles.atom} cx={497} cy={205} r={29} />
        <text x={497} y={211} textAnchor="middle">
          {host}
        </text>
        {step > 0 && (
          <g
            key={`${dopant}-${host}`}
            className={styles.elementTransfer}
            style={
              {
                "--from-x": `${75 + (selected.group - 13) * 100 - 497}px`,
                "--from-y": `${94 + (selected.period - 2) * 68 - 205}px`,
              } as CSSProperties
            }
          >
            <circle
              className={donor ? styles.donorAtom : styles.acceptorAtom}
              cx={497}
              cy={205}
              r={29}
            />
            <text x={497} y={211} textAnchor="middle">
              {dopant}
              {step === 2 ? (donor ? "+" : "−") : ""}
            </text>
          </g>
        )}
        {step === 2 && (
          <>
            <g
              className={styles.releasedCarrier}
              style={{ "--release-x": "72px", "--release-y": "-123px" } as CSSProperties}
            >
              <Charge x={497} y={205} kind={donor ? "electron" : "hole"} />
            </g>
            <text x={497} y={354} textAnchor="middle" className={styles.carrierLabel}>
              {donor ? "fixed donor + · mobile electron −" : "fixed acceptor − · mobile hole +"}
            </text>
          </>
        )}
        <text x={497} y={395} textAnchor="middle">
          {donor ? "n-type" : "p-type"} · neutral overall
        </text>
      </Diagram>
      <fieldset className={styles.sequence} aria-label="Element animation steps">
        {["Find the element", "Replace one atom", "Move the charge"].map((label, index) => (
          <button
            key={label}
            type="button"
            aria-label={`${index + 1} ${label}`}
            aria-pressed={step === index}
            onClick={() => {
              setStep(index);
              setPlaying(false);
            }}
          >
            <span>{index + 1}</span>
            {label}
          </button>
        ))}
      </fieldset>
      <div className={styles.actions}>
        <button
          className={styles.primaryButton}
          type="button"
          onClick={() => {
            setStep(window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 2 : 0);
            setPlaying(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
          }}
        >
          Play element → crystal
        </button>
      </div>
      <p className={styles.state} aria-live="polite">
        {donor
          ? "One column right: five valence electrons. The extra electron can move."
          : "One column left: three valence electrons. Accepting a bond electron leaves a mobile hole."}
      </p>
      <p className={styles.caption}>
        {host === "Ge"
          ? "Germanium also has four valence electrons. The first working transistor used germanium."
          : "Silicon and germanium share group 14. Both can form semiconductor crystals."}
      </p>
      <Details>
        <p>
          Groups are columns, not adjacent atomic numbers. Boron sits above and left of silicon;
          phosphorus sits directly right.
        </p>
        <p>
          Boron, phosphorus and arsenic illustrate shallow acceptors and donors. The other cells
          provide periodic-table context, not a list of interchangeable dopants.
        </p>
        <p>
          Germanium also supports donor and acceptor doping. Ionization energies and material
          properties differ from silicon.
        </p>
        <p>
          <a href={DOPING_SOURCE}>
            TU Wien: donor and acceptor impurities in silicon and germanium
          </a>{" "}
          · <a href={HISTORY_SOURCE}>Computer History Museum: the first transistor</a>
        </p>
      </Details>
    </>
  );
}

export function PurityView() {
  const [dirty, setDirty] = useState(false);
  const faults = new Set([9, 16, 22, 26]);
  return (
    <>
      <Choice
        label="Crystal quality"
        value={dirty ? "dirty" : "clean"}
        onChange={(value) => setDirty(value === "dirty")}
        choices={[
          { value: "clean", label: "Controlled doping" },
          { value: "dirty", label: "Unwanted impurities and defects" },
        ]}
      />
      <Diagram
        label={
          dirty
            ? "Doped crystal with unwanted impurities and a vacancy. Some carriers scatter, become trapped, or recombine."
            : "High-purity crystal with a deliberately placed phosphorus donor. Carriers can move through the material."
        }
      >
        <text x={24} y={30} className={styles.smallLabel}>
          SCHEMATIC BOND NETWORK · SAME INTENTIONAL DOPANT IN BOTH VIEWS
        </text>
        {[0, 1, 2, 3, 4].flatMap((row) =>
          [0, 1, 2, 3, 4, 5, 6].map((col) => {
            const x = 90 + col * 80;
            const y = 75 + row * 62;
            const index = row * 7 + col;
            const faulty = dirty && faults.has(index);
            const vacancy = faulty && index === 16;
            return (
              <g key={`${row}-${col}`}>
                {col < 6 && (
                  <line
                    className={styles.bond}
                    x1={x + 14}
                    y1={y}
                    x2={x + 66}
                    y2={y}
                    strokeDasharray={vacancy ? "3 5" : undefined}
                  />
                )}
                {row < 4 && (
                  <line
                    className={styles.bond}
                    x1={x}
                    y1={y + 14}
                    x2={x}
                    y2={y + 48}
                    strokeDasharray={vacancy ? "3 5" : undefined}
                  />
                )}
                <circle
                  className={
                    index === 18 ? styles.donorAtom : faulty ? styles.defect : styles.crystalAtom
                  }
                  cx={x}
                  cy={y}
                  r={15}
                />
                <text x={x} y={y + 5} textAnchor="middle" className={styles.latticeLabel}>
                  {index === 18 ? "P+" : vacancy ? "×" : faulty ? "?" : "Si"}
                </text>
              </g>
            );
          }),
        )}
        <Flow x1={90} x2={dirty ? 250 : 570} y={168} count={dirty ? 3 : 7} duration={3.8} />
        <Flow x1={90} x2={dirty ? 330 : 570} y={230} count={dirty ? 3 : 7} duration={3.8} />
        {dirty && (
          <>
            <g className={styles.trappedCarrier}>
              <Charge x={250} y={168} kind="electron" />
            </g>
            <path className={styles.scatteredPath} d="M 330 230 l 30 -27 l 23 8 l 15 -20" />
            <g className={styles.recombination} style={{ transformOrigin: "398px 200px" }}>
              <Charge x={398} y={190} kind="electron" />
              <Charge x={398} y={210} kind="hole" />
            </g>
            <text x={255} y={198} className={styles.smallLabel}>
              trap
            </text>
            <text x={394} y={249} className={styles.smallLabel}>
              scatter / recombine
            </text>
          </>
        )}
        <text x={330} y={395} textAnchor="middle">
          {dirty
            ? "Random defects change how charge moves."
            : "High purity makes controlled doping possible."}
        </text>
      </Diagram>
      <p className={styles.state} aria-live="polite">
        {dirty
          ? "Unwanted impurities can trap carriers, increase leakage, and disrupt reliable switching."
          : "Start with a very pure crystal. Add chosen dopants in controlled amounts and places."}
      </p>
      <Details>
        <p>
          A dopant is an intentional impurity with a chosen electrical role. Contamination, missing
          atoms and damaged bonds can introduce unwanted electronic states.
        </p>
        <p>
          Some defects trap charge or promote recombination. Others scatter carriers. Their effects
          depend on type, position and concentration.
        </p>
        <p>
          A single defect does not automatically destroy a device. Real crystals contain defects;
          fabrication controls them to meet the device’s requirements.
        </p>
        <p>
          This flattened network shows mechanisms, not a defect-density calculation or the
          tetrahedral geometry of the crystal view.
        </p>
        <p>
          <a href={DEFECT_SOURCE}>TU Wien: charge trapping and device behavior</a> ·{" "}
          <a href={DOPING_SOURCE}>Controlled semiconductor doping</a>
        </p>
      </Details>
    </>
  );
}

const pins = [
  {
    id: "collector",
    label: "Collector",
    short: "C",
    x: 270,
    description: "Collects most electrons from the emitter.",
  },
  {
    id: "base",
    label: "Base",
    short: "B",
    x: 330,
    description: "A small base current controls a larger collector current.",
  },
  {
    id: "emitter",
    label: "Emitter",
    short: "E",
    x: 390,
    description: "Supplies electrons in this NPN transistor.",
  },
] as const;

export function RealTransistorsView() {
  const [era, setEra] = useState("modern");
  const [pin, setPin] = useState<(typeof pins)[number]["id"]>("base");
  const [inside, setInside] = useState(false);
  const modern = era === "modern";
  return (
    <section className={styles.view} aria-label="Real transistors">
      <h4>
        {modern
          ? "Three legs. One small piece of silicon inside."
          : "The first transistor used a germanium crystal."}
      </h4>
      <Choice
        label="Real transistor example"
        value={era}
        onChange={setEra}
        choices={[
          { value: "historic", label: "1947 · point-contact design" },
          { value: "modern", label: "Today · BC547 package" },
        ]}
      />
      {modern ? (
        <>
          <div className={styles.realShowcase}>
            <figure className={styles.photoFigure}>
              <svg
                className={styles.photoDiagram}
                viewBox="0 0 660 420"
                role="img"
                aria-label="Real BC547 photograph, flat face toward you. Left lead: collector. Middle lead: base. Right lead: emitter."
              >
                <title>Real BC547 with labeled collector, base and emitter leads</title>
                <image
                  href="/images/computer/semiconductors/bc547-transistor.jpg"
                  x={130}
                  y={-100}
                  width={400}
                  height={600}
                />
                <path d="M 302 340 V 358 H 140 M 322 340 V 395 M 336 340 V 358 H 520" />
                <text x={140} y={385} textAnchor="middle">
                  Collector
                </text>
                <text x={330} y={415} textAnchor="middle">
                  Base
                </text>
                <text x={520} y={385} textAnchor="middle">
                  Emitter
                </text>
              </svg>
              <figcaption>
                BC547 · silicon NPN transistor in a TO-92 package. Photo:{" "}
                <a href={MODERN_PHOTO}>Suyash Dwivedi / Wikimedia Commons</a> ·{" "}
                <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>. Labels
                added.
              </figcaption>
            </figure>
            <Diagram
              label={`BC547 front view, flat face toward you, leads downward. Left to right: collector, base, emitter. ${inside ? "Schematic cutaway shows a silicon die and bond wires." : "Black plastic package."}`}
            >
              <text x={330} y={30} textAnchor="middle" className={styles.smallLabel}>
                BC547 · FLAT FACE TOWARD YOU · LEADS DOWN
              </text>
              {pins.map((item) => (
                <g
                  key={item.id}
                  data-selected={pin === item.id || undefined}
                  className={styles.packagePin}
                >
                  <path d={`M ${item.x} 190 V 286`} />
                  <circle cx={item.x} cy={287} r={4} />
                </g>
              ))}
              <path
                className={styles.packageBody}
                d="M 240 190 V 116 Q 240 57 330 57 Q 420 57 420 116 V 190 Z"
              />
              {inside ? (
                <g className={styles.cutaway}>
                  <rect
                    className={styles.siliconDie}
                    x={303}
                    y={100}
                    width={54}
                    height={43}
                    rx={2}
                  />
                  {pins.map((item, index) => (
                    <path
                      key={item.id}
                      className={styles.bondWire}
                      d={`M ${315 + index * 15} 130 Q ${item.x} 140 ${item.x} 190`}
                    />
                  ))}
                  <path className={styles.leader} d="M 357 112 H 480" />
                  <text x={490} y={117}>
                    silicon die
                  </text>
                  <path className={styles.leader} d="M 390 160 H 480" />
                  <text x={490} y={165}>
                    bond wires
                  </text>
                </g>
              ) : (
                <text x={330} y={137} textAnchor="middle" className={styles.packageMarking}>
                  BC547
                </text>
              )}
              <path className={styles.leader} d="M 270 287 V 317 H 150" />
              <path className={styles.leader} d="M 330 287 V 362" />
              <path className={styles.leader} d="M 390 287 V 317 H 510" />
              <text x={150} y={340} textAnchor="middle">
                1 · Collector
              </text>
              <text x={330} y={385} textAnchor="middle">
                2 · Base
              </text>
              <text x={510} y={340} textAnchor="middle">
                3 · Emitter
              </text>
            </Diagram>
          </div>
          <div className={styles.controlRow}>
            <Choice
              label="Explore a transistor lead"
              value={pin}
              onChange={setPin}
              choices={pins.map((item) => ({
                value: item.id,
                label: `${item.short} · ${item.label}`,
              }))}
            />
            <button
              type="button"
              className={styles.quietButton}
              aria-pressed={inside}
              onClick={() => setInside(!inside)}
            >
              {inside ? "Close the package" : "Look inside"}
            </button>
          </div>
          <p className={styles.state} aria-live="polite">
            {pins.find((item) => item.id === pin)?.description}
          </p>
        </>
      ) : (
        <>
          <figure className={`${styles.photoFigure} ${styles.historicPhoto}`}>
            {/* biome-ignore lint/performance/noImgElement: local educational photograph */}
            <img
              src="/images/computer/semiconductors/first-transistor-bell-labs.jpg"
              width={2048}
              height={1535}
              loading="lazy"
              alt="Museum display of the first transistor design: a metal support holds a triangular wedge above a germanium contact surface."
            />
            <figcaption>
              1947 point-contact design · photographed at Bell Labs.{" "}
              <a href={FIRST_PHOTO}>Windell Oskay / Wikimedia Commons</a> ·{" "}
              <a href="https://creativecommons.org/licenses/by/2.0/">CC BY 2.0</a>. Photograph
              unchanged.
            </figcaption>
          </figure>
          <Diagram label="Simplified 1947 point-contact transistor: emitter and collector are two closely spaced gold contacts on germanium; the base contact connects to the slab.">
            <rect className={styles.nRegion} x={170} y={240} width={320} height={60} rx={4} />
            <text x={330} y={278} textAnchor="middle">
              germanium crystal
            </text>
            <path className={styles.wedge} d="M 260 90 H 400 L 330 238 Z" />
            <path className={styles.goldContact} d="M 220 82 L 314 240 M 440 82 L 346 240" />
            <path className={styles.contact} d="M 330 300 V 350 H 485" />
            <text x={145} y={66} textAnchor="middle">
              Emitter
            </text>
            <path className={styles.leader} d="M 145 76 H 215" />
            <text x={515} y={66} textAnchor="middle">
              Collector
            </text>
            <path className={styles.leader} d="M 515 76 H 445" />
            <text x={515} y={356}>
              Base
            </text>
            <text x={330} y={395} textAnchor="middle" className={styles.smallLabel}>
              Two points on one crystal · simplified geometry
            </text>
          </Diagram>
        </>
      )}
      <Details>
        <p>
          The historical photo shows the point-contact design on display, not a photograph taken in
          1947. The diagram explains its connections.
        </p>
        <p>
          The BC547 is a bipolar junction transistor. The cutaway is schematic, not a measured
          internal layout. Packaged MOSFETs use gate, source and drain leads instead.
        </p>
        <p>
          <a href={HISTORY_SOURCE}>Computer History Museum: the 1947 transistor</a> ·{" "}
          <a href={DATASHEET}>onsemi: BC547 pin assignment</a>
        </p>
        <p>
          Both photographs permit reuse. Their source pages and licenses appear directly below each
          image.
        </p>
      </Details>
    </section>
  );
}
