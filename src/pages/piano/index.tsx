// The series home does not exist yet; under `next dev` /piano leads to the demo list.
export default function PianoHome() {
  return null;
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { redirect: { destination: "/piano/demos", permanent: false } } as const;
}
