import { GroupProps, useFrame } from "@react-three/fiber";
import { CapsuleCollider, RigidBody } from "@react-three/rapier";
import achievementSound from "@sounds/positive-pickup-sound.mp3";
import { ComponentType, useEffect, useRef, useState } from "react";
import { Group } from "three";
import useSound from "use-sound";

export enum Rarity {
  Medium,
  Rare,
}

export type Collectible<T> = {
  Component: ComponentType<GroupProps>;
  data: T;
};

export type SpawnerImplementation = <T>(props: SpawnerProps<T>) => JSX.Element;

type SpawnerProps<T> = GroupProps & {
  respawnTime?: number;
  onCollected?: (data: T) => void;
};

type ItemSpawnerType = <T>(
  props: SpawnerProps<T> & {
    Item: ComponentType<GroupProps>;
    data: T;
  }
) => JSX.Element | null;

export const ItemSpawner: ItemSpawnerType = ({
  Item,
  respawnTime,
  onCollected = () => {},
  data,
  ...props
}) => {
  const [intersection, setIntersection] = useState(false);
  const [play] = useSound(achievementSound, { volume: 0.5 });

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (intersection) {
      play();

      onCollected(data);

      if (!respawnTime) return;

      timeout = setTimeout(() => {
        setIntersection(false);
      }, respawnTime);
    }

    return () => {
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intersection]);

  const ItemRef = useRef<Group>(null!);

  useFrame(({ clock }) => {
    if (!ItemRef.current) return;

    ItemRef.current.rotation.y += 0.01;
    ItemRef.current.position.y = Math.sin(clock.getElapsedTime()) * 0.1 - 0.6;
  });

  if (intersection) return null;

  return (
    <group {...props}>
      <RigidBody
        position={[0, 0.5, 0]}
        type="fixed"
        scale={0.5}
        colliders={false}
      >
        <CapsuleCollider
          position={[0, 0.7, 0]}
          args={[0.8, 0.5]}
          sensor
          onIntersectionEnter={() => {
            setIntersection(true);
          }}
        >
          <group ref={ItemRef}>
            <Item />
          </group>
        </CapsuleCollider>
      </RigidBody>
    </group>
  );
};
