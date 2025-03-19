import { pickRandomFromArray } from "src/lib/utils/randomFromArray";
import {
  useSword1,
  useSword2,
  useSword3,
  useSword4,
  useSword5,
} from "./Swords";
import { useAxe1 } from "./Axes";
import { useBow1 } from "./Bows";
import { useShield, useShield2, useShield3, useShield4 } from "./Shields";
import {
  useStaff1,
  useStaff2,
  useStaff3,
  useStaff4,
  useStaff5,
  useStaff6,
  useStaff7,
} from "./Staffs";

export const getRandomWeaponType = () => {
  const itemTypes = Object.values(WeaponTypes);
  const randomItemType = pickRandomFromArray(itemTypes);
  return randomItemType;
};

export const useRandomWeapon = () => {
  const item = useItem(getRandomWeaponType());
  return item;
};

export const useItem = (itemType: WeaponTypes) => {
  switch (itemType) {
    case SwordTypes.Sword1:
      return useSword1();
    case SwordTypes.Sword2:
      return useSword2();
    case SwordTypes.Sword3:
      return useSword3();
    case SwordTypes.Sword4:
      return useSword4();
    case SwordTypes.Sword5:
      return useSword5();
    case AxeTypes.Axe1:
      return useAxe1();
    case BowTypes.Bow1:
      return useBow1();
    case StaffTypes.Staff1:
      return useStaff1();
    case StaffTypes.Staff2:
      return useStaff2();
    case StaffTypes.Staff3:
      return useStaff3();
    case StaffTypes.Staff4:
      return useStaff4();
    case StaffTypes.Staff5:
      return useStaff5();
    case StaffTypes.Staff6:
      return useStaff6();
    case StaffTypes.Staff7:
      return useStaff7();
    case ShieldTypes.Shield1:
      return useShield();
    case ShieldTypes.Shield2:
      return useShield2();
    case ShieldTypes.Shield3:
      return useShield3();
    case ShieldTypes.Shield4:
      return useShield4();
  }
};

export enum SwordTypes {
  Sword1 = "Sword1",
  Sword2 = "Sword2",
  Sword3 = "Sword3",
  Sword4 = "Sword4",
  Sword5 = "Sword5",
}

export enum StaffTypes {
  Staff1 = "Staff1",
  Staff2 = "Staff2",
  Staff3 = "Staff3",
  Staff4 = "Staff4",
  Staff5 = "Staff5",
  Staff6 = "Staff6",
  Staff7 = "Staff7",
}

export enum AxeTypes {
  Axe1 = "Axe1",
}

export enum BowTypes {
  Bow1 = "Bow1",
}

export enum ShieldTypes {
  Shield1 = "Shield1",
  Shield2 = "Shield2",
  Shield3 = "Shield3",
  Shield4 = "Shield4",
}

export const WeaponTypes = {
  ...SwordTypes,
  ...StaffTypes,
  ...ShieldTypes,
  ...BowTypes,
  ...AxeTypes,
};
export type WeaponTypes = (typeof WeaponTypes)[keyof typeof WeaponTypes];
