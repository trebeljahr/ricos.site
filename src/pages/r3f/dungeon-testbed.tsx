import { ThreeFiberLayout } from "@components/dom/Layout";
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
  Statue_Horse,
  Sword_WallMount,
  Trap_empty,
  Trap_spikes,
  Wall_Modular,
  WallCover_Modular,
  Woodfire,
} from "@r3f/AllModels/modular_dungeon_pack_1";
import { debug, perf } from "@r3f/ChunkGenerationSystem/config";
import { HealthContextProvider } from "@r3f/Contexts/HealthbarContext";
import { FirstPersonControllerWithWeapons } from "@r3f/Controllers/IsaacMasonFirstPersonController";
import { CanvasWithKeyboardInput } from "@r3f/Controllers/KeyboardControls";
import { MinecraftCreativeController } from "@r3f/Controllers/MinecraftCreativeController";
import { BackgroundMusicLoop } from "@r3f/Dungeon/BuildingBlocks/BackgroundMusic";
import { Enemies } from "@r3f/Dungeon/BuildingBlocks/Enemies";
import { Wall } from "@r3f/Dungeon/BuildingBlocks/Rooms";
import { SpikeTrap } from "@r3f/Dungeon/BuildingBlocks/SpikeTrap";
import { StairCase } from "@r3f/Dungeon/BuildingBlocks/StairCase";
import { InventoryProvider } from "@r3f/Dungeon/InventorySystem/GameInventoryContext";
import { Inventory } from "@r3f/Dungeon/InventorySystem/GameInventoryUI";
import { RandomArmorSpawner } from "@r3f/Dungeon/ItemSpawners/ArmorSpawner";
import { RandomPotionSpawner } from "@r3f/Dungeon/ItemSpawners/PotionSpawner";
import { RandomWeaponsSpawner } from "@r3f/Dungeon/ItemSpawners/WeaponSpawner";
import { CameraPositionLogger } from "@r3f/Helpers/CameraPositionLogger";
import useShadowHelper from "@r3f/Helpers/OverheadLights";
import { Box, Plane, Sky } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { CapsuleCollider, Physics, RigidBody } from "@react-three/rapier";
import { LevaPanel } from "leva";
import { Perf } from "r3f-perf";
import { useEffect, useRef } from "react";
import { DirectionalLight, Group, Mesh, PCFSoftShadowMap } from "three";

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

      <Enemies />
      <SpikeTrap />
      <CameraPositionLogger />

      <Sky />
      {/* {perf && <Perf position="bottom-right" />} */}
      <directionalLight
        ref={lightRef}
        args={["#ffffff", 5]}
        position={[20, 10, 20]}
      />
      <ambientLight args={["#404040", 1]} />
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

      <RigidBody type="fixed">
        <Wall_Modular position={[3, 1, 0]} />
        <Wall_Modular position={[3, 3, 0]} />
        <Wall_Modular position={[-3, 1, 0]} />
        <Wall_Modular position={[-3, 2, 0]} />
        <Wall_Modular position={[-3, 3, 0]} />
      </RigidBody>

      <RigidBody type="fixed" colliders={"trimesh"}>
        <Arch />
      </RigidBody>

      <group position={[0, 0, -8]}>
        <SpikeTrap interval={1000} />
        <RigidBody type="fixed" colliders={"trimesh"}>
          <Arch />
        </RigidBody>
        <RigidBody type="fixed">
          <Wall_Modular position={[3, 1, 0]} />
          <Wall_Modular position={[3, 3, 0]} />
          <Wall_Modular position={[-3, 1, 0]} />
          <Wall_Modular position={[-3, 3, 0]} />
        </RigidBody>
      </group>
      <group rotation-y={Math.PI / 2} position-x={4}>
        <RigidBody type="fixed">
          <Wall_Modular position={[1, 1, 0]} />
          <Wall_Modular position={[1, 3, 0]} />

          <Wall_Modular position={[3, 1, 0]} />
          <Wall_Modular position={[3, 3, 0]} />

          <Wall_Modular position={[5, 1, 0]} />
          <Wall_Modular position={[5, 3, 0]} />

          <Wall_Modular position={[7, 1, 0]} />
          <Wall_Modular position={[7, 3, 0]} />
        </RigidBody>
      </group>
      <group rotation-y={Math.PI / 2} position-x={-4}>
        <RigidBody type="fixed">
          <Wall_Modular position={[1, 1, 0]} />
          <Wall_Modular position={[1, 3, 0]} />

          <Wall_Modular position={[3, 1, 0]} />
          <Wall_Modular position={[3, 3, 0]} />

          <Wall_Modular position={[5, 1, 0]} />
          <Wall_Modular position={[5, 3, 0]} />

          <Wall_Modular position={[7, 1, 0]} />
          <Wall_Modular position={[7, 3, 0]} />
        </RigidBody>
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

      <RigidBody position={[0, -1, 0]} colliders={"cuboid"} type={"fixed"}>
        <Box args={[100, 2, 100]} position={[0, -0.1, 0]} receiveShadow={true}>
          <meshStandardMaterial
            color={"#959393"}
            roughness={0.9}
            metalness={0.1}
          />
        </Box>
      </RigidBody>
    </>
  );
};

export default function Page() {
  return (
    <ThreeFiberLayout>
      <InventoryProvider maxSlots={28} maxWeight={100}>
        <Inventory />

        <CanvasWithKeyboardInput
          camera={{ position: [0, 10, 0], near: 0.1, far: 1000 }}
        >
          <LevaPanel hidden={!debug} />
          <HealthContextProvider>
            <Physics debug>
              {perf && <Perf position="bottom-right" />}
              <CanvasContent />
              <FirstPersonControllerWithWeapons />
              {/* <MinecraftCreativeController
                initialPosition={[0, 25, 0]}
                speed={10}
              > */}
              {/* <CapsuleCollider args={[0.2, 0.1]} /> */}
              {/* </MinecraftCreativeController> */}
            </Physics>
          </HealthContextProvider>
        </CanvasWithKeyboardInput>
      </InventoryProvider>
    </ThreeFiberLayout>
  );
}
