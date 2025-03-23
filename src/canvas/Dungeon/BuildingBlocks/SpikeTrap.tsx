import { useHealthContext } from "@r3f/Contexts/HealthbarContext";
import { Trap_empty, Trap_spikes } from "@r3f/AllModels/modular_dungeon_pack_1";
import { PositionalAudio as PositionalAudioComponent } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  CuboidCollider,
  IntersectionEnterHandler,
  RigidBody,
} from "@react-three/rapier";
import closeSpikeTrapSound from "@sounds/close-spike-trap.mp3";
import spikeTrapSound from "@sounds/spike-trap.mp3";
import { useEffect, useRef, useState } from "react";
import { PositionalAudio } from "three";

export const SpikeTrap = ({ interval = 2000 }: { interval?: number }) => {
  const { health, damage } = useHealthContext();
  const [extended, setExtended] = useState(false);
  const [inHitBox, setInHitBox] = useState(false);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setExtended((prev) => !prev);
    }, interval);

    return () => {
      clearInterval(intervalId);
    };
  }, [interval]);

  const openAudioRef = useRef<PositionalAudio>(null!);
  const closeAudioRef = useRef<PositionalAudio>(null!);

  useFrame(() => {
    if (extended && inHitBox) {
      damage(0.01);

      if (health.current <= 0) {
        console.log("you're dead!");
      }
    }
  });

  useEffect(() => {
    const openSound = openAudioRef.current;
    const closeSound = closeAudioRef.current;
    if (extended) {
      openSound.play();
    } else {
      closeSound.play();
    }

    return () => {
      openSound.stop();
      closeSound.stop();
    };
  }, [extended, inHitBox]);

  const hitSpikeTrap: IntersectionEnterHandler = (event) => {
    setInHitBox(true);
  };

  const leaveSpikeTrap = () => {
    setInHitBox(false);
  };

  return (
    <group>
      <RigidBody
        position={[0, 0.6, 0]}
        type="fixed"
        sensor
        // activeCollisionTypes={60943}
        colliders={false}
      >
        <CuboidCollider
          args={[1, 0.6, 1]}
          sensor
          onIntersectionEnter={hitSpikeTrap}
          onIntersectionExit={leaveSpikeTrap}
        />
      </RigidBody>

      {extended ? <Trap_spikes position={[0, 0, 0]} /> : <Trap_empty />}
      <PositionalAudioComponent
        ref={openAudioRef}
        url={spikeTrapSound}
        distance={1}
        loop={false}
      />
      <PositionalAudioComponent
        ref={closeAudioRef}
        url={closeSpikeTrapSound}
        distance={1}
        loop={false}
      />
    </group>
  );
};
