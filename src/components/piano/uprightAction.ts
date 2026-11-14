// The upright action in side view, the player on the left and the strings
// standing up on the right: the same key, wippen and jack as a grand, but
// the hammer swings sideways into the string and a spring and a bridle tape
// bring it back instead of its weight. The damper sits below the hammer.

import { type ActionState, checkHeight, LET_OFF, RATIO } from "src/lib/piano/action";
import { arc, type Pose, type Pt, place, rect, type Scene, spring, type View } from "./actionScene";
import { type GrandLook, ringMarks } from "./grandAction";

export const UPRIGHT_VIEW: View = { x0: 96, x1: 560, y0: -24, y1: 404 };

const KEY_PIVOT: Pt = [210, 0];
const KEY_END = 430;
const KEY_ANGLE = Math.atan2(10, KEY_PIVOT[0]);
const CAPSTAN_X = 380;
const WIPPEN_PIVOT: Pt = [478, 60];
const JACK_PIVOT: Pt = [404, 56];
const JACK_TOP = 140;
const BUTT_PIVOT: Pt = [424, 158];
const NOTCH_X = 404;
const SHANK_TOP: Pt = [440, 322];
const HEAD: Pt = [452, 334];
const FACE_X = 470;
const PRESSURE_BAR_Y = 384;
const BRIDGE_Y = -620; // off screen: the far end of the speaking length
const DAMPER_PIVOT: Pt = [500, 168];
const DAMPER_Y = 286;
const CATCHER: Pt = [452, 158];

const keyPose = (k: number): Pose => [{ pivot: KEY_PIVOT, angle: k * KEY_ANGLE }];

function wippenAngle(k: number) {
  const capstan = place([CAPSTAN_X, 36], keyPose(k));
  return -Math.asin(Math.min(1, (capstan[1] - 36) / (WIPPEN_PIVOT[0] - CAPSTAN_X)));
}
const wippenPose = (k: number): Pose => [{ pivot: WIPPEN_PIVOT, angle: wippenAngle(k) }];

const jackTopY = (k: number) => place([JACK_PIVOT[0], JACK_TOP], wippenPose(k))[1];
/** The hammer turns clockwise (negative) toward the string. */
const notchY = (phi: number) =>
  place([NOTCH_X, JACK_TOP + 1], [{ pivot: BUTT_PIVOT, angle: -phi }])[1];
const faceX = (phi: number) => place([FACE_X, HEAD[1]], [{ pivot: BUTT_PIVOT, angle: -phi }])[0];

const PHI_PER_H = (() => {
  const target = jackTopY(1) - jackTopY(0);
  let lo = 0;
  let hi = 0.6;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (notchY(mid) - notchY(0) < target) lo = mid;
    else hi = mid;
  }
  return lo / RATIO;
})();

const hammerAngle = (h: number) => h * PHI_PER_H;
const STRING_X = faceX(hammerAngle(1));

export const UPRIGHT_STRIKE_AT = (PRESSURE_BAR_Y - HEAD[1]) / (PRESSURE_BAR_Y - BRIDGE_Y);

export function drawUpright(scene: Scene, s: ActionState, look: GrandLook) {
  const m = scene.material;
  const kPose = keyPose(s.k);
  const wPose = wippenPose(s.k);
  const phi = hammerAngle(s.h);
  const hPose: Pose = [{ pivot: BUTT_PIVOT, angle: -phi }];

  // Case and the strings' frame.
  scene.shape("keybed", rect(-12, -24, 600, -14), { material: "frame" });
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
  scene.shape("plate", rect(STRING_X + 6, -30, STRING_X + 40, 410), { material: "brass" });
  scene.shape("soundboard", rect(STRING_X + 40, -30, STRING_X + 70, 410), { material: "wood" });
  scene.shape("pressure bar", rect(STRING_X - 8, PRESSURE_BAR_Y, STRING_X + 4, 398), {
    material: "metal",
  });

  // Key and capstan.
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
  scene.shape(
    "key lead",
    arc([118, 9], 5.2, 0, 2 * Math.PI, 16),
    { material: "metal", plain: true },
    kPose,
  );
  scene.shape("balance pin", rect(208.5, -1, 211.5, 16), { material: "metal", plain: true });
  scene.shape(
    "capstan",
    [[CAPSTAN_X - 5, 22], [CAPSTAN_X + 5, 22], ...arc([CAPSTAN_X, 31.5], 5, 0, Math.PI, 8)],
    { material: "brass", plain: true },
    kPose,
  );

  // The main rail the action hangs on.
  scene.shape("main rail", rect(458, 150, 488, 176), { material: "rail" });
  scene.shape("hammer rest rail", rect(392, 232, 412, 246), { material: "rail" });
  scene.shape(null, rect(412, 232, 415, 246), { material: "felt", bare: true });

  // Damper lever: its foot is pushed by the spoon on the wippen, or by the pedal rod.
  const damperAngle = 0.07 * s.damper;
  const dPose: Pose = [{ pivot: DAMPER_PIVOT, angle: damperAngle }];
  scene.shape(
    "damper lever",
    rect(DAMPER_PIVOT[0] - 4, 96, DAMPER_PIVOT[0] + 4, DAMPER_Y - 6),
    { material: "wood" },
    dPose,
  );
  scene.pin(DAMPER_PIVOT, undefined, 2);
  const dHead: Pt[] = rect(STRING_X - 26, DAMPER_Y - 14, STRING_X - 6, DAMPER_Y + 14);
  scene.line(
    "damper wire",
    [
      [DAMPER_PIVOT[0], DAMPER_Y - 6],
      [STRING_X - 26, DAMPER_Y],
    ],
    m.metal,
    1.8,
    dPose,
  );
  scene.shape("damper", dHead, { material: "wood" }, dPose);
  scene.shape(
    "damper",
    rect(STRING_X - 6, DAMPER_Y - 12, STRING_X - 1.2, DAMPER_Y + 12),
    { material: "damperFelt" },
    dPose,
  );
  scene.shape(
    "pedal rod",
    rect(
      DAMPER_PIVOT[0] + 4 + (s.pedal ? 4 : 0),
      104,
      DAMPER_PIVOT[0] + 10 + (s.pedal ? 4 : 0),
      118,
    ),
    { material: "metal" },
  );

  // The wippen with its spoon, jack, backcheck wire and bridle wire.
  scene.shape(
    "wippen",
    [
      [362, 40],
      [482, 50],
      [482, 66],
      [440, 62],
      [366, 52],
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
  scene.pin(WIPPEN_PIVOT, undefined, 2.2);
  scene.line(
    "damper spoon",
    [
      [484, 62],
      [494, 82],
      [DAMPER_PIVOT[0] - 3, 100],
    ],
    m.metal,
    2.4,
    wPose,
  );

  // Backcheck on the wippen, catching the catcher on the hammer butt.
  const catchAt = place(
    [CATCHER[0], CATCHER[1]],
    [{ pivot: BUTT_PIVOT, angle: -hammerAngle(checkHeight(s.k)) }],
  );
  const checkBase = place([444, 62], wPose);
  scene.line("backcheck", [checkBase, [catchAt[0] + 6, catchAt[1] - 18]], m.metal, 2);
  scene.shape(
    "backcheck",
    [
      [catchAt[0] + 1, catchAt[1] - 20],
      [catchAt[0] + 12, catchAt[1] - 20],
      [catchAt[0] + 12, catchAt[1] + 4],
      [catchAt[0] + 3, catchAt[1] - 2],
    ],
    { material: "wood" },
  );
  scene.shape(null, rect(catchAt[0] + 1, catchAt[1] - 3, catchAt[0] + 4, catchAt[1] + 2), {
    material: "leather",
    bare: true,
  });

  // The jack and its toe under the let-off button.
  const jPose: Pose = [{ pivot: JACK_PIVOT, angle: s.jackSwing * 0.18 }, ...wPose];
  scene.shape(
    "jack",
    [
      [JACK_PIVOT[0] - 28, 66],
      [JACK_PIVOT[0] - 4, 64],
      [JACK_PIVOT[0] - 4, JACK_TOP],
      [JACK_PIVOT[0] + 4, JACK_TOP],
      [JACK_PIVOT[0] + 6, 58],
      [JACK_PIVOT[0] - 2, 54],
      [JACK_PIVOT[0] - 28, 60],
    ],
    { material: "wood" },
    jPose,
  );
  scene.pin(JACK_PIVOT, wPose, 1.8);
  spring(
    scene,
    place([JACK_PIVOT[0] + 4, 80], jPose),
    place([JACK_PIVOT[0] + 22, 76], wPose),
    4,
    2.5,
  );
  const toe = place([JACK_PIVOT[0] - 22, 66], wippenPose(LET_OFF));
  scene.line(
    "let-off button",
    [
      [toe[0], toe[1] + 3],
      [toe[0], 100],
    ],
    m.metal,
    1.6,
  );
  scene.shape("let-off button", rect(toe[0] - 6, toe[1], toe[0] + 6, toe[1] + 4), {
    material: "redFelt",
  });
  scene.shape("let-off rail", rect(toe[0] - 12, 96, toe[0] + 12, 104), { material: "rail" });

  // The hammer: butt with its leather notch and catcher, shank, head.
  scene.shape(
    "hammer butt",
    [
      [NOTCH_X - 6, JACK_TOP + 1],
      [BUTT_PIVOT[0] + 10, JACK_TOP + 1],
      [BUTT_PIVOT[0] + 12, BUTT_PIVOT[1] + 12],
      [NOTCH_X - 4, BUTT_PIVOT[1] + 14],
    ],
    { material: "wood" },
    hPose,
  );
  scene.shape(
    "hammer butt",
    rect(NOTCH_X - 6, JACK_TOP + 1, NOTCH_X + 8, JACK_TOP + 4),
    { material: "leather" },
    hPose,
  );
  scene.shape(
    "catcher",
    [
      [BUTT_PIVOT[0] + 10, BUTT_PIVOT[1] + 4],
      [CATCHER[0], CATCHER[1] - 2],
      [CATCHER[0], CATCHER[1] + 4],
      [BUTT_PIVOT[0] + 10, BUTT_PIVOT[1] + 10],
    ],
    { material: "wood" },
    hPose,
  );
  scene.pin(BUTT_PIVOT, undefined, 2);
  spring(
    scene,
    place([BUTT_PIVOT[0] - 4, BUTT_PIVOT[1] + 14], hPose),
    [BUTT_PIVOT[0] - 18, 176],
    4,
    2.5,
  );
  // Bridle tape from the wippen's bridle wire to the butt.
  const bridleWire = place([424, 58], wPose);
  const wireTop: Pt = [bridleWire[0] - 2, bridleWire[1] + 46];
  scene.line("bridle wire", [bridleWire, wireTop], m.metal, 1.6);
  const tapeEnd = place([BUTT_PIVOT[0] - 12, BUTT_PIVOT[1] + 10], hPose);
  const sag = Math.max(0, 14 - Math.hypot(tapeEnd[0] - wireTop[0], tapeEnd[1] - wireTop[1]) / 3);
  scene.line(
    "bridle tape",
    [wireTop, [(wireTop[0] + tapeEnd[0]) / 2 - sag, (wireTop[1] + tapeEnd[1]) / 2], tapeEnd],
    scene.dark ? "#e6dccb" : "#efe6d2",
    2.6,
  );
  scene.shape(
    "hammer shank",
    [
      [BUTT_PIVOT[0] + 4, BUTT_PIVOT[1] + 10],
      [BUTT_PIVOT[0] + 10, BUTT_PIVOT[1] + 10],
      [SHANK_TOP[0] + 3, SHANK_TOP[1]],
      [SHANK_TOP[0] - 3, SHANK_TOP[1]],
    ],
    { material: "wood" },
    hPose,
  );
  scene.shape(
    "hammer head",
    [
      [HEAD[0] - 15, HEAD[1] - 19],
      [HEAD[0] + 6, HEAD[1] - 15],
      [HEAD[0] + 6, HEAD[1] + 15],
      [HEAD[0] - 15, HEAD[1] + 19],
    ],
    { material: "wood" },
    hPose,
  );
  scene.shape(
    "hammer head",
    sideCrown(HEAD[1], 15, HEAD[0] + 1, FACE_X - 3),
    { material: "redFelt", plain: true },
    hPose,
  );
  scene.shape(
    "hammer head",
    sideCrown(HEAD[1], 13, HEAD[0] + 4, FACE_X),
    { material: "hammerFelt" },
    hPose,
  );
  scene.pin([HEAD[0] - 5, HEAD[1] - 6], hPose, 1.3);

  // The string, standing up from the bridge far below to the pressure bar.
  const string: Pt[] = [];
  for (let y = -24; y <= PRESSURE_BAR_Y; y += 2) {
    string.push([
      STRING_X + 1.2 + look.stringAt((PRESSURE_BAR_Y - y) / (PRESSURE_BAR_Y - BRIDGE_Y)),
      y,
    ]);
  }
  scene.line("string", string, scene.dark ? "#c9ced3" : "#9aa1a8", 2.6);
  ringMarks(scene, [STRING_X + 30, HEAD[1] - 60], look.ring ?? 0);
}

/** A felt crown lying on its side, its flat base at x = `base`, its tip at `tip`. */
function sideCrown(cy: number, hw: number, base: number, tip: number, steps = 18): Pt[] {
  const points: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = Math.PI / 2 - (Math.PI * i) / steps;
    const c = Math.cos(a);
    const s = Math.sin(a);
    points.push([base + (tip - base) * c ** 0.62, cy + hw * s * (1 - 0.18 * c * c)]);
  }
  return points;
}
