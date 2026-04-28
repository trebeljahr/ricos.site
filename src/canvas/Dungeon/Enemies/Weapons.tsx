import { pickRandomFromArray } from "src/lib/utils/randomFromArray";
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
import { useSword1, useSword2, useSword3, useSword4, useSword5, useSword6 } from "./Swords";

export const getRandomWeaponType = () => {
  const itemTypes = Object.values(WeaponTypes);
  const randomItemType = pickRandomFromArray(itemTypes);
  return randomItemType;
};

export const useRandomWeapon = () => {
  const item = useWeapon(getRandomWeaponType());
  return item;
};

/* eslint-disable react-hooks/rules-of-hooks */
export const useWeapon = (itemType: WeaponTypes) => {
  switch (itemType) {
    case SwordTypes.Sword1:
      // biome-ignore lint/correctness/useHookAtTopLevel: conditional hook by design — refactor deferred
      return useSword1();
    case SwordTypes.Sword2:
      // biome-ignore lint/correctness/useHookAtTopLevel: conditional hook by design — refactor deferred
      return useSword2();
    case SwordTypes.Sword3:
      // biome-ignore lint/correctness/useHookAtTopLevel: conditional hook by design — refactor deferred
      return useSword3();
    case SwordTypes.Sword4:
      // biome-ignore lint/correctness/useHookAtTopLevel: conditional hook by design — refactor deferred
      return useSword4();
    case SwordTypes.Sword5:
      // biome-ignore lint/correctness/useHookAtTopLevel: conditional hook by design — refactor deferred
      return useSword5();
    case SwordTypes.Sword6:
      // biome-ignore lint/correctness/useHookAtTopLevel: conditional hook by design — refactor deferred
      return useSword6();
    case AxeTypes.Axe1:
      // biome-ignore lint/correctness/useHookAtTopLevel: conditional hook by design — refactor deferred
      return useAxe1();
    case BowTypes.Bow1:
      // biome-ignore lint/correctness/useHookAtTopLevel: conditional hook by design — refactor deferred
      return useBow1();
    case StaffTypes.Staff1:
      // biome-ignore lint/correctness/useHookAtTopLevel: conditional hook by design — refactor deferred
      return useStaff1();
    case StaffTypes.Staff2:
      // biome-ignore lint/correctness/useHookAtTopLevel: conditional hook by design — refactor deferred
      return useStaff2();
    case StaffTypes.Staff3:
      // biome-ignore lint/correctness/useHookAtTopLevel: conditional hook by design — refactor deferred
      return useStaff3();
    case StaffTypes.Staff4:
      // biome-ignore lint/correctness/useHookAtTopLevel: conditional hook by design — refactor deferred
      return useStaff4();
    case StaffTypes.Staff5:
      // biome-ignore lint/correctness/useHookAtTopLevel: conditional hook by design — refactor deferred
      return useStaff5();
    case StaffTypes.Staff6:
      // biome-ignore lint/correctness/useHookAtTopLevel: conditional hook by design — refactor deferred
      return useStaff6();
    case StaffTypes.Staff7:
      // biome-ignore lint/correctness/useHookAtTopLevel: conditional hook by design — refactor deferred
      return useStaff7();
    case ShieldTypes.Shield1:
      // biome-ignore lint/correctness/useHookAtTopLevel: conditional hook by design — refactor deferred
      return useShield();
    case ShieldTypes.Shield2:
      // biome-ignore lint/correctness/useHookAtTopLevel: conditional hook by design — refactor deferred
      return useShield2();
    case ShieldTypes.Shield3:
      // biome-ignore lint/correctness/useHookAtTopLevel: conditional hook by design — refactor deferred
      return useShield3();
    case ShieldTypes.Shield4:
      // biome-ignore lint/correctness/useHookAtTopLevel: conditional hook by design — refactor deferred
      return useShield4();
  }
};

export enum SwordTypes {
  Sword1 = "Sword1",
  Sword2 = "Sword2",
  Sword3 = "Sword3",
  Sword4 = "Sword4",
  Sword5 = "Sword5",
  Sword6 = "Sword6",
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
