import { type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { type RefObject, useEffect, useMemo, useRef } from "react";
import type { GeoPointTuple, TripLocation, TripRegion } from "src/lib/photoGeo";
import {
  BufferAttribute,
  BufferGeometry,
  LineBasicMaterial,
  MeshBasicMaterial,
  PointsMaterial,
  SphereGeometry,
  Vector3,
} from "three";
import {
  DEFAULT_CAMERA_DISTANCE,
  greatCircleLatLngs,
  inverseLerpClamped,
  latLngToVector3,
  MARKER_RADIUS,
  MIN_CAMERA_DISTANCE,
  OCEAN_RADIUS,
  POINT_RADIUS,
  TRACK_RADIUS,
  writeLatLng,
} from "./geo";
import type { GlobePalette } from "./palette";

/** Pin radius for the smallest and the largest folder, in globe radii. */
const MIN_PIN = 0.009;
const MAX_PIN = 0.026;

/** Pins carry the globe when it is small on screen; the EXIF clouds take over up close. */
const PIN_OPACITY_FAR = 1;
const PIN_OPACITY_NEAR = 0.45;
const CLOUD_OPACITY_FAR = 0.14;
const CLOUD_OPACITY_NEAR = 0.9;
const COLLECTION_OPACITY_FAR = 0.07;
const COLLECTION_OPACITY_NEAR = 0.32;

const HIGHLIGHT_SCALE = 1.55;

type Pin = {
  trip: TripLocation;
  position: Vector3;
  radius: number;
};

type Cloud = {
  name: string;
  geometry: BufferGeometry;
  material: PointsMaterial;
  collection: boolean;
};

type Track = {
  name: string;
  geometry: BufferGeometry;
  material: LineBasicMaterial;
};

/**
 * Whether a point on the globe is on the near side of the horizon.
 *
 * Markers on the far side are already hidden by the opaque ocean sphere, but the
 * raycaster happily reaches straight through it, so hover and click need the same test.
 */
function isFacingCamera(position: Vector3, cameraPosition: Vector3): boolean {
  const distance = cameraPosition.length();
  if (distance <= OCEAN_RADIUS) return true;
  return position.dot(cameraPosition) / distance > (OCEAN_RADIUS * position.length()) / distance;
}

function pinRadius(photoCount: number, largestFolder: number): number {
  const share = largestFolder > 0 ? photoCount / largestFolder : 0;
  return MIN_PIN + (MAX_PIN - MIN_PIN) * Math.sqrt(share);
}

function buildPointGeometry(points: GeoPointTuple[], radius: number): BufferGeometry {
  const positions: number[] = [];
  for (const [lat, lng] of points) writeLatLng(positions, lat, lng, radius);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  return geometry;
}

/**
 * The transat fixes are tens of degrees apart. A straight chord between two of them cuts
 * through the planet and vanishes behind it, so the track is resampled along the great
 * circle before it becomes line segments.
 */
function buildTrackGeometry(points: GeoPointTuple[], radius: number): BufferGeometry {
  const positions: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const arc = greatCircleLatLngs(points[i - 1], points[i]);
    for (let step = 1; step < arc.length; step++) {
      writeLatLng(positions, arc[step - 1][0], arc[step - 1][1], radius);
      writeLatLng(positions, arc[step][0], arc[step][1], radius);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  return geometry;
}

export type MarkersProps = {
  trips: TripLocation[];
  palette: GlobePalette;
  /** The trip under the pointer or under keyboard focus. */
  active: string | null;
  selected: string | null;
  onHover: (tripName: string | null) => void;
  onSelect: (tripName: string) => void;
  /** DOM node used for the hover label, moved in place each frame. */
  labelRef: RefObject<HTMLDivElement | null>;
};

/**
 * Trip pins, EXIF point clouds and the transat track.
 *
 * Draw calls stay proportional to the number of trips, not to the 1666 photos: one pin
 * mesh per place, one `Points` object per folder that has EXIF data, one `LineSegments`
 * for the crossing.
 */
export function Markers({
  trips,
  palette,
  active,
  selected,
  onHover,
  onSelect,
  labelRef,
}: MarkersProps) {
  const { camera, size } = useThree();

  const pinGeometry = useMemo(() => new SphereGeometry(1, 14, 10), []);
  useEffect(() => () => pinGeometry.dispose(), [pinGeometry]);

  const pins = useMemo<Pin[]>(() => {
    // `best-of` is a curation of the other folders, and the transat is a journey rather
    // than a place — neither earns a pin.
    const pinnable = trips.filter((trip) => trip.kind !== "collection" && !trip.track);
    const largest = pinnable.reduce((max, trip) => Math.max(max, trip.photoCount), 0);
    return pinnable.map((trip) => ({
      trip,
      position: new Vector3(...latLngToVector3(trip.lat, trip.lng, MARKER_RADIUS)),
      radius: pinRadius(trip.photoCount, largest),
    }));
  }, [trips]);

  const regionMaterials = useMemo(() => {
    const materials = new Map<TripRegion, MeshBasicMaterial>();
    for (const [region, color] of Object.entries(palette.region)) {
      materials.set(
        region as TripRegion,
        new MeshBasicMaterial({ color, transparent: true, depthWrite: false }),
      );
    }
    return materials;
  }, [palette]);

  useEffect(() => {
    return () => {
      for (const material of regionMaterials.values()) material.dispose();
    };
  }, [regionMaterials]);

  const haloMaterial = useMemo(
    () => new MeshBasicMaterial({ transparent: true, opacity: 0.22, depthWrite: false }),
    [],
  );
  useEffect(() => () => haloMaterial.dispose(), [haloMaterial]);

  useEffect(() => {
    const trip = trips.find((candidate) => candidate.name === selected);
    haloMaterial.color.set(trip ? palette.region[trip.region] : palette.region.Global);
  }, [haloMaterial, palette, selected, trips]);

  const clouds = useMemo<Cloud[]>(
    () =>
      trips
        .filter((trip) => trip.points.length > 0 && !trip.track)
        .map((trip) => ({
          name: trip.name,
          collection: trip.kind === "collection",
          geometry: buildPointGeometry(trip.points, POINT_RADIUS),
          material: new PointsMaterial({
            color: palette.region[trip.region],
            size: trip.kind === "collection" ? 0.008 : 0.011,
            sizeAttenuation: true,
            transparent: true,
            depthWrite: false,
          }),
        })),
    [trips, palette],
  );

  const tracks = useMemo<Track[]>(
    () =>
      trips
        .filter((trip) => trip.track && trip.points.length > 1)
        .map((trip) => ({
          name: trip.name,
          geometry: buildTrackGeometry(trip.points, TRACK_RADIUS),
          material: new LineBasicMaterial({
            color: palette.region[trip.region],
            transparent: true,
            depthWrite: false,
          }),
        })),
    [trips, palette],
  );

  useEffect(() => {
    return () => {
      for (const cloud of clouds) {
        cloud.geometry.dispose();
        cloud.material.dispose();
      }
    };
  }, [clouds]);

  useEffect(() => {
    return () => {
      for (const track of tracks) {
        track.geometry.dispose();
        track.material.dispose();
      }
    };
  }, [tracks]);

  const positionsByName = useMemo(() => {
    const map = new Map<string, Vector3>();
    for (const pin of pins) map.set(pin.trip.name, pin.position);
    for (const trip of trips) {
      if (map.has(trip.name)) continue;
      map.set(trip.name, new Vector3(...latLngToVector3(trip.lat, trip.lng, MARKER_RADIUS)));
    }
    return map;
  }, [pins, trips]);

  const projected = useRef(new Vector3());

  useFrame(() => {
    const distance = camera.position.length();
    // 1 when the camera is as close as it can get, 0 at the default framing and beyond.
    const closeness =
      1 - inverseLerpClamped(distance, MIN_CAMERA_DISTANCE, DEFAULT_CAMERA_DISTANCE);

    const pinOpacity = PIN_OPACITY_FAR + (PIN_OPACITY_NEAR - PIN_OPACITY_FAR) * closeness;
    for (const material of regionMaterials.values()) material.opacity = pinOpacity;
    haloMaterial.opacity = 0.18 + 0.12 * closeness;

    const cloudOpacity = CLOUD_OPACITY_FAR + (CLOUD_OPACITY_NEAR - CLOUD_OPACITY_FAR) * closeness;
    const collectionOpacity =
      COLLECTION_OPACITY_FAR + (COLLECTION_OPACITY_NEAR - COLLECTION_OPACITY_FAR) * closeness;
    for (const cloud of clouds) {
      cloud.material.opacity = cloud.collection ? collectionOpacity : cloudOpacity;
    }
    for (const track of tracks) track.material.opacity = 0.35 + 0.5 * closeness;

    const label = labelRef.current;
    if (!label) return;
    const position = active ? positionsByName.get(active) : undefined;
    if (!position) {
      label.style.opacity = "0";
      return;
    }

    // Hide the label once its marker has rotated behind the horizon.
    const facing = isFacingCamera(position, camera.position);
    projected.current.copy(position).project(camera);
    label.style.opacity = facing ? "1" : "0";
    label.style.transform = `translate3d(${
      (projected.current.x * 0.5 + 0.5) * size.width
    }px, ${(projected.current.y * -0.5 + 0.5) * size.height}px, 0)`;
  });

  const handleOver = (pin: Pin) => (event: ThreeEvent<PointerEvent>) => {
    if (!isFacingCamera(pin.position, camera.position)) return;
    event.stopPropagation();
    onHover(pin.trip.name);
  };

  return (
    <group>
      {clouds.map((cloud) => (
        <points key={cloud.name} geometry={cloud.geometry} material={cloud.material} />
      ))}

      {tracks.map((track) => (
        <lineSegments key={track.name} geometry={track.geometry} material={track.material} />
      ))}

      {pins.map((pin) => {
        const highlighted = pin.trip.name === active || pin.trip.name === selected;
        return (
          // biome-ignore lint/a11y/noStaticElementInteractions: a three.js mesh is not DOM; the keyboard path is the trip list in PhotoGlobe
          <mesh
            key={pin.trip.name}
            geometry={pinGeometry}
            material={regionMaterials.get(pin.trip.region)}
            position={pin.position}
            scale={pin.radius * (highlighted ? HIGHLIGHT_SCALE : 1)}
            onPointerOver={handleOver(pin)}
            onPointerOut={() => onHover(null)}
            onClick={(event) => {
              if (!isFacingCamera(pin.position, camera.position)) return;
              event.stopPropagation();
              onSelect(pin.trip.name);
            }}
          />
        );
      })}

      {pins
        .filter((pin) => pin.trip.name === selected)
        .map((pin) => (
          <mesh
            key={`halo-${pin.trip.name}`}
            geometry={pinGeometry}
            material={haloMaterial}
            position={pin.position}
            scale={pin.radius * 2.6}
            raycast={() => null}
          />
        ))}
    </group>
  );
}
