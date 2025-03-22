import { MutableRefObject, useEffect } from "react";
import { Bone, Group, Mesh, Object3D } from "three";

export const useAttachToBone = (
  groupRef: MutableRefObject<Object3D>,
  attachPointName: string,
  thingToAttach: Group | Mesh
) => {
  useEffect(() => {
    let object: Object3D<Bone>;

    if (attachPointName.includes("mixamorig")) {
      console.log("attaching to bone", attachPointName);
      console.log(groupRef);
    }

    groupRef.current?.traverse((child) => {
      if (attachPointName.includes("mixamorig")) {
        console.log(child.name);
      }

      if (child.name === attachPointName) {
        child.add(thingToAttach);
        object = child as Object3D<Bone>;
      }
    });

    return () => {
      if (object) {
        object.remove(thingToAttach);
      }
    };
  }, [groupRef, attachPointName, thingToAttach]);
};
