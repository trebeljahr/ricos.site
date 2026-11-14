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

export const GRAND_VIEW: View = { x0: -12, x1: 700, y0: -24, y1: 240 };

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
  /** How hard the string rings, 0 silent … 1 just struck hard. */
  ring?: number;
};

/** A felt hammer crown: flat base `hw` wide each side at `base`, rounded up to `top`. */
function crown(cx: number, hw: number, base: number, top: number, steps = 18): Pt[] {
  const points: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (Math.PI * i) / steps;
    const c = Math.cos(a);
    const s = Math.sin(a);
    // A bullet: straight-ish flanks, a full round crown.
    points.push([cx + hw * c * (1 - 0.18 * s * s), base + (top - base) * s ** 0.62]);
  }
  return points;
}

/** Draws the whole action for `state` into `scene`. */
export function drawGrand(scene: Scene, s: ActionState, look: GrandLook) {
  const { parts } = look;
  const m = scene.material;
  const kPose = keyPose(s.k);
  const wPose = wippenPose(s.k);
  const theta = hammerAngle(s.h);
  const hPose: Pose = [{ pivot: SHANK_PIVOT, angle: theta }];

  // The case: keybed, front rail and balance rail.
  scene.shape("keybed", rect(-12, -24, 700, -14), { material: "frame" });
  scene.shape("front rail", rect(4, -14, 30, -9), { material: "rail" });
  scene.shape(null, rect(9, -9, 25, -7), { material: "redFelt", bare: true });
  scene.shape(
    "balance rail",
    [
      [178, -14],
      [242, -14],
      [218, -2],
      [202, -2],
    ],
    { material: "rail" },
  );
  scene.shape(null, rect(203, -2, 217, 0), { material: "redFelt", bare: true });

  // Damper underlever and its rail, behind the key's back end.
  if (parts.damper) drawDamper(scene, s);

  // The key: wood, an ivory top, two lead weights, the capstan screw.
  scene.shape(
    "key",
    [
      [0, 2],
      [2, 0],
      [KEY_END - 2, 0],
      [KEY_END, 2],
      [KEY_END, 21],
      [KEY_END - 2, 22],
      [0, 22],
    ],
    { material: "wood" },
    kPose,
  );
  scene.shape(
    "key",
    [
      [-3, 15],
      [-1, 13],
      [148, 22],
      [150, 27],
      [0, 27],
      [-3, 25],
    ],
    { material: "ivory", plain: true },
    kPose,
  );
  for (const x of [58, 92]) {
    scene.shape(
      "key lead",
      arc([x, 9], 5.2, 0, 2 * Math.PI, 16),
      { material: "metal", plain: true },
      kPose,
    );
  }
  scene.shape("balance pin", rect(208.5, -2, 211.5, 16), { material: "metal", plain: true });
  scene.shape(
    "capstan",
    [[CAPSTAN_X - 5, 22], [CAPSTAN_X + 5, 22], ...arc([CAPSTAN_X, 31.5], 5, 0, Math.PI, 8)],
    { material: "brass", plain: true },
    kPose,
  );

  // Backcheck: a wire on the key's back end with a felt-faced block.
  if (parts.check) {
    const base = place([CHECK_X, 22], kPose);
    const catchY = tailCorner(hammerAngle(checkHeight(s.k)))[1];
    scene.line("backcheck", [base, [base[0] + 2, catchY - 12]], m.metal, 2.2);
    scene.shape(
      "backcheck",
      [
        [base[0] - 4, catchY - 16],
        [base[0] + 9, catchY - 16],
        [base[0] + 12, catchY + 7],
        [base[0] - 2, catchY - 1],
      ],
      { material: "wood" },
    );
    scene.shape(
      "backcheck",
      [
        [base[0] - 3, catchY - 3],
        [base[0] - 1, catchY - 0.5],
        [base[0] + 12, catchY + 7],
        [base[0] + 10, catchY + 8.5],
      ],
      { material: "leather", bare: true },
    );
  }

  scene.shape("wippen rail", rect(380, 58, 426, 76), { material: "rail" });
  scene.shape("hammer flange rail", rect(208, 100, 244, 126), { material: "rail" });
  scene.shape("hammer rest rail", rect(356, 94, 402, 103), { material: "rail" });
  scene.shape(null, rect(358, 103, 400, 106.5), { material: "felt", bare: true });

  // The wippen, its heel cushion and flange, then the jack.
  scene.shape(
    "wippen",
    [
      [244, 46],
      [254, 40],
      [300, 39],
      [350, 42],
      [388, 47],
      [398, 51],
      [398, 58],
      [384, 60],
      [350, 55],
      [300, 53],
      [254, 53],
      [245, 50],
    ],
    { material: "wood" },
    wPose,
  );
  scene.shape(
    "wippen",
    rect(CAPSTAN_X - 10, 35.8, CAPSTAN_X + 10, 39.5),
    { material: "redFelt", plain: true },
    wPose,
  );
  scene.shape("wippen flange", rect(386, 48, 399, 62), { material: "wood", plain: true });
  scene.pin(WIPPEN_PIVOT, undefined, 2.4);
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
      1.8,
    );
    scene.shape(
      "let-off button",
      [
        [toe[0] - 6, toe[1] + 7],
        [toe[0] + 6, toe[1] + 7],
        ...arc([toe[0], toe[1] + 6], 6, 0, -Math.PI, 8).slice(1, -1),
      ],
      { material: "redFelt", plain: true },
    );
    scene.shape("let-off rail", rect(toe[0] - 13, 86, toe[0] + 13, 95), { material: "rail" });
  }

  // The hammer: tail, shank, flange, knuckle, molding and felt.
  scene.shape(
    "hammer head",
    [
      [HEAD_X - 6, 112],
      [HEAD_X + 6, 113],
      [HEAD_X + 16, 109],
      [CHECK_X - 2, 103],
      [CHECK_X - 6, 97],
      [HEAD_X + 6, 98],
      [HEAD_X - 4, 102],
    ],
    { material: "wood" },
    hPose,
  );
  scene.shape(
    "hammer shank",
    [
      [SHANK_PIVOT[0] - 3, 107],
      [HEAD_X - 4, 107.8],
      [HEAD_X - 4, 112.6],
      [SHANK_PIVOT[0] - 3, 113.2],
    ],
    { material: "wood" },
    hPose,
  );
  scene.shape(
    "hammer flange",
    [
      [234, 113],
      [234, 101],
      [244, 100],
      [258, 104],
      [258, 116],
      [244, 116],
    ],
    { material: "wood" },
  );
  scene.pin(SHANK_PIVOT, undefined, 2.2);
  scene.shape(
    "knuckle",
    [
      ...arc([KNUCKLE[0], KNUCKLE[1]], KNUCKLE_R, Math.PI, 2 * Math.PI, 12),
      [KNUCKLE[0] + KNUCKLE_R, 108],
      [KNUCKLE[0] - KNUCKLE_R, 108],
    ],
    { material: "leather" },
    hPose,
  );
  const head = headPose(theta);
  scene.shape(
    "hammer head",
    [
      [HEAD_X - 8, 104],
      [HEAD_X + 8, 104],
      [HEAD_X + 6.5, 132],
      [HEAD_X - 6.5, 132],
    ],
    { material: "wood" },
    head,
  );
  scene.shape(
    "hammer head",
    crown(HEAD_X, 14.5, 124, 156),
    { material: "redFelt", plain: true },
    head,
  );
  scene.shape("hammer head", crown(HEAD_X, 12.5, 127, HEAD_TOP), { material: "hammerFelt" }, head);
  scene.pin([HEAD_X, 110], head, 1.4);

  // Pinblock, plate, tuning pin and agraffe: the string's short end, toward the
  // player. The plate lies on the pinblock; the string runs over both.
  const pinX = AGRAFFE_X - 140;
  const left = AGRAFFE_X - 200;
  scene.shape("pinblock", rect(left, STRING_Y - 46, AGRAFFE_X - 4, STRING_Y - 15), {
    material: "rail",
  });
  scene.shape(
    "plate",
    [
      [left, STRING_Y - 15],
      [AGRAFFE_X + 2, STRING_Y - 15],
      [AGRAFFE_X + 8, STRING_Y - 26],
      [AGRAFFE_X + 16, STRING_Y - 26],
      [AGRAFFE_X + 12, STRING_Y - 6],
      [left, STRING_Y - 6],
    ],
    { material: "brass" },
  );
  for (const x of [left + 40, AGRAFFE_X - 60]) scene.pin([x, STRING_Y - 10.5], undefined, 2.4);
  scene.shape("tuning pin", rect(pinX - 3.2, STRING_Y - 34, pinX + 3.2, STRING_Y + 14), {
    material: "metal",
    plain: true,
  });
  scene.shape(
    "agraffe",
    [
      [AGRAFFE_X - 5, STRING_Y - 6],
      [AGRAFFE_X + 5, STRING_Y - 6],
      [AGRAFFE_X + 4, STRING_Y + 5],
      [AGRAFFE_X - 4, STRING_Y + 5],
    ],
    { material: "brass", plain: true },
  );

  // The string: wound on the tuning pin, through the agraffe, out to a bridge far off to the right.
  const string: Pt[] = [[pinX, STRING_Y + 3]];
  for (let x = AGRAFFE_X; x <= 704; x += 2) {
    string.push([x, STRING_Y + 1.2 + look.stringAt((x - AGRAFFE_X) / (BRIDGE_X - AGRAFFE_X))]);
  }
  scene.line("string", string, scene.dark ? "#c9ced3" : "#9aa1a8", 2.6);
  scene.shape(null, rect(pinX - 4.4, STRING_Y - 1, pinX + 4.4, STRING_Y + 6), {
    material: "metal",
    plain: true,
  });

  if (parts.damper) drawDamperHead(scene, s);
  ringMarks(scene, [STRIKE[0] + 70, STRING_Y + 8], look.ring ?? 0);
}

/** Little curved strokes beside a ringing string, as an ink drawing shows sound. */
export function ringMarks(scene: Scene, at: Pt, ring: number) {
  const level = Math.min(1, ring * 1.6);
  if (level < 0.08) return;
  const { ctx } = scene;
  const [x, y] = scene.px(at);
  ctx.save();
  ctx.strokeStyle = scene.outline;
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(1.2, scene.ink * 0.8);
  ctx.globalAlpha = 0.3 + 0.6 * level;
  for (let i = 0; i < 3; i++) {
    const r = 8 + i * 6 + level * 3;
    ctx.beginPath();
    ctx.arc(x, y, r, -Math.PI / 2 - 0.5, -Math.PI / 2 + 0.5);
    ctx.stroke();
  }
  ctx.restore();
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
      [JACK_PIVOT[0] - 30, 59],
      [JACK_PIVOT[0] - 27, 61],
      [JACK_PIVOT[0] - 2, 59],
      [JACK_PIVOT[0] - 2, JACK_TOP - 1],
      [JACK_PIVOT[0] + 6, JACK_TOP],
      [JACK_PIVOT[0] + 6, 52],
      [JACK_PIVOT[0] - 4, 49],
      [JACK_PIVOT[0] - 28, 55],
    ],
    { material: "wood" },
    pose,
  );
  scene.pin(JACK_PIVOT, wPose, 1.8);
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
    [
      [REP_PIVOT[0] - 6, 50],
      [REP_PIVOT[0] + 6, 50],
      [REP_PIVOT[0] + 4, REP_PIVOT[1] + 2],
      [REP_PIVOT[0] - 4, REP_PIVOT[1] + 2],
    ],
    { material: "wood", plain: true },
    wPose,
  );
  spring(
    scene,
    place([REP_TIP_X + 22, REP_PIVOT[1] - 3], pose),
    place([REP_TIP_X + 22, 52], wPose),
    4,
    2.5,
  );
  scene.shape(
    "repetition lever",
    [
      [REP_TIP_X, REP_PIVOT[1] + 4],
      [REP_TIP_X + 30, REP_PIVOT[1] + 4.5],
      [REP_PIVOT[0] + 28, REP_PIVOT[1] + 3],
      [REP_PIVOT[0] + 30, REP_PIVOT[1]],
      [REP_PIVOT[0] + 28, REP_PIVOT[1] - 3],
      [REP_TIP_X + 8, REP_PIVOT[1] - 3.5],
      [REP_TIP_X + 2, REP_PIVOT[1] - 1],
    ],
    { material: "wood" },
    pose,
  );
  scene.pin(REP_PIVOT, wPose, 1.8);
}

function underleverAngle(lift: number) {
  // The damper head rises 6 mm at full lift.
  return -Math.asin((6 * lift) / (UNDERLEVER_PIVOT[0] - DAMPER_X));
}

function drawDamper(scene: Scene, s: ActionState) {
  const pose: Pose = [{ pivot: UNDERLEVER_PIVOT, angle: underleverAngle(s.damper) }];
  scene.shape(
    "damper underlever",
    [
      [PAD_X - 16, 36],
      [PAD_X - 12, 33],
      [UNDERLEVER_PIVOT[0] + 4, 33],
      [UNDERLEVER_PIVOT[0] + 8, 37],
      [UNDERLEVER_PIVOT[0] + 4, 42],
      [PAD_X - 12, 43],
    ],
    { material: "wood" },
    pose,
  );
  scene.shape(
    "damper underlever",
    rect(PAD_X - 9, 28, PAD_X + 9, 33.2),
    { material: "redFelt", plain: true },
    pose,
  );
  scene.shape("damper rail", rect(UNDERLEVER_PIVOT[0] - 4, 20, 700, 30), { material: "rail" });
  scene.pin(UNDERLEVER_PIVOT, undefined, 2.2);
  // The pedal tray lifts every underlever at once.
  const tray = s.pedal ? 6 : 0;
  scene.shape("pedal tray", rect(584, 22 + tray, 622, 27 + tray), { material: "metal" });
}

function drawDamperHead(scene: Scene, s: ActionState) {
  const lift = 6 * s.damper;
  const base = place(
    [DAMPER_X, 42],
    [{ pivot: UNDERLEVER_PIVOT, angle: underleverAngle(s.damper) }],
  );
  // The guide rail keeps the wire straight on its way up past the hammers.
  scene.line("damper wire", [base, [DAMPER_X, STRING_Y + 8 + lift]], scene.material.metal, 2);
  scene.shape("damper guide rail", rect(DAMPER_X - 16, 128, DAMPER_X + 16, 138), {
    material: "rail",
  });
  scene.shape(null, rect(DAMPER_X - 3, 129, DAMPER_X + 3, 137), {
    material: "redFelt",
    bare: true,
  });
  const y = STRING_Y + 2.4 + lift;
  scene.shape(
    "damper",
    [
      [DAMPER_X - 22, y + 6],
      [DAMPER_X + 22, y + 6],
      [DAMPER_X + 20, y + 26],
      [DAMPER_X - 20, y + 26],
    ],
    { material: "wood" },
  );
  scene.shape(
    "damper",
    [
      [DAMPER_X - 19, y + 6],
      [DAMPER_X + 19, y + 6],
      [DAMPER_X + 13, y],
      [DAMPER_X - 13, y],
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
