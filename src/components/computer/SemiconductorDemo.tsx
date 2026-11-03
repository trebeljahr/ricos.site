import { type CSSProperties, useContext, useEffect, useId, useRef, useState } from "react";
import styles from "./SemiconductorDemo.module.css";
import {
  Arrow,
  Charge,
  Choice,
  Details,
  Diagram,
  DirectionChoice,
  Flow,
  MotionContext,
  SOURCES,
} from "./SemiconductorDemo.shared";
import { ElementsView, PurityView, RealTransistorsView } from "./SemiconductorMaterials";

type Material = "silicon" | "donor" | "acceptor" | "vacancy";
type Bias = "equilibrium" | "forward" | "reverse";
type Direction = "electrons" | "current";
type Device = "bjt" | "mosfet" | "finfet";

const materialNames: Record<Material, string> = {
  silicon: "Pure silicon",
  donor: "Phosphorus donor",
  acceptor: "Boron acceptor",
  vacancy: "Missing atom",
};

// Diamond cubic silicon: FCC sites plus the (1/4, 1/4, 1/4) basis.
// Integer coordinates are quarter-unit-cell lengths; nearest neighbors are √3 apart.
const crystalSites = [0, 1].flatMap((a) =>
  [0, 1].flatMap((b) =>
    [0, 1].flatMap((c) =>
      [
        [0, 0, 0],
        [0, 2, 2],
        [2, 0, 2],
        [2, 2, 0],
        [1, 1, 1],
        [1, 3, 3],
        [3, 1, 3],
        [3, 3, 1],
      ].map(([x, y, z]) => ({
        x: x + a * 4,
        y: y + b * 4,
        z: z + c * 4,
        key: `${x + a * 4},${y + b * 4},${z + c * 4}`,
      })),
    ),
  ),
);
const crystalBonds = crystalSites.flatMap((site, index) =>
  crystalSites
    .slice(index + 1)
    .filter(
      (other) => (site.x - other.x) ** 2 + (site.y - other.y) ** 2 + (site.z - other.z) ** 2 === 3,
    )
    .map((other) => ({ a: site, b: other })),
);
const dopantSites = ["3,3,1", "5,5,5", "1,5,5"];
const projectSite = (site: { x: number; y: number; z: number }) => ({
  x: 330 + ((site.x - 3.5) * 0.819 - (site.y - 3.5) * 0.574) * 43,
  y:
    210 +
    ((site.x - 3.5) * 0.574 + (site.y - 3.5) * 0.819) * 0.406 * 30 -
    (site.z - 3.5) * 0.914 * 30,
});

function HoleTransport() {
  const [hole, setHole] = useState(3);
  const [animate, setAnimate] = useState(false);
  const running = useContext(MotionContext);
  useEffect(() => {
    if (!animate || !running) return;
    const timer = window.setTimeout(() => {
      if (hole === 0) setAnimate(false);
      else setHole(hole - 1);
    }, 1100);
    return () => window.clearTimeout(timer);
  }, [animate, hole, running]);
  return (
    <div className={styles.holeSteps}>
      <div className={styles.holeHeading}>
        <span>Electrons fill the gap. The hole moves the other way.</span>
        <button
          type="button"
          onClick={() => {
            const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            setHole(reduced ? 0 : 3);
            setAnimate(!reduced && !animate);
          }}
          aria-pressed={animate}
        >
          {animate ? "Stop hole motion" : "Animate hole motion"}
        </button>
      </div>
      <svg
        viewBox="0 0 660 128"
        className={styles.holeDiagram}
        role="img"
        aria-label={`Four electron states. Hole at position ${hole + 1}.`}
      >
        {[0, 1, 2, 3].map((index) => (
          <circle key={index} className={styles.emptySite} cx={186 + index * 96} cy={48} r={18} />
        ))}
        {[0, 1, 2].map((index) => (
          <g
            key={index}
            className={styles.hoppingElectron}
            style={{
              transform: `translate(${186 + (index >= hole ? index + 1 : index) * 96}px, 48px)`,
            }}
          >
            <Charge x={0} y={0} kind="electron" />
          </g>
        ))}
        <g
          className={styles.hoppingElectron}
          style={{ transform: `translate(${186 + hole * 96}px, 48px)` }}
        >
          <Charge x={0} y={0} kind="hole" />
        </g>
        <Arrow x1={185} x2={285} y={100} label="electron" />
        <Arrow x1={474} x2={374} y={100} label="hole" field />
      </svg>
      <button
        type="button"
        onClick={() => {
          setAnimate(false);
          setHole(hole ? hole - 1 : 3);
        }}
      >
        {hole ? "Fill the hole from the left" : "Reset the hole example"}
      </button>
    </div>
  );
}

function CrystalView({ onZoom }: { onZoom: (material: Material, ionized: boolean) => void }) {
  const [dopant, setDopant] = useState<"donor" | "acceptor">("donor");
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [many, setMany] = useState(false);
  const [replay, setReplay] = useState(0);
  const running = useContext(MotionContext);
  const selected = dopantSites.slice(0, many ? 3 : 1);
  const donor = dopant === "donor";
  const steps = ["Pure crystal", "Add dopant", "Free carriers"];
  useEffect(() => {
    if (!playing || !running) return;
    const timer = window.setTimeout(() => {
      if (step < 2) setStep(step + 1);
      else setPlaying(false);
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [playing, running, step]);
  return (
    <>
      <div className={styles.controlRow}>
        <Choice
          label="Crystal dopant"
          value={dopant}
          onChange={(value) => {
            setDopant(value);
            setStep(0);
            setPlaying(false);
          }}
          choices={[
            { value: "donor", label: "Phosphorus · n-type" },
            { value: "acceptor", label: "Boron · p-type" },
          ]}
        />
        <button
          type="button"
          className={styles.quietButton}
          aria-pressed={many}
          onClick={() => {
            setMany(!many);
            setStep(0);
            setPlaying(false);
          }}
        >
          {many ? "Fewer dopants" : "More dopants"}
        </button>
      </div>
      <Diagram
        label={`Diamond cubic silicon crystal: 64 lattice sites. ${step === 0 ? "Pure silicon." : `${selected.length} ${donor ? "phosphorus" : "boron"} substitution${selected.length > 1 ? "s" : ""}. ${step === 2 ? "Mobile carriers and fixed ions." : "Dopant atoms occupy silicon sites."}`}`}
      >
        <text x={24} y={30} className={styles.smallLabel}>
          64 ATOMS · DIAMOND CUBIC LATTICE
        </text>
        <g className={styles.crystalNetwork}>
          {crystalBonds.map(({ a, b }) => {
            const start = projectSite(a);
            const end = projectSite(b);
            return (
              <line
                key={`${a.key}-${b.key}`}
                className={styles.crystalBond}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
              />
            );
          })}
          {[...crystalSites]
            .sort((a, b) => a.z - b.z)
            .map((site) => {
              const point = projectSite(site);
              const doped = selected.includes(site.key) && step > 0;
              return (
                <g key={site.key} data-site={doped ? "dopant" : "silicon"}>
                  <circle
                    className={styles.crystalAtom}
                    cx={point.x}
                    cy={point.y}
                    r={8 + site.z * 0.35}
                  />
                  {doped && (
                    <g
                      key={`${replay}-${dopant}`}
                      className={styles.incomingDopant}
                      style={{ transformOrigin: `${point.x}px ${point.y}px` }}
                    >
                      <circle
                        className={donor ? styles.donorAtom : styles.acceptorAtom}
                        cx={point.x}
                        cy={point.y}
                        r={17}
                      />
                      <text
                        className={styles.dopantLabel}
                        x={point.x}
                        y={point.y + 5}
                        textAnchor="middle"
                      >
                        {donor ? "P" : "B"}
                        {step === 2 ? (donor ? "+" : "−") : ""}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
        </g>
        {selected.map((key, index) => {
          const point = projectSite(crystalSites.find((site) => site.key === key)!);
          return step === 2 ? (
            <g key={key}>
              <g
                className={styles.releasedCarrier}
                style={{ "--release-x": "45px", "--release-y": "-52px" } as CSSProperties}
              >
                <Charge x={point.x} y={point.y} kind={donor ? "electron" : "hole"} />
              </g>
              {index === 0 && (
                <>
                  <path
                    className={styles.leader}
                    d={`M ${point.x + 17} ${point.y + 7} h 54 l 18 25 h 42`}
                  />
                  <text x={point.x + 134} y={point.y + 36} className={styles.smallLabel}>
                    fixed {donor ? "+" : "−"} ion
                  </text>
                  <text x={point.x + 52} y={point.y - 70} className={styles.carrierLabel}>
                    {donor ? "free electron" : "mobile hole"}
                  </text>
                </>
              )}
            </g>
          ) : null;
        })}
        {step === 0 && (
          <text x={330} y={393} textAnchor="middle">
            Each silicon atom bonds to four neighbors.
          </text>
        )}
        {step === 1 && (
          <text x={330} y={393} textAnchor="middle">
            {donor
              ? "Phosphorus brings a fifth electron."
              : "Boron has one fewer bonding electron."}
          </text>
        )}
        {step === 2 && (
          <text x={330} y={393} textAnchor="middle">
            {donor
              ? "An electron can leave. The phosphorus ion stays."
              : "A bond electron fills the acceptor. A hole remains."}
          </text>
        )}
      </Diagram>
      <fieldset className={styles.sequence} aria-label="Doping sequence">
        {steps.map((label, index) => (
          <button
            type="button"
            key={label}
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
          type="button"
          className={styles.primaryButton}
          onClick={() => {
            setStep(window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 2 : 0);
            setReplay(replay + 1);
            setPlaying(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
          }}
        >
          {step || playing ? "Replay doping" : "Dope the crystal"} <span aria-hidden="true">→</span>
        </button>
        <button type="button" onClick={() => onZoom(dopant, step === 2)}>
          Zoom into one dopant ↗
        </button>
      </div>
      <p className={styles.state} aria-live="polite">
        {step === 0
          ? "Doping adds a small number of different atoms to silicon."
          : step === 1
            ? "Dopant atoms take silicon sites. The crystal stays connected."
            : donor
              ? "n-type: more mobile electrons. The crystal remains electrically neutral."
              : "p-type: more mobile holes. The crystal remains electrically neutral."}
      </p>
      {step === 2 && !donor && <HoleTransport />}
      <Details>
        <p>
          This animation shows substitution and ionization, not a fabrication recipe. Real doping
          can use diffusion or ion implantation and annealing.
        </p>
        <p>
          The projected crystal has tetrahedral bonds. Surface bonds continue beyond the drawing.
          Dopant concentration and carrier locations are illustrative.
        </p>
        <p>
          Ionized dopants stay fixed. Mobile charge balances their charge in neutral bulk. At
          ordinary temperatures, many shallow dopants are already ionized.
        </p>
        <p className={styles.sources}>
          <a href={SOURCES.lattice}>MIT: bonds and charge neutrality</a> ·{" "}
          <a href={SOURCES.donor}>Toshiba: donors</a> ·{" "}
          <a href={SOURCES.acceptor}>Toshiba: acceptors</a>
        </p>
      </Details>
    </>
  );
}

function LatticeView() {
  const [scale, setScale] = useState("crystal");
  const [material, setMaterial] = useState<Material>("silicon");
  const [ionized, setIonized] = useState(false);
  const [thermalPair, setThermalPair] = useState(false);
  const isDopant = material === "donor" || material === "acceptor";
  const atom =
    material === "donor"
      ? `P${ionized ? "+" : ""}`
      : material === "acceptor"
        ? `B${ionized ? "−" : ""}`
        : "Si";
  return (
    <section className={styles.view} aria-label="Crystal and doping">
      <div className={styles.viewHeading}>
        <h4>
          {scale === "crystal"
            ? "A different atom changes what can move."
            : scale === "elements"
              ? "One column changes the charge carrier."
              : scale === "purity"
                ? "Start pure. Add only what you choose."
                : "Four bonds. One extra electron — or one gap."}
        </h4>
        <Choice
          label="Lattice scale"
          value={scale}
          onChange={setScale}
          choices={[
            { value: "crystal", label: "Crystal lattice" },
            { value: "atom", label: "One atom" },
            { value: "elements", label: "Elements" },
            { value: "purity", label: "Crystal purity" },
          ]}
        />
      </div>
      {scale === "elements" ? (
        <ElementsView />
      ) : scale === "purity" ? (
        <PurityView />
      ) : scale === "crystal" ? (
        <CrystalView
          onZoom={(value, charged) => {
            setMaterial(value);
            setIonized(charged);
            setThermalPair(false);
            setScale("atom");
          }}
        />
      ) : (
        <>
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
            }}
          />
          <Diagram
            label={`${materialNames[material]} in a flattened silicon bond model${ionized ? ", ionized" : ""}`}
          >
            <text x={24} y={30} className={styles.smallLabel}>
              ONE SITE · FOUR SHARED BONDS
            </text>
            {[
              [330, 78],
              [170, 210],
              [490, 210],
              [330, 342],
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
                        cx={(330 + x) / 2 + (dy ? -8 : 0)}
                        cy={(210 + y) / 2 + (dx ? -8 : 0)}
                        r={6}
                      />
                      <circle
                        className={incomplete ? styles.emptyBond : styles.bondElectron}
                        cx={(330 + x) / 2 + (dy ? 8 : 0)}
                        cy={(210 + y) / 2 + (dx ? 8 : 0)}
                        r={6}
                      />
                    </>
                  )}
                  <circle className={styles.atom} cx={x} cy={y} r={28} />
                  <text x={x} y={y + 6} textAnchor="middle">
                    Si
                  </text>
                </g>
              );
            })}
            <circle
              className={
                material === "vacancy"
                  ? styles.emptySite
                  : material === "silicon"
                    ? styles.atom
                    : material === "donor"
                      ? styles.donorAtom
                      : styles.acceptorAtom
              }
              cx={330}
              cy={210}
              r={34}
            />
            <text x={330} y={216} textAnchor="middle">
              {material === "vacancy" ? "?" : atom}
            </text>
            {material === "vacancy" && (
              <text x={465} y={125} textAnchor="middle">
                atom missing
              </text>
            )}
            {material === "donor" && (
              <>
                <g
                  key={String(ionized)}
                  className={ionized ? styles.releasedCarrier : undefined}
                  style={{ "--release-x": "115px", "--release-y": "-65px" } as CSSProperties}
                >
                  <Charge x={382} y={157} kind="electron" />
                </g>
                <text x={ionized ? 500 : 445} y={ionized ? 124 : 145} textAnchor="middle">
                  {ionized ? "free to move" : "fifth electron"}
                </text>
              </>
            )}
            {material === "acceptor" && ionized && (
              <>
                <g className={styles.acceptedElectron}>
                  <Charge x={414} y={218} kind="electron" />
                </g>
                <Charge x={500} y={90} kind="hole" />
                <text x={500} y={124} textAnchor="middle">
                  mobile hole
                </text>
              </>
            )}
            {material === "silicon" && thermalPair && (
              <>
                <g
                  className={styles.releasedCarrier}
                  style={{ "--release-x": "80px", "--release-y": "-125px" } as CSSProperties}
                >
                  <Charge x={410} y={218} kind="electron" />
                </g>
                <Charge x={410} y={218} kind="hole" />
                <text x={500} y={124} textAnchor="middle">
                  free electron
                </text>
                <text x={500} y={253} textAnchor="middle">
                  hole left behind
                </text>
              </>
            )}
            <text x={330} y={398} textAnchor="middle" className={styles.smallLabel}>
              Each bond shares two electrons · flattened view of a 3D lattice
            </text>
          </Diagram>
          <div className={styles.actions}>
            {isDopant && (
              <button
                type="button"
                className={styles.primaryButton}
                aria-pressed={ionized}
                onClick={() => setIonized(!ionized)}
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
                className={styles.primaryButton}
                aria-pressed={thermalPair}
                onClick={() => setThermalPair(!thermalPair)}
              >
                {thermalPair ? "Remove the illustrated pair" : "Create an electron–hole pair"}
              </button>
            )}
          </div>
          <p className={styles.state} aria-live="polite">
            {material === "silicon"
              ? thermalPair
                ? "One electron leaves a bond. A mobile electron and a hole appear together."
                : "Four shared bonds hold silicon together. These electrons stay in bonds."
              : material === "donor"
                ? ionized
                  ? "n-type: a mobile electron leaves a fixed positive donor ion."
                  : "Four electrons form bonds. The fifth is easy to release."
                : material === "acceptor"
                  ? ionized
                    ? "p-type: the acceptor stays negative. A mobile hole remains in the bonds."
                    : "Boron has three valence electrons. One bond needs another electron."
                  : "A vacancy is a missing atom. A hole is a missing electron."}
          </p>
          {material === "acceptor" && ionized && <HoleTransport />}
          <Details>
            <p>
              Bonding electrons are shared electronic states, not tiny balls in atomic orbits. The
              real lattice is three-dimensional and tetrahedral.
            </p>
            <p>
              Doping preserves bulk charge neutrality. Heat can also create electron–hole pairs in
              pure silicon. Defect relaxation and energy levels are omitted.
            </p>
            <p className={styles.sources}>
              <a href={SOURCES.lattice}>MIT: bonds and carriers</a> ·{" "}
              <a href={SOURCES.donor}>Toshiba: donors</a> · <a href={SOURCES.acceptor}>acceptors</a>{" "}
              · <a href={SOURCES.vacancy}>MIT: vacancies</a>
            </p>
          </Details>
        </>
      )}
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
    message: "Carriers cross both ways. Drift balances diffusion: net current is zero.",
  },
  forward: {
    label: "Forward bias",
    halfWidth: 32,
    polarityP: "+",
    polarityN: "−",
    width: "Narrower depletion region",
    message: "Forward bias lowers the barrier. Electrons and holes cross the junction more easily.",
  },
  reverse: {
    label: "Reverse bias",
    halfWidth: 115,
    polarityP: "−",
    polarityN: "+",
    width: "Wider depletion region",
    message:
      "Reverse bias widens the barrier. Only a small reverse leakage remains below breakdown.",
  },
} as const;

function JunctionView() {
  const [bias, setBias] = useState<Bias>("equilibrium");
  const [direction, setDirection] = useState<Direction>("electrons");
  const state = biasState[bias];
  const rightward = (direction === "electrons") === (bias === "reverse");
  return (
    <section className={styles.view} aria-label="PN junction and bias">
      <h4>A voltage changes the barrier.</h4>
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
          data-region="depletion"
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
        <path
          className={styles.widthBracket}
          d={`M ${330 - state.halfWidth} 290 v 10 H ${330 + state.halfWidth} v -10`}
        />
        <text x={330} y={327} textAnchor="middle">
          {state.width}
        </text>
        {bias === "forward" ? (
          <>
            <Flow x1={565} x2={95} y={178} />
            <Flow x1={95} x2={565} y={248} kind="hole" />
          </>
        ) : bias === "reverse" ? (
          <>
            <Flow x1={105} x2={555} y={178} count={1} duration={7} />
            <Flow x1={555} x2={105} y={248} kind="hole" count={1} duration={7} />
          </>
        ) : (
          <>
            <Flow x1={410} x2={250} y={174} count={2} duration={4} />
            <Flow x1={250} x2={410} y={242} count={2} duration={4} />
          </>
        )}
        {bias === "equilibrium" ? (
          <>
            <Arrow x1={405} x2={255} y={365} label="field: n → p" field />
            <text x={330} y={405} textAnchor="middle">
              equal opposing currents · net current 0
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
                ? "Electrons ← · holes → · conventional current →"
                : "Minority carriers carry a small reverse current."}
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
      <Details>
        <p className={styles.explanation}>
          Carriers diffuse across the junction and recombine. Unbalanced, fixed acceptor ions remain
          on the p side; donor ions remain on the n side. Their field opposes further
          majority-carrier diffusion. The depleted region still contains atoms, bonding electrons
          and fixed charge.
        </p>
        <p className={styles.limit}>
          This is a depletion approximation with equal doping pictured on both sides. Width and
          carrier symbols are illustrative, not a voltage or current calculation. Forward conduction
          rises continuously; there is no universal 0.7 V switch. Reverse leakage and breakdown
          depend on the device and temperature.
        </p>
        <p className={styles.sources}>
          Sources: <a href={SOURCES.lattice}>MIT: ionized dopants</a>;{" "}
          <a href={SOURCES.junction}>MIT: PN-junction bias and carrier transport</a>.
        </p>
      </Details>
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
        {active ? "small base current" : "base tied to emitter"}
      </text>
      {active && (
        <>
          <path className={styles.fieldArrow} d="M 305 103 V 135 M 299 125 L 305 135 L 311 125" />
          <Arrow
            x1={direction === "electrons" ? 95 : 565}
            x2={direction === "electrons" ? 565 : 95}
            y={240}
            label={direction === "electrons" ? "electrons →" : "conventional current ←"}
          />
          <Flow x1={90} x2={565} y={210} count={9} />
          <g className={styles.recombination}>
            <Charge x={305} y={270} kind="electron" />
            <Charge x={305} y={290} kind="hole" />
          </g>
          <Arrow x1={412} x2={338} y={292} label="collector field" field />
        </>
      )}
      {!active && (
        <text x={330} y={242} textAnchor="middle">
          little emitter injection
        </text>
      )}
      <text x={155} y={362} textAnchor="middle" className={styles.smallLabel}>
        {active ? "base–emitter: forward bias" : "base–emitter: no forward bias"}
      </text>
      <text x={485} y={362} textAnchor="middle" className={styles.smallLabel}>
        base–collector: reverse bias
      </text>
      <text x={330} y={408} textAnchor="middle" className={styles.smallLabel}>
        {active
          ? "Most electrons cross the thin base and reach the collector."
          : "Add base–emitter bias to inject electrons."}
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
              className={`${styles.fieldArrow} ${styles.gateField}`}
              d={`M ${x} 151 V 200 M ${x - 5} 192 L ${x} 200 L ${x + 5} 192`}
            />
          ))}
          <Flow x1={95} x2={565} y={208} count={10} />
          <Arrow
            x1={direction === "electrons" ? 230 : 430}
            x2={direction === "electrons" ? 430 : 230}
            y={78}
            label={direction === "electrons" ? "electrons →" : "conventional current ←"}
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
        {active
          ? "The field makes a channel. Electrons come from the contacts."
          : "Raise the gate voltage to form a channel."}
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
        ONE GATE · THREE CONTROLLED SURFACES
      </text>
      <rect className={styles.pRegion} x={95} y={330} width={470} height={38} />
      <rect className={styles.pRegion} x={280} y={160} width={100} height={170} />
      <path className={styles.finGate} d="M 254.5 330 V 134.5 H 405.5 V 330" />
      <path className={styles.finInsulator} d="M 273 330 V 153 H 387 V 330" />
      {active && (
        <>
          <path className={styles.finChannel} d="M 286 324 V 167 H 374 V 324" />
          {[200, 250, 300].flatMap((y) =>
            [286, 374].map((x) => (
              <g
                key={`${x}-${y}`}
                className={styles.intoPage}
                style={{ transformOrigin: `${x}px ${y}px`, animationDelay: `${-y / 100}s` }}
              >
                <circle className={styles.bondElectron} cx={x} cy={y} r={6} />
                <circle className={styles.depthRing} cx={x} cy={y} r={12} />
              </g>
            )),
          )}
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
        {active
          ? "Electrons travel along the fin, out of this cross-section ⊙"
          : "The gate wraps the top and both sides of the fin."}
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
      <h4>
        {bjt
          ? "A thin base lets electrons pass through."
          : device === "mosfet"
            ? "An electric field creates a conducting path."
            : "Wrap the gate around the channel."}
      </h4>
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
      {device !== "finfet" && <DirectionChoice value={direction} onChange={setDirection} />}
      <p className={styles.state} aria-live="polite">
        {bjt
          ? active
            ? "A small base current supports a much larger flow from emitter to collector."
            : "Without forward base–emitter bias, few electrons enter the base."
          : active
            ? "The gate attracts electrons through an insulator. A channel connects source to drain."
            : "Low gate voltage leaves no strong channel. Real devices still leak."}
      </p>
      <Details>
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
          Forward-active electrons enter from the emitter, diffuse across the thin base, and are
          swept into the collector. The dielectric separates gate charge from channel charge.
        </p>
      </Details>
    </section>
  );
}

/** Qualitative material physics; separate from the digital circuit simulator. */
export function SemiconductorDemo() {
  const [view, setView] = useState("lattice");
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const root = useRef<HTMLElement>(null);
  const inViewport = useRef(true);
  const headingId = useId();
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(preference.matches);
    updatePreference();
    preference.addEventListener("change", updatePreference);
    const updateVisibility = () => setVisible(inViewport.current && !document.hidden);
    document.addEventListener("visibilitychange", updateVisibility);
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            ([entry]) => {
              inViewport.current = entry.isIntersecting;
              updateVisibility();
            },
            { threshold: 0.05 },
          );
    if (root.current) observer?.observe(root.current);
    return () => {
      preference.removeEventListener("change", updatePreference);
      document.removeEventListener("visibilitychange", updateVisibility);
      observer?.disconnect();
    };
  }, []);
  const running = !paused && visible && !reducedMotion;
  return (
    <MotionContext.Provider value={running}>
      <section
        ref={root}
        className={`not-prose ${styles.demo}`}
        aria-labelledby={headingId}
        data-motion={running ? "running" : "paused"}
      >
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>FROM SILICON TO A SWITCH</p>
            <h3 id={headingId}>What makes charge move?</h3>
          </div>
          <button
            type="button"
            className={styles.motionButton}
            aria-pressed={paused}
            onClick={() => setPaused(!paused)}
            disabled={reducedMotion}
          >
            {reducedMotion ? "Reduced motion" : paused ? "▶ Resume animation" : "Ⅱ Pause animation"}
          </button>
        </header>
        <Choice
          label="Semiconductor view"
          value={view}
          onChange={setView}
          choices={[
            { value: "lattice", label: "1 · Crystal and doping" },
            { value: "junction", label: "2 · The PN junction" },
            { value: "transistor", label: "3 · Two transistor families" },
            { value: "real", label: "4 · Real transistors" },
          ]}
        />
        <div hidden={view !== "lattice"}>
          <MotionContext.Provider value={running && view === "lattice"}>
            <LatticeView />
          </MotionContext.Provider>
        </div>
        <div hidden={view !== "junction"}>
          <JunctionView />
        </div>
        <div hidden={view !== "transistor"}>
          <TransistorView />
        </div>
        <div hidden={view !== "real"}>
          <RealTransistorsView />
        </div>
      </section>
    </MotionContext.Provider>
  );
}
