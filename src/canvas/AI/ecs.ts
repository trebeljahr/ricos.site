import { RapierRigidBody } from "@react-three/rapier";
import { QueryBuilder, World } from "arancini";
import { createReactAPI } from "@arancini/react";
import { CustomEcctrlRigidBody } from "ecctrl";
import { NavMesh, NavMeshQuery } from "recast-navigation";
import { Object3D, Vector3 } from "three";

export type NavComponent = {
  navMesh?: NavMesh;
  navMeshQuery?: NavMeshQuery;
  navMeshVersion: number;
};

export type EntityType = {
  isPlayer?: true;
  three?: Object3D;
  rigidBody?: CustomEcctrlRigidBody;
  nav?: NavComponent;
  isEnemy?: true;
  distanceToPlayer?: number;
  hasReachedPlayer?: boolean;
  position?: Vector3;
  targetPosition?: Vector3;
  path?: Vector3[];
  traversable?: true;
};

export const world = new World<EntityType>();

export const enemyQuery = world.query((e: QueryBuilder<EntityType>) =>
  e.has("isEnemy", "rigidBody")
);
export const navQuery = world.query((e: QueryBuilder<EntityType>) =>
  e.is("nav")
);
export const playerQuery = world.query((e: QueryBuilder<EntityType>) =>
  e.has("isPlayer", "rigidBody")
);
export const traversableQuery = world.query((e: QueryBuilder<EntityType>) =>
  e.has("traversable")
);

const { Entity, Component } = createReactAPI(world);

export { Component, Entity };
