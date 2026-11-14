// The grand piano action in side view, the player on the left: key, wippen,
// jack, repetition lever, hammer, backcheck and damper, drawn from the
// action model's few numbers. Lengths in millimetres, y up. The proportions
// follow a real grand action loosely, squeezed to fit a screen.

import {
  type ActionParts,
  type ActionState,
  checkHeight,
  jackHeight,
  LET_OFF,
  RATIO,
  repetitionHeight,
} from "src/lib/piano/action";
import { arc, type Pose, type Pt, place, rect, type Scene, spring, type View } from "./actionScene";

export const GRAND_VIEW: View = { x0: -12, x1: 700, y0: -24, y1: 252 };

const KEY_PIVOT: Pt = [210, 0];
const KEY_END = 540;
const KEY_ANGLE = Math.atan2(10, KEY_PIVOT[0]); // the front goes down 10 mm
const CAPSTAN_X = 300;
const WIPPEN_PIVOT: Pt = [392, 54];
const JACK_PIVOT: Pt = [272, 50];
const JACK_TOP = 99;
const REP_PIVOT: Pt = [328, 93];
const REP_TIP_X = 274;
const SHANK_PIVOT: Pt = [250, 110];
const KNUCKLE: Pt = [276, 104];
const KNUCKLE_R = 5;
const HEAD_X = 470;
const HEAD_TOP = 160;
const BRIDGE_X = 1180; // off screen: the far end of the speaking length
const CHECK_X = 497;
const DAMPER_X = 548;
const UNDERLEVER_PIVOT: Pt = [640, 36];
const PAD_X = 528;
const JACK_SWING_ANGLE = 0.2;

/** The key's angle for depth k: positive lowers the front. */
export const keyAngle = (k: number) => k * KEY_ANGLE;
const keyPose = (k: number): Pose => [{ pivot: KEY_PIVOT, angle: keyAngle(k) }];

/** The wippen turns so its heel stays on the capstan. */
function wippenAngle(k: number) {
  const capstan = place([CAPSTAN_X, 36], keyPose(k));
  const lift = capstan[1] - 36;
  return -Math.asin(Math.min(1, lift / (WIPPEN_PIVOT[0] - CAPSTAN_X)));
}
const wippenPose = (k: number): Pose => [{ pivot: WIPPEN_PIVOT, angle: wippenAngle(k) }];

const jackTop = (k: number) => place([JACK_PIVOT[0] + 2, JACK_TOP], wippenPose(k))[1];
const knuckleBottom = (theta: number) =>
  place([KNUCKLE[0], KNUCKLE[1] - KNUCKLE_R], [{ pivot: SHANK_PIVOT, angle: theta }])[1];

/** Shank angle per hammer height: chosen so the knuckle rides on the jack top. */
const THETA_PER_H = (() => {
  // Where the jack top would be with the key on the keybed and the jack still under.
  const target = jackTop(1) - jackTop(0);
  let lo = 0;
  let hi = 0.6;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (knuckleBottom(mid) - knuckleBottom(0) < target) lo = mid;
    else hi = mid;
  }
  return lo / RATIO;
})();

export const hammerAngle = (h: number) => h * THETA_PER_H;

/** The head leans back on its shank, so it meets the string square on. */
const HEAD_LEAN = hammerAngle(1);
const headPose = (theta: number): Pose => [
  { pivot: [HEAD_X, 112], angle: -HEAD_LEAN },
  { pivot: SHANK_PIVOT, angle: theta },
];
const STRIKE = place([HEAD_X, HEAD_TOP], headPose(hammerAngle(1)));
/** Height of the string's underside: the hammer felt touches it at h = 1. */
export const STRING_Y = STRIKE[1];
const AGRAFFE_X = STRIKE[0] - 44;

/** Where along the string the hammer strikes, from the agraffe: about a twelfth. */
export const STRIKE_AT = (STRIKE[0] - AGRAFFE_X) / (BRIDGE_X - AGRAFFE_X);

export type GrandLook = {
  parts: ActionParts;
  /** Leave the jack fixed in the wippen: the action before the escapement. */
  fixedJack?: boolean;
  /** Displacement of the string at u (0 at the agraffe, 1 at the bridge), in millimetres. */
  stringAt: (u: number) => number;
};

/** Draws the whole action for `state` into `scene`. */
export function drawGrand(scene: Scene, s: ActionState, look: GrandLook) {
  const { parts } = look;
  const m = scene.material;
  const kPose = keyPose(s.k);
  const wPose = wippenPose(s.k);
  const theta = hammerAngle(s.h);
  const hPose: Pose = [{ pivot: SHANK_PIVOT, angle: theta }];

  // The case: keybed, rails and the frame the action hangs from.
  scene.shape("keybed", rect(-12, -24, 700, -14), { material: "frame" });
  scene.shape("front rail", rect(4, -14, 26, -10), { material: "rail" });
  scene.shape(null, rect(8, -10.5, 22, -10), { material: "redFelt", bare: true });
  scene.shape(
    "balance rail",
    [
      [182, -14],
      [238, -14],
      [214, -1],
      [206, -1],
    ],
    { material: "rail" },
  );
  scene.shape("balance pin", rect(208.5, -1, 211.5, 14), { material: "metal" });

  // Damper underlever and its rail, behind the key's back end.
  if (parts.damper) drawDamper(scene, s);

  // The key, with its ivory top and the capstan screw.
  scene.shape("key", rect(0, 0, KEY_END, 22), { material: "wood" }, kPose);
  scene.shape(
    "key",
    [
      [-2, 18],
      [150, 18],
      [150, 25],
      [0, 25],
      [-2, 22],
    ],
    { material: "ivory" },
    kPose,
  );
  scene.shape("capstan", rect(CAPSTAN_X - 5, 22, CAPSTAN_X + 5, 36), { material: "brass" }, kPose);
  scene.shape(null, rect(CAPSTAN_X - 6, 34, CAPSTAN_X + 6, 36), { material: "brass" }, kPose);

  // Backcheck: a wire on the key's back end with a felt-faced block.
  if (parts.check) {
    const base = place([CHECK_X, 22], kPose);
    const catchY = tailCorner(hammerAngle(checkHeight(s.k)))[1];
    scene.line("backcheck", [base, [base[0] + 2, catchY - 10]], m.metal, 2);
    scene.shape(
      "backcheck",
      [
        [base[0] - 3, catchY - 14],
        [base[0] + 9, catchY - 14],
        [base[0] + 11, catchY + 6],
        [base[0] - 1, catchY - 1],
      ],
      { material: "wood" },
    );
    scene.shape(
      null,
      [
        [base[0] - 3, catchY - 2],
        [base[0] - 1, catchY - 1],
        [base[0] + 11, catchY + 6],
        [base[0] + 10, catchY + 7],
      ],
      { material: "leather", bare: true },
    );
  }

  // Frame parts the action hangs from.
  scene.shape("wippen rail", rect(378, 58, 420, 76), { material: "rail" });
  scene.shape("hammer flange rail", rect(214, 96, 244, 120), { material: "rail" });
  scene.shape("hammer rest rail", rect(360, 96, 400, 104), { material: "rail" });
  scene.shape(null, rect(362, 104, 398, 106.5), { material: "felt", bare: true });

  // The wippen, its flange, heel cushion and the jack.
  scene.shape(
    "wippen",
    [
      [246, 40],
      [395, 47],
      [397, 58],
      [380, 58],
      [300, 52],
      [250, 52],
      [246, 48],
    ],
    { material: "wood" },
    wPose,
  );
  scene.shape(
    "wippen",
    rect(CAPSTAN_X - 9, 36.5, CAPSTAN_X + 9, 40),
    { material: "redFelt" },
    wPose,
  );
  scene.shape(null, arc(WIPPEN_PIVOT, 2.2), { material: "metal" });
  if (parts.repetition) drawRepetition(scene, s, wPose, theta);
  drawJack(scene, s, look, wPose);

  // Let-off button, over the jack's toe.
  if (parts.escapement) {
    const toe = place([JACK_PIVOT[0] - 22, 59.6], wippenPose(LET_OFF));
    scene.line(
      "let-off button",
      [
        [toe[0], toe[1] + 3],
        [toe[0], 92],
      ],
      m.metal,
      1.6,
    );
    scene.shape("let-off button", rect(toe[0] - 6, toe[1], toe[0] + 6, toe[1] + 4), {
      material: "redFelt",
    });
    scene.shape("let-off rail", rect(toe[0] - 12, 86, toe[0] + 12, 94), { material: "rail" });
  }

  // The hammer: shank, knuckle, molding, felt and tail.
  scene.shape(
    "hammer shank",
    rect(SHANK_PIVOT[0] - 4, 107.5, HEAD_X - 6, 112.5),
    { material: "wood" },
    hPose,
  );
  scene.shape("hammer flange", rect(236, 104, 256, 116), { material: "wood" });
  scene.shape(null, arc(SHANK_PIVOT, 2), { material: "metal" });
  scene.shape("knuckle", arc(KNUCKLE, KNUCKLE_R), { material: "leather" }, hPose);
  // Molding, then a hard underfelt, then the white top felt that meets the string.
  scene.shape(
    "hammer head",
    [[HEAD_X - 12, 132], [HEAD_X + 12, 132], ...arc([HEAD_X, 148], 12, 0, Math.PI, 16)],
    { material: "hammerFelt" },
    headPose(theta),
  );
  scene.shape(
    "hammer head",
    [[HEAD_X - 8.5, 132], [HEAD_X + 8.5, 132], ...arc([HEAD_X, 143], 8.5, 0, Math.PI, 14)],
    { material: "redFelt" },
    headPose(theta),
  );
  scene.shape(
    "hammer head",
    [
      [HEAD_X - 7, 112],
      [HEAD_X + 7, 112],
      [HEAD_X + 6, 134],
      ...arc([HEAD_X, 134], 6, 0, Math.PI, 8),
      [HEAD_X - 6, 134],
    ],
    { material: "wood" },
    headPose(theta),
  );
  scene.shape(
    "hammer head",
    [
      [HEAD_X - 4, 98],
      [CHECK_X - 6, 97],
      [CHECK_X - 4, 104],
      [HEAD_X + 8, 112],
      [HEAD_X - 4, 112],
    ],
    { material: "wood" },
    hPose,
  );

  // The string, from the agraffe to a bridge far off to the right.
  scene.shape("agraffe", rect(AGRAFFE_X - 6, STRING_Y - 1, AGRAFFE_X + 2, STRING_Y + 18), {
    material: "brass",
  });
  scene.shape("plate", rect(AGRAFFE_X - 30, STRING_Y + 14, 506, STRING_Y + 30), {
    material: "frame",
  });
  const string: Pt[] = [];
  for (let x = AGRAFFE_X; x <= 704; x += 2) {
    string.push([x, STRING_Y + 1.2 + look.stringAt((x - AGRAFFE_X) / (BRIDGE_X - AGRAFFE_X))]);
  }
  scene.line("string", string, scene.dark ? "#c9ced3" : "#6d747b", 2.4);

  if (parts.damper) drawDamperHead(scene, s);
}

/** The bottom corner of the hammer tail, where the backcheck catches it. */
function tailCorner(theta: number) {
  return place([CHECK_X - 6, 97], [{ pivot: SHANK_PIVOT, angle: theta }]);
}

function drawJack(scene: Scene, s: ActionState, look: GrandLook, wPose: Pose) {
  const swing = look.fixedJack ? 0 : s.jackSwing * JACK_SWING_ANGLE;
  const pose: Pose = [{ pivot: JACK_PIVOT, angle: swing }, ...wPose];
  if (look.fixedJack) {
    scene.shape(
      "jack",
      rect(JACK_PIVOT[0] - 4, 48, JACK_PIVOT[0] + 8, JACK_TOP),
      { material: "wood" },
      pose,
    );
    return;
  }
  scene.shape(
    "jack",
    [
      [JACK_PIVOT[0] - 28, 60],
      [JACK_PIVOT[0] - 2, 58],
      [JACK_PIVOT[0] - 2, JACK_TOP - 1],
      [JACK_PIVOT[0] + 6, JACK_TOP],
      [JACK_PIVOT[0] + 6, 52],
      [JACK_PIVOT[0] - 4, 50],
      [JACK_PIVOT[0] - 28, 56],
    ],
    { material: "wood" },
    pose,
  );
  scene.shape(null, arc(JACK_PIVOT, 2, 0, 2 * Math.PI, 12), { material: "metal" }, wPose);
  // The jack spring pulls the jack back under the hammer.
  spring(
    scene,
    place([JACK_PIVOT[0] + 6, 70], pose),
    place([JACK_PIVOT[0] + 22, 66], wPose),
    4,
    2.5,
  );
}

function drawRepetition(scene: Scene, s: ActionState, wPose: Pose, theta: number) {
  // The lever's tip sits under the knuckle beside the jack. Its spring lifts the
  // hammer once the jack has tripped; while the jack carries the hammer, the
  // knuckle presses the tip down.
  const holding = Math.min(s.h, repetitionHeight(s.k));
  const tipY = Math.min(knuckleBottom(hammerAngle(holding)), knuckleBottom(theta)) - 0.3;
  const pivot = place(REP_PIVOT, wPose);
  const rest = place([REP_TIP_X, REP_PIVOT[1] + 4], wPose);
  const reach = rest[0] - pivot[0];
  const angle = Math.asin(Math.max(-0.5, Math.min(0.5, (tipY - rest[1]) / reach)));
  const pose: Pose = [...wPose, { pivot, angle }];
  scene.shape(
    "repetition flange",
    rect(REP_PIVOT[0] - 4, 49, REP_PIVOT[0] + 4, REP_PIVOT[1]),
    { material: "wood" },
    wPose,
  );
  spring(
    scene,
    place([REP_TIP_X + 22, REP_PIVOT[1] - 3], pose),
    place([REP_TIP_X + 22, 51], wPose),
    4,
    2.5,
  );
  scene.shape(
    "repetition lever",
    [
      [REP_TIP_X, REP_PIVOT[1] + 4],
      [REP_PIVOT[0] + 26, REP_PIVOT[1] + 3],
      [REP_PIVOT[0] + 26, REP_PIVOT[1] - 3],
      [REP_TIP_X + 6, REP_PIVOT[1] - 3],
    ],
    { material: "wood" },
    pose,
  );
  scene.shape(null, arc(REP_PIVOT, 2, 0, 2 * Math.PI, 12), { material: "metal" }, wPose);
}

function underleverAngle(lift: number) {
  // The damper head rises 6 mm at full lift.
  return -Math.asin((6 * lift) / (UNDERLEVER_PIVOT[0] - DAMPER_X));
}

function drawDamper(scene: Scene, s: ActionState) {
  const pose: Pose = [{ pivot: UNDERLEVER_PIVOT, angle: underleverAngle(s.damper) }];
  scene.shape(
    "damper underlever",
    rect(PAD_X - 14, 34, UNDERLEVER_PIVOT[0] + 6, 42),
    { material: "wood" },
    pose,
  );
  scene.shape(
    "damper underlever",
    rect(PAD_X - 8, 28, PAD_X + 8, 34),
    { material: "redFelt" },
    pose,
  );
  scene.shape("damper rail", rect(UNDERLEVER_PIVOT[0] - 4, 22, 700, 32), { material: "rail" });
  scene.shape(null, arc(UNDERLEVER_PIVOT, 2.2), { material: "metal" });
  // The pedal tray lifts every underlever at once.
  const tray = s.pedal ? 6 : 0;
  scene.shape("pedal tray", rect(586, 22 + tray, 620, 27 + tray), { material: "metal" });
}

function drawDamperHead(scene: Scene, s: ActionState) {
  const lift = 6 * s.damper;
  const base = place(
    [DAMPER_X, 42],
    [{ pivot: UNDERLEVER_PIVOT, angle: underleverAngle(s.damper) }],
  );
  scene.line("damper wire", [base, [DAMPER_X, STRING_Y + 6 + lift]], scene.material.metal, 1.8);
  const y = STRING_Y + 2.4 + lift;
  scene.shape("damper", rect(DAMPER_X - 20, y + 4, DAMPER_X + 20, y + 26), { material: "wood" });
  scene.shape(
    "damper",
    [
      [DAMPER_X - 18, y + 4],
      [DAMPER_X + 18, y + 4],
      [DAMPER_X + 12, y],
      [DAMPER_X - 12, y],
    ],
    { material: "damperFelt" },
  );
}

/** Wippen, jack top and knuckle positions, for tests. */
export const grandProbe = {
  jackTop,
  knuckleBottom,
  wippenAngle,
  jackHeight,
};
