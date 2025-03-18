import { ThreeFiberLayout } from "@components/dom/Layout";
import { perf } from "@r3f/ChunkGenerationSystem/config";
import { CanvasWithKeyboardInput } from "@r3f/Controllers/KeyboardControls";
import { MinecraftCreativeController } from "@r3f/Controllers/MinecraftCreativeController";
import { CameraPositionLogger } from "@r3f/Helpers/CameraPositionLogger";
import useShadowHelper from "@r3f/Scenes/OverheadLights";
import {
  Arch,
  Column2,
  Fence_90_Modular,
  Fence_End_Modular,
  Fence_Straight_Modular,
  Floor_Modular,
  Pedestal,
  Pedestal2,
  Stairs_Modular,
  Stairs_SideCover,
  Stairs_SideCoverWall,
  Statue_Horse,
  Sword_WallMount,
  Trap_empty,
  Trap_spikes,
  Wall_Modular,
  WallCover_Modular,
  Woodfire,
} from "@r3f/models/modular_dungeon_pack_1";
import {
  Armor_Black,
  Armor_Golden,
  Armor_Leather,
  Armor_Metal,
  Armor_Metal2,
  Axe_Double,
  Axe_Double_Golden,
  Axe_small,
  Axe_small_Golden,
  Bow_Golden,
  Bow_Wooden,
  Dagger,
  Dagger_Golden,
  Potion10_Filled,
  Potion11_Filled,
  Potion1_Filled,
  Potion2_Filled,
  Potion3_Filled,
  Potion4_Filled,
  Potion5_Filled,
  Potion6_Filled,
  Potion7_Filled,
  Potion8_Filled,
  Potion9_Filled,
  Sword,
  Sword_big,
  Sword_big_Golden,
  Sword_Golden,
} from "@r3f/models/rpg_items_pack/";
import {
  Plane,
  PositionalAudio as PositionalAudioComponent,
  Sky,
} from "@react-three/drei";
import { GroupProps, useFrame, useThree } from "@react-three/fiber";
import {
  CapsuleCollider,
  CuboidCollider,
  Physics,
  RigidBody,
} from "@react-three/rapier";
import { Perf } from "r3f-perf";
import {
  ComponentType,
  ReactNode,
  use,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DirectionalLight,
  Group,
  Mesh,
  PCFSoftShadowMap,
  PositionalAudio,
} from "three";
import useSound from "use-sound";
import achievementSound from "@sounds/positive-pickup-sound.mp3";
import ambientLoop from "@sounds/ambient-pads-loop.mp3";
import spikeTrapSound from "@sounds/spike-trap.mp3";
import closeSpikeTrapSound from "@sounds/close-spike-trap.mp3";
import { pickRandomFromArray } from "src/lib/utils/randomFromArray";
import {
  HealthContextProvider,
  useHealthContext,
} from "@r3f/Contexts/HealthbarContext";
import { ReactElement } from "react-markdown/lib/react-markdown";
import { RandomWeaponsSpawner } from "@r3f/Helpers/ItemSpawners/WeaponSpawner";
import { RandomArmorSpawner } from "@r3f/Helpers/ItemSpawners/ArmorSpawner";
import { RandomPotionSpawner } from "@r3f/Helpers/ItemSpawners/PotionSpawner";

const SpikeTrap = ({ interval = 2000 }: { interval?: number }) => {
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

  const hitSpikeTrap = () => {
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
        onIntersectionEnter={hitSpikeTrap}
        onIntersectionExit={leaveSpikeTrap}
      >
        <CuboidCollider args={[1, 0.6, 1]} />
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

const BackgroundMusicLoop = () => {
  const [play, { stop }] = useSound(ambientLoop, { volume: 0.2, loop: true });
  useEffect(() => {
    play();
    return () => {
      stop();
    };
  }, [play, stop]);

  return null;
};

const DungeonBox = ({
  depth,
  width,
  ...props
}: GroupProps & { depth: number; width: number }) => {
  return (
    <group {...props}>
      <Wall length={width} position={[1, 1, 1]} />
      <Wall length={depth} position={[0, 1, 0]} rotation-y={Math.PI / 2} />
      <Wall
        length={depth}
        position={[width * 2, 1, 0]}
        rotation-y={Math.PI / 2}
      />
      <Wall length={width} position={[1, 1, -depth * 2 + 1]} />
    </group>
  );
};

const Wall = ({ length, ...props }: GroupProps & { length: number }) => {
  const positions = Array.from({ length }, (_, i) => i);
  return (
    <group {...props}>
      {positions.map((i) => (
        <group key={i}>
          <WallCover_Modular position={[i * 2, 0, 0]} />
          <Wall_Modular position={[i * 2, 0, 0]} />
          <Wall_Modular position={[i * 2, 2, 0]} />
          <WallCover_Modular position={[i * 2, 4, 0]} />
        </group>
      ))}

      {/* <Wall_Modular position={[0, 0, 0]} />
      <Wall_Modular position={[0, 2, 0]} />
      <Wall_Modular position={[0, 4, 0]} /> */}
    </group>
  );
};

const StairCase = (props: GroupProps) => {
  return (
    <group {...props}>
      <Stairs_Modular position={[0, 0, 0]} />
      <Stairs_Modular position={[-2, 0, 0]} />
      <Stairs_SideCover position={[0, 0, 0]} />
      <Stairs_SideCover position={[-4, 0, 0]} />
      <Stairs_Modular position={[0, 2, -2]} />
      <Stairs_Modular position={[-2, 2, -2]} />
      <Stairs_SideCover position={[0, 2, -2]} />
      <Stairs_SideCover position={[-4, 2, -2]} />

      <Wall_Modular position={[1, 0, -6]} rotation-y={Math.PI / 2} />
      <Wall_Modular position={[-3, 0, -6]} rotation-y={Math.PI / 2} />
      <Wall_Modular position={[1, 2, -6]} rotation-y={Math.PI / 2} />
      <Wall_Modular position={[-3, 2, -6]} rotation-y={Math.PI / 2} />
      <WallCover_Modular position={[1, 4, -6]} rotation-y={Math.PI / 2} />
      <WallCover_Modular position={[-3, 4, -6]} rotation-y={Math.PI / 2} />

      <Wall_Modular position={[1, 0, -4]} rotation-y={Math.PI / 2} />
      <Wall_Modular position={[-3, 0, -4]} rotation-y={Math.PI / 2} />
      <Wall_Modular position={[1, 2, -4]} rotation-y={Math.PI / 2} />
      <Wall_Modular position={[-3, 2, -4]} rotation-y={Math.PI / 2} />
      <WallCover_Modular position={[1, 4, -4]} rotation-y={Math.PI / 2} />
      <WallCover_Modular position={[-3, 4, -4]} rotation-y={Math.PI / 2} />

      <Wall_Modular position={[0, 0, -7]} />
      <Wall_Modular position={[-2, 0, -7]} />
      <Wall_Modular position={[0, 2, -7]} />
      <Wall_Modular position={[-2, 2, -7]} />
      <WallCover_Modular position={[0, 4, -7]} />
      <WallCover_Modular position={[-2, 4, -7]} />

      {/* <Stairs_SideCoverWall position={[0, 0, -2]} /> */}
      {/* <Stairs_SideCoverWall position={[-4, 0, -2]} /> */}

      <Stairs_SideCoverWall position={[0, 0, 0]} />
      <Stairs_SideCoverWall position={[-4, 0, 0]} />

      <Floor_Modular position={[0, 3, -4]} />
      <Floor_Modular position={[-2, 3, -4]} />
      <Floor_Modular position={[0, 3, -6]} />
      <Floor_Modular position={[-2, 3, -6]} />

      <Column2 position={[-3, -1, -3]} />
      <Column2 position={[1, -1, -3]} />
      <Column2 position={[-3, -1, -7]} />
      <Column2 position={[1, -1, -7]} />

      <Fence_End_Modular position={[-3, 4, -3]} rotation-y={Math.PI / 2} />
      <Fence_End_Modular position={[1, 4, -3]} rotation-y={Math.PI / 2} />

      <Fence_Straight_Modular position={[-3, 4, -5]} rotation-y={Math.PI / 2} />
      <Fence_Straight_Modular position={[1, 4, -5]} rotation-y={Math.PI / 2} />

      <Fence_Straight_Modular position={[-1, 4, -7]} />

      <Fence_90_Modular position={[-3, 4, -7]} rotation-y={-Math.PI / 2} />
      <Fence_90_Modular
        position={[1, 4, -7]}
        rotation-y={-Math.PI} /// 2 - Math.PI}
      />
    </group>
  );
};

const CanvasContent = () => {
  const lightRef = useRef<DirectionalLight>(null!);
  const { scene, gl } = useThree();

  useEffect(() => {
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = PCFSoftShadowMap;

    scene.children.forEach((child) => {
      if (child instanceof Group) {
        child.traverse((innerChild) => {
          if (innerChild instanceof Mesh) {
            innerChild.castShadow = true;
            innerChild.receiveShadow = true;
          }
        });
      }
    });

    lightRef.current.castShadow = true;
    lightRef.current.shadow.mapSize.width = 4096;
    lightRef.current.shadow.mapSize.height = 4096;
    lightRef.current.shadow.camera.far = 400;
    lightRef.current.shadow.camera.left = -200;
    lightRef.current.shadow.camera.right = 200;
    lightRef.current.shadow.camera.top = 200;
    lightRef.current.shadow.camera.bottom = -200;
    lightRef.current.shadow.camera.updateProjectionMatrix();

    console.log("activated shadows", lightRef.current);
  }, [gl, scene]);

  useShadowHelper(lightRef);

  const items = Array.from({ length: 10 });
  return (
    <>
      {items.map((_, i) => (
        <RandomWeaponsSpawner
          key={i}
          position={[i * 5, 0, -20]}
          respawnTime={2000}
        />
      ))}

      {items.map((_, i) => (
        <RandomPotionSpawner
          key={i}
          position={[i * 5, 0, -25]}
          respawnTime={2000}
        />
      ))}

      {items.map((_, i) => (
        <RandomArmorSpawner
          key={i}
          position={[i * 5, 0, -30]}
          respawnTime={2000}
        />
      ))}

      <BackgroundMusicLoop />
      <SpikeTrap />
      {/* <Sword_Golden /> */}
      <CameraPositionLogger />
      <Sky />
      {perf && <Perf position="bottom-right" />}
      <directionalLight
        ref={lightRef}
        args={["#ffffff", 5]}
        position={[20, 10, 20]}
      />
      <ambientLight args={["#404040", 1]} />
      {/* <Box position={[16, 0, 16]} width={4} depth={4} />
      <Box position={[-16, 0, 30]} width={10} depth={10} /> */}

      <Arch position={[0, 0, 0]} />
      <group position={[0, 0, -1]}>
        <Floor_Modular position-x={-3} />
        <Floor_Modular position-x={-1} />
        <Floor_Modular position-x={1} />
        <Floor_Modular position-x={3} />

        <Floor_Modular position-x={-3} position-z={-2} />
        <Floor_Modular position-x={-1} position-z={-2} />
        <Floor_Modular position-x={1} position-z={-2} />
        <Floor_Modular position-x={3} position-z={-2} />

        <Floor_Modular position-x={-3} position-z={-4} />
        <Floor_Modular position-x={-1} position-z={-4} />
        <Floor_Modular position-x={1} position-z={-4} />
        <Floor_Modular position-x={3} position-z={-4} />

        <Floor_Modular position-x={-3} position-z={-6} />
        <Floor_Modular position-x={-1} position-z={-6} />
        <Floor_Modular position-x={1} position-z={-6} />
        <Floor_Modular position-x={3} position-z={-6} />
      </group>
      <StairCase position={[-11, 1, 0]} />
      {/* <StairCase position={[-11, 5, -8]} /> */}
      <Wall_Modular position={[3, 1, 0]} />
      <Wall_Modular position={[3, 3, 0]} />
      {/* <Wall_Modular position={[3, 3, 0]} /> */}
      <Wall_Modular position={[-3, 1, 0]} />
      <Wall_Modular position={[-3, 2, 0]} />
      <Wall_Modular position={[-3, 3, 0]} />
      <group rotation-y={Math.PI / 2} position-x={4}>
        <Wall_Modular position={[1, 1, 0]} />
        <Wall_Modular position={[1, 2, 0]} />
        <Wall_Modular position={[1, 3, 0]} />

        <Wall_Modular position={[3, 1, 0]} />
        <Wall_Modular position={[3, 2, 0]} />
        <Wall_Modular position={[3, 3, 0]} />

        <Wall_Modular position={[5, 1, 0]} />
        <Wall_Modular position={[5, 2, 0]} />
        <Wall_Modular position={[5, 3, 0]} />

        <Wall_Modular position={[7, 1, 0]} />
        <Wall_Modular position={[7, 2, 0]} />
        <Wall_Modular position={[7, 3, 0]} />
      </group>
      <group rotation-y={Math.PI / 2} position-x={-4}>
        <Wall_Modular position={[1, 1, 0]} />
        <Wall_Modular position={[1, 2, 0]} />
        <Wall_Modular position={[1, 3, 0]} />

        <Wall_Modular position={[3, 1, 0]} />
        <Wall_Modular position={[3, 2, 0]} />
        <Wall_Modular position={[3, 3, 0]} />

        <Wall_Modular position={[5, 1, 0]} />
        <Wall_Modular position={[5, 2, 0]} />
        <Wall_Modular position={[5, 3, 0]} />

        <Wall_Modular position={[7, 1, 0]} />
        <Wall_Modular position={[7, 2, 0]} />
        <Wall_Modular position={[7, 3, 0]} />
      </group>
      <Column2 position={[4, 0, 0]} />
      <Column2 position={[-4, 0, 0]} />
      <Column2 position={[4, 0, -8]} />
      <Column2 position={[-4, 0, -8]} />
      <group position={[10, 0, 0]}>
        <Stairs_Modular position={[4, 0, 0]} />
        <WallCover_Modular position={[6, 0, 0]} />
        <Wall_Modular position={[8, 0, 0]} />
        <Fence_90_Modular position={[10, 0, 0]} />
        <Fence_Straight_Modular position={[12, 0, 0]} />
        <Fence_End_Modular position={[14, 0, 0]} />
        <Woodfire position-x={16} />

        <Pedestal />
        <Pedestal2 position-z={-2} />
        <Statue_Horse position-z={-10} />
        <Sword_WallMount position-z={-6} />

        <Trap_empty position-z={3} position-x={-1} />
        <Trap_spikes position-z={5} position-x={-1} />
      </group>
      <Wall length={4} position={[-3, 1, -8]} />
      <Wall length={4} position={[-4, 1, -9]} rotation-y={Math.PI / 2} />
      <Wall length={4} position={[4, 1, -9]} rotation-y={Math.PI / 2} />
      <Wall length={4} position={[-3, 1, -16]} />
      {/* <Wall length={4} position={[-3, 1, -8]} /> */}
      {/* <gridHelper args={[100, 50]} position={[0, 0, 0]} /> */}
      <Plane
        args={[100, 100]}
        position={[0, -0.1, 0]}
        rotation-x={-Math.PI / 2}
        receiveShadow={true}
      >
        <meshStandardMaterial
          color={"#959393"}
          roughness={0.9}
          metalness={0.1}
        />
      </Plane>
    </>
  );
};

export default function Page() {
  return (
    <ThreeFiberLayout>
      <CanvasWithKeyboardInput
        camera={{ position: [0, 10, 0], near: 0.1, far: 1000 }}
      >
        <HealthContextProvider>
          <Physics debug>
            <CanvasContent />
            <MinecraftCreativeController
              initialPosition={[0, 25, 0]}
              speed={20}
            >
              <CapsuleCollider args={[0.2, 0.1]} />
            </MinecraftCreativeController>
          </Physics>
        </HealthContextProvider>
      </CanvasWithKeyboardInput>
    </ThreeFiberLayout>
  );
}
