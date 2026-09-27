/**
 * Hand-authored geography for every photography trip folder.
 *
 * Why this file exists: only 1666 of 4900 photos carry EXIF GPS, and the split is
 * camera-dependent — the Pixel 6 writes GPS, the ILCE-7, the Canons, the Pentax and
 * the Nikon never did. Nineteen folders have zero GPS, so their marker position has
 * to be reasoned out of alt texts and travel stories instead of measured. Each entry
 * records where the pin came from, so a future reader can disagree with it.
 *
 * `lat`/`lng` here are the MANUAL fallback. `extractPhotoGeodata.ts` prefers the EXIF
 * centroid whenever a folder has enough GPS coverage (see `MIN_GPS_COVERAGE`) and falls
 * back to these numbers otherwise. Edit freely — the values ship straight to the globe.
 */

/** Coarse grouping used for the globe legend. Eight values, `Global` is not drawn. */
export type TripRegion =
  | "Europe"
  | "South Asia"
  | "Southeast Asia"
  | "Caribbean"
  | "South America"
  | "Africa/Middle East"
  | "Atlantic"
  | "Global";

export type TripCentroid = {
  /** Folder name under `src/content/Notes/assets/photography`. */
  name: string;
  /** Human readable label for the marker and the legend. */
  label: string;
  region: TripRegion;
  /** Manual fallback latitude, used when EXIF coverage is too thin to trust. */
  lat: number;
  /** Manual fallback longitude. */
  lng: number;
  /**
   * `"collection"` marks a cross-trip curation rather than a place. The renderer must
   * not draw a pin, a label or a legend swatch for it, and it must not be counted as a
   * visited place — its photos are duplicates of the per-trip folders.
   */
  kind?: "collection";
  /**
   * `true` for a journey whose points are supposed to be thousands of kilometres apart.
   * Track trips keep their points in chronological order (draw them as a polyline) and
   * are exempt from the outlier guard that rejects points far from the folder median.
   */
  track?: boolean;
  /** Always force the manual position, whatever the EXIF says. */
  forceManual?: boolean;
  /** Why this pin sits where it sits. */
  note: string;
};

export const TRIP_CENTROIDS: TripCentroid[] = [
  {
    name: "alps",
    label: "Alps",
    region: "Europe",
    lat: 47.1,
    lng: 11.9,
    note: "123 photos, zero GPS (ILCE-7). Alt texts anchor the route: Marienplatz in Munich at one end, Venice's Grand Canal and St Mark's at the other, with 30 peak, 17 lake and 3 hut alts in between. Pin sits in the Zillertal, on the Munich-Venice axis and inside the high Alps.",
  },
  {
    name: "best-of",
    label: "Best Of",
    region: "Global",
    kind: "collection",
    lat: 22.48,
    lng: -30.74,
    note: "572 photos, 242 with GPS spanning lng -74.4 to 77.7 — a global portfolio cut, not a trip. Its arithmetic centroid lands in the middle of the Atlantic, so it gets no pin. Kept only so the points can render as a faint global scatter.",
  },
  {
    name: "central-india",
    label: "Central India",
    region: "South Asia",
    lat: 26,
    lng: 78.5,
    note: "78 photos, zero GPS. 11 alts name the Taj Mahal, plus a dawn shot over a misty river valley. This is the Agra-Gwalior-Orchha-Khajuraho corridor; pin between Gwalior and Orchha rather than on Agra alone.",
  },
  {
    name: "colombia-2024",
    label: "Colombia",
    region: "South America",
    lat: 4.71,
    lng: -74.07,
    note: "484 photos, 434 with GPS, so the EXIF centroid wins. Manual fallback is Bogota. Three DJI drone files (camera FC3682) lack GPSLongitudeRef and read +74.37 instead of -74.37 — the outlier guard drops them.",
  },
  {
    name: "crete",
    label: "Crete",
    region: "Europe",
    lat: 35.12,
    lng: 24.75,
    note: "80 photos, zero GPS. The 26 day-by-day stories under travel/crete trace Heraklion, Ierapetra, Chrissi, Matala, Psiloritis, Hora Sfakion and Agia Galini — overwhelmingly the south coast and the central massif, so the pin sits south of the island's geometric centre.",
  },
  {
    name: "delhi",
    label: "Delhi",
    region: "South Asia",
    lat: 28.65,
    lng: 77.22,
    note: "88 photos, zero GPS. 9 alts say Delhi outright and 5 name Jama Masjid. Single city, so the city centre is the correct marker.",
  },
  {
    name: "dominica",
    label: "Dominica",
    region: "Caribbean",
    lat: 15.41,
    lng: -61.37,
    note: "254 photos, 254 with GPS (Pixel 6). The bbox reaches lat 16.246 because a few frames were shot on Guadeloupe on the way in, but they do not move the centroid off Dominica.",
  },
  {
    name: "east-india",
    label: "East India",
    region: "South Asia",
    lat: 26.4,
    lng: 90.3,
    note: "106 photos, zero GPS. Matches the india-2022 stories: Kolkata, Darjeeling, Sikkim, Shillong, Cherrapunji, Nongriat. A naive mean of those cities falls inside Bangladesh, so the pin is nudged onto Indian land in the Assam/North Bengal corridor.",
  },
  {
    name: "egypt",
    label: "Egypt",
    region: "Africa/Middle East",
    lat: 28.51,
    lng: 34.5,
    note: "51 photos, zero GPS (Canon). Alts are entirely Red Sea coast — lagoons, piers, coral, a kingfisher on limestone. No pyramids, no Nile city. This is Dahab and Ras Abu Galum on the Sinai coast, not Cairo.",
  },
  {
    name: "germany",
    label: "Germany",
    region: "Europe",
    lat: 52.52,
    lng: 13.4,
    forceManual: true,
    note: "254 photos but only 35 with GPS, in three disjoint clusters — 18 Berlin, 10 Cologne, 3 Wittenberg, 2 stray Alpine frames. Their mean is an empty field near Halle that nobody visited, so this folder is forced to the manual pin on Berlin. The rest of the folder is flowers, cats and forest, i.e. home.",
  },
  {
    name: "guadeloupe",
    label: "Guadeloupe",
    region: "Caribbean",
    lat: 16.25,
    lng: -61.58,
    note: "230 photos, 207 with GPS. The EXIF centroid sits on Basse-Terre near the Grande-Terre join, which is right for an island shaped like a butterfly.",
  },
  {
    name: "himachal-pradesh",
    label: "Himachal Pradesh",
    region: "South Asia",
    lat: 32.35,
    lng: 77.65,
    note: "229 photos, zero GPS. The india-2022 stories give the route: Manali, Mahri, Chhatru, Chandratal, Losar, Kaza. Pin at Chandratal/Kunzum La on the Manali-Spiti road, deliberately not the state centroid in the lower foothills.",
  },
  {
    name: "india-2023",
    label: "India 2023",
    region: "South Asia",
    lat: 28.6,
    lng: 77.2,
    note: "193 photos, 192 with GPS, so the EXIF centroid wins; two Paris CDG layover frames are dropped by the outlier guard. The trip is genuinely bimodal (Ladakh at 34.6N plus Ahmedabad, Mumbai, Goa and Kerala down to 10.3N), so any single centroid is a compromise. Manual fallback is Delhi, the trip hub.",
  },
  {
    name: "indonesia",
    label: "Indonesia",
    region: "Southeast Asia",
    lat: -8.4,
    lng: 115.1,
    note: "155 photos, zero GPS. Three far-apart clusters: orangutans at Bukit Lawang in north Sumatra, Bali, and Komodo off Flores. Their arithmetic mean falls in the Java Sea, so the pin goes on Bali, the centre of gravity of the island-hopping part.",
  },
  {
    name: "italy",
    label: "Italy",
    region: "Europe",
    lat: 43.6,
    lng: 11.05,
    note: "88 photos, zero GPS. 7 Florence alts including 3 of the Cathedral, alongside 7 Mediterranean and several coast frames. Pin in Tuscany just south-west of Florence so it covers both the city and the coastal shots.",
  },
  {
    name: "laos",
    label: "Laos",
    region: "Southeast Asia",
    lat: 19.9,
    lng: 102.2,
    note: "297 photos, zero GPS — the largest zero-GPS folder. 45 river, 36 waterfall (Kuang Si), 29 temple, 24 cave and 13 karst alts, plus the Royal Palace in Luang Prabang. That is northern Laos: Luang Prabang, Nong Khiaw, Vang Vieng.",
  },
  {
    name: "martinique",
    label: "Martinique",
    region: "Caribbean",
    lat: 14.64,
    lng: -61.02,
    note: "97 photos, 97 with GPS and a tight bbox (lat 14.60-14.87). The EXIF centroid lands on the island interior. Manual fallback is Fort-de-France.",
  },
  {
    name: "nepal",
    label: "Nepal",
    region: "South Asia",
    lat: 27.95,
    lng: 84.6,
    note: "186 photos, zero GPS. Alts split between Pokhara (boats on the lake, paragliders, terraced paddy) and Kathmandu (singing bowls, painted masks, prayer flags, pagodas). Pin in the midhills between the two, near Gorkha.",
  },
  {
    name: "portugal-2024",
    label: "Portugal",
    region: "Europe",
    lat: 38.72,
    lng: -9.14,
    note: "154 photos, 134 with GPS. The bbox runs the whole country, Algarve to Porto, and the EXIF centroid falls in the Alentejo, which is a fair middle. Manual fallback is Lisbon.",
  },
  {
    name: "rajasthan",
    label: "Rajasthan",
    region: "South Asia",
    lat: 26.9,
    lng: 75.8,
    note: "230 photos, zero GPS. The only hard identifications are Jaipur landmarks: Hawa Mahal and Amber Fort. No Jodhpur, Udaipur or Jaisalmer signal in any alt, so the pin is Jaipur; move it west toward 26.5,74.5 if a story later shows a wider circuit.",
  },
  {
    name: "south-india",
    label: "South India",
    region: "South Asia",
    lat: 9.9,
    lng: 76.7,
    note: "302 photos, zero GPS. Matches the india-2020 stories: Mumbai, Kalady, Munnar, Bangalore. 53 beach, 35 palm, 29 market, 23 fishing and 19 tea alts — Kerala dominates, so the pin sits between Kochi and Munnar rather than at the peninsula's geometric middle.",
  },
  {
    name: "spain-2024",
    label: "Spain",
    region: "Europe",
    lat: 40.9,
    lng: -0.8,
    note: "37 photos, zero GPS — the smallest folder. Alts name Madrid and Barcelona plus several airport frames, so it reads as a short two-city hop. Pin on land in Aragon at the midpoint.",
  },
  {
    name: "sri-lanka",
    label: "Sri Lanka",
    region: "South Asia",
    lat: 7.3,
    lng: 80.7,
    note: "202 photos, zero GPS. Alts cover the classic loop: Sigiriya, trains, monks, tea, stupas and 17 beach frames. Pin in the central highlands between Kandy and Sigiriya, the trip's hub; the south-coast beaches are the one outlying cluster.",
  },
  {
    name: "tenerife",
    label: "Tenerife",
    region: "Europe",
    lat: 28.27,
    lng: -16.6,
    note: "58 photos, zero GPS. 8 alts name Mount Teide directly, so the pin is essentially the island centre. Filed under Europe rather than Atlantic so the Atlantic colour stays reserved for the ocean crossing.",
  },
  {
    name: "thailand",
    label: "Thailand",
    region: "Southeast Asia",
    lat: 16.5,
    lng: 99.9,
    note: "128 photos, zero GPS. 20 temple, 17 market, 10 night and 6 street alts, one Chiang Rai reference and a lot of weathered urban facades. Reads as Bangkok plus the north; pin on land at the midpoint of that axis.",
  },
  {
    name: "transat",
    label: "Transatlantic Crossing",
    region: "Atlantic",
    track: true,
    lat: 19.17,
    lng: -35.58,
    note: "113 photos, 71 with GPS forming a real open-ocean track from the Canaries to the Caribbean. The centroid is mid-Atlantic, which is correct here. Points stay in chronological order so the renderer can draw a great-circle polyline.",
  },
  {
    name: "varanasi",
    label: "Varanasi",
    region: "South Asia",
    lat: 25.32,
    lng: 83.01,
    note: "62 photos, zero GPS. Three alts name the Ganges directly, with ghats and river scenes. Single city, so the city centre is the marker.",
  },
  {
    name: "vietnam",
    label: "Vietnam",
    region: "Southeast Asia",
    lat: 20.4,
    lng: 105.9,
    note: "49 photos, zero GPS. Limestone karsts over rice paddies, buffalo in shallow water, karst peaks reflected in still water — Ninh Binh and Tam Coc, with Hanoi as the base. Pin between the two.",
  },
];

/** Lookup by folder name. */
export const TRIP_CENTROIDS_BY_NAME: Record<string, TripCentroid | undefined> = Object.fromEntries(
  TRIP_CENTROIDS.map((trip) => [trip.name, trip]),
);
