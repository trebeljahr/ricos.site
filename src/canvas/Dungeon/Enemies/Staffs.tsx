import { useGLTF } from "@react-three/drei";
import { GLTFResult } from "src/@types";
import { Group, Mesh } from "three";

export const useStaff1 = () => {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/weapons/Staff (1)-transformed.glb"
  ) as GLTFResult;

  const staffMesh = new Mesh(nodes.Cylinder.geometry, materials["Wood.001"]);
  staffMesh.name = "Staff_1";

  return staffMesh;
};

export const useStaff2 = () => {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/weapons/Staff (2)-transformed.glb"
  ) as GLTFResult;

  const group = new Group();
  group.name = "Staff_2";

  const staffMesh = new Mesh(
    nodes["Staff_02_Circle001-Mesh"].geometry,
    materials.Iron_staff_02
  );

  const staffMesh2 = new Mesh(
    nodes["Staff_02_Circle001-Mesh_1"].geometry,
    materials.Wood_staff_02
  );

  const staffMesh3 = new Mesh(
    nodes["Staff_02_Circle001-Mesh_2"].geometry,
    materials.Green_crystal
  );

  const staffMesh4 = new Mesh(
    nodes["Staff_02_Circle001-Mesh_3"].geometry,
    materials.Purple_ribbon
  );

  group.add(staffMesh);
  group.add(staffMesh2);
  group.add(staffMesh3);
  group.add(staffMesh4);

  group.scale.set(0.003, 0.003, 0.003);
  group.position.set(-0.002, 0.008, 0);

  return group;
};

export const useStaff3 = () => {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/weapons/Staff (3)-transformed.glb"
  ) as GLTFResult;

  const group = new Group();
  group.name = "Staff_3";

  const staffMesh = new Mesh(
    nodes["Staff_03_Cube-Mesh"].geometry,
    materials.Iron_sword
  );

  const staffMesh2 = new Mesh(
    nodes["Staff_03_Cube-Mesh_1"].geometry,
    materials.Golden
  );

  const staffMesh3 = new Mesh(
    nodes["Staff_03_Cube-Mesh_2"].geometry,
    materials.Ball_staff_03
  );

  group.add(staffMesh);
  group.add(staffMesh2);
  group.add(staffMesh3);

  group.scale.set(0.003, 0.003, 0.003);
  group.position.set(0, 0.008, 0);

  return group;
};

export const useStaff4 = () => {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/weapons/Staff (4)-transformed.glb"
  ) as GLTFResult;

  const group = new Group();
  group.name = "Staff_4";

  const staffMesh = new Mesh(
    nodes["Staff_04_Circle011-Mesh"].geometry,
    materials.Dark_blue
  );

  const staffMesh2 = new Mesh(
    nodes["Staff_04_Circle011-Mesh_1"].geometry,
    materials.Iron_staff_04
  );

  const staffMesh3 = new Mesh(
    nodes["Staff_04_Circle011-Mesh_2"].geometry,
    materials.Cyrstal_staff_04
  );

  group.add(staffMesh);
  group.add(staffMesh2);
  group.add(staffMesh3);

  group.scale.set(0.003, 0.003, 0.003);
  group.position.set(0, 0.005, 0);

  return group;
};

export const useStaff5 = () => {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/weapons/Staff (5)-transformed.glb"
  ) as GLTFResult;

  const group = new Group();
  group.name = "Staff_5";

  const staffMesh = new Mesh(
    nodes["Staff_05_Circle016-Mesh"].geometry,
    materials.Brown
  );
  const staffMesh2 = new Mesh(
    nodes["Staff_05_Circle016-Mesh_1"].geometry,
    materials.Moon
  );

  const staffMesh3 = new Mesh(
    nodes["Staff_05_Circle016-Mesh_2"].geometry,
    materials.Spikes
  );

  group.add(staffMesh);
  group.add(staffMesh2);
  group.add(staffMesh3);

  group.scale.set(0.003, 0.003, 0.003);
  group.position.set(0, 0.007, 0.001);

  return group;
};

export const useStaff6 = () => {
  const result = useGLTF(
    "/3d-assets/glb/weapons/Skeleton Staff-transformed.glb"
  ) as GLTFResult;

  const { nodes } = result;

  const staffMesh = new Mesh(
    nodes.Skeleton_Staff.geometry,
    result.materials.skeleton
  );
  staffMesh.name = "Staff_6";

  return staffMesh;
};

export const useStaff7 = () => {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/weapons/Magick wand-transformed.glb"
  ) as GLTFResult;

  const group = new Group();
  group.name = "Staff_7";
  const staffMesh = new Mesh(nodes["group1762687703"].geometry, materials.mat2);
  const staffMesh2 = new Mesh(
    nodes["mesh2096346305"].geometry,
    materials.mat20
  );
  const staffMesh3 = new Mesh(
    nodes["mesh2096346305_1"].geometry,
    materials.mat17
  );

  group.scale.set(0.02, 0.02, 0.02);
  group.position.set(0, 0.005, 0);

  group.add(staffMesh);
  group.add(staffMesh2);
  group.add(staffMesh3);

  return group;
};
