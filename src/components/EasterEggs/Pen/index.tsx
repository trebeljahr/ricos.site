// A plain re-export, like the clock: MetadataDisplay is already loaded lazily,
// and a second lazy layer inside it made Turbopack ask for a chunk that does
// not exist.
export { default as PenEgg } from "./PenEgg";
