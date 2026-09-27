// A plain re-export: MetadataDisplay is already loaded lazily, and a second
// lazy layer inside it made Turbopack ask for a chunk that does not exist.
export { default as ClockEgg } from "./ClockEgg";
