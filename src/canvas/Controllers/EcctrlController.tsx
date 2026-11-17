import { MichelleCharacter, michelleGlbUrl } from "@r3f/AllModels/MichelleCharacter";
import type { SupportedControllerKeys } from "@r3f/Controllers/KeyboardControls";
import { useAnimations, useGLTF, useKeyboardControls } from "@react-three/drei";
import { type GroupProps, type Object3DProps, useFrame } from "@react-three/fiber";
import { Ecctrl, type EcctrlHandle } from "ecctrl";
import {
  type ForwardRefExoticComponent,
  type RefAttributes,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { type AnimationAction, type Group, LoopOnce, Vector3 } from "three";
import { useFollowCam } from "./CustomEcctrlController/useFollowCam";

const animationSet = {
  idle: "Idle",
  walk: "Walk",
  run: "Run",
  jump: "Jump_Start",
  jumpIdle: "Fall_Idle",
  jumpLand: "Jump_Land",
};

type AnimationName = (typeof animationSet)[keyof typeof animationSet];

export type SimpleModelType = (props: JSX.IntrinsicElements["group"]) => React.JSX.Element;

export type ForwardedRefModelType = ForwardRefExoticComponent<
  Omit<GroupProps, "ref"> & RefAttributes<Group>
>;

export type ModelType = SimpleModelType | ForwardedRefModelType;

// ecctrl 1.x defaults where ecctrl 2.x keeps the same meaning. The spring and
// damping constants changed units in 2.x, so those keep the 2.x defaults.
const capsuleHalfHeight = 0.35;
const capsuleRadius = 0.3;
const camFollowMult = 11;
const camLerpMult = 25;

/**
 * ecctrl 2.x reads no keyboard: it only takes input through setMovement.
 * Feed it from the page's drei KeyboardControls each frame.
 */
const KeyboardInput = ({ ecctrl }: { ecctrl: RefObject<EcctrlHandle | null> }) => {
  const [, getKeys] = useKeyboardControls<keyof SupportedControllerKeys>();

  useFrame(() => {
    const keys = getKeys();
    ecctrl.current?.setMovement({
      forward: keys.forward,
      backward: keys.backward,
      leftward: keys.leftward,
      rightward: keys.rightward,
      run: keys.run,
      jump: keys.jump,
    });
  });

  return null;
};

/**
 * ecctrl 2.x has no follow camera. This is the 1.x one: orbit by mouse drag
 * or touch, zoom by wheel or pinch, pull in when something blocks the view.
 * The pivot sits at chest height and the camera eases after it.
 */
const FollowCamera = ({
  ecctrl,
  camCollision,
  camCollisionOffset,
}: {
  ecctrl: RefObject<EcctrlHandle | null>;
  camCollision: boolean;
  camCollisionOffset: number;
}) => {
  const { pivot, followCam, cameraCollisionDetect } = useFollowCam({ camCollisionOffset });
  const pivotPosition = useMemo(() => new Vector3(), []);
  const followCamPosition = useMemo(() => new Vector3(), []);

  useFrame((state, delta) => {
    const handle = ecctrl.current;
    if (!handle) return;

    pivotPosition.copy(handle.currPos);
    pivotPosition.y += capsuleHalfHeight + capsuleRadius / 2;
    pivot.position.lerp(pivotPosition, 1 - Math.exp(-camFollowMult * delta));

    followCam.getWorldPosition(followCamPosition);
    state.camera.position.lerp(followCamPosition, 1 - Math.exp(-camLerpMult * delta));
    state.camera.lookAt(pivot.position);

    if (camCollision) cameraCollisionDetect(delta);
  });

  return null;
};

const oneShot = new Set<AnimationName>([animationSet.jump, animationSet.jumpLand]);

// Jump_Land opens with 0.4 s of the fall itself, with the hips about 2 m away
// from where Fall_Idle holds them. Started at 0, the body swings out and back
// on touchdown. Start it where the feet reach the ground.
const startTime: Partial<Record<AnimationName, number>> = { [animationSet.jumpLand]: 0.4 };

/**
 * The 1.x animation rules. ecctrl 2.x's own resolver shows JUMP_START and
 * JUMP_LAND for a single frame; 1.x played them through once.
 */
const nextAnimation = (current: AnimationName, handle: EcctrlHandle): AnimationName => {
  const { isOnGround, isMoving, isFalling, runActive, jumpActive, standCollider } = handle;
  let next = current;

  if (isOnGround && !isMoving && !jumpActive) {
    if (current === animationSet.jumpIdle) next = animationSet.jumpLand;
    else if (current !== animationSet.jumpLand) next = animationSet.idle;
  } else if (isOnGround && jumpActive) {
    next = animationSet.jump;
  } else if (isOnGround) {
    next = runActive ? animationSet.run : animationSet.walk;
  } else if (current === animationSet.jump) {
    next = animationSet.jumpIdle;
  }

  // High in the air with nothing below: fall.
  if (!standCollider && isFalling) next = animationSet.jumpIdle;

  return next;
};

const CharacterAnimation = ({
  ecctrl,
  children,
}: {
  ecctrl: RefObject<EcctrlHandle | null>;
  children: React.ReactNode;
}) => {
  const group = useRef<Group>(null);
  const { animations } = useGLTF(michelleGlbUrl);
  const { actions, mixer } = useAnimations(animations, group);
  const [current, setCurrent] = useState<AnimationName>(animationSet.idle);
  const currentRef = useRef(current);

  useFrame(() => {
    const handle = ecctrl.current;
    if (!handle) return;
    const next = nextAnimation(currentRef.current, handle);
    if (next !== currentRef.current) {
      currentRef.current = next;
      setCurrent(next);
    }
  });

  useEffect(() => {
    const action = actions[current];
    if (!action) return;

    if (oneShot.has(current)) {
      action.reset().fadeIn(0.2).setLoop(LoopOnce, 0).play();
      action.time = startTime[current] ?? 0;
      action.clampWhenFinished = true;
    } else {
      action.reset().fadeIn(0.2).play();
    }

    const onFinished = (e: { action: AnimationAction }) => {
      if (e.action !== action) return;
      currentRef.current = animationSet.idle;
      setCurrent(animationSet.idle);
    };
    mixer.addEventListener("finished", onFinished);

    return () => {
      action.fadeOut(0.2);
      mixer.removeEventListener("finished", onFinished);
    };
  }, [current, actions, mixer]);

  return (
    <group ref={group} dispose={null} userData={{ camExcludeCollision: true }}>
      {children}
    </group>
  );
};

export const EcctrlController = ({
  Model = MichelleCharacter,
  position = [0, 0, 5],
  camCollision = true,
  camCollisionOffset = 0.5,
}: {
  Model?: ModelType;
  position?: Object3DProps["position"];
  camCollision?: boolean;
  camCollisionOffset?: number;
}) => {
  const ecctrl = useRef<EcctrlHandle>(null);

  return (
    <>
      <KeyboardInput ecctrl={ecctrl} />
      <FollowCamera
        ecctrl={ecctrl}
        camCollision={camCollision}
        camCollisionOffset={camCollisionOffset}
      />
      <Ecctrl
        ref={ecctrl}
        position={position}
        capsuleHalfHeight={capsuleHalfHeight}
        capsuleRadius={capsuleRadius}
        floatHeight={0.3}
        maxWalkVel={2.5}
        maxRunVel={5}
        jumpVel={4}
        fallingGravityScale={2.5}
        fallingMaxVel={20}
        enableToggleRun={false}
      >
        <CharacterAnimation ecctrl={ecctrl}>
          <Model />
        </CharacterAnimation>
      </Ecctrl>
    </>
  );
};
