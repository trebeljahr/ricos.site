import { ThreeFiberLayout } from "@components/dom/Layout";

export default function Page() {
  return (
    <ThreeFiberLayout>
      <main className="prose flex-col items-center justify-center m-auto mt-10">
        <h1>Welcome to my R3F Playground!</h1>
        <p>
          Here is where I experiment with all things Three.js and React Three
          Fibre to learn those technologies, building out little demos, trying
          to improve my understanding so that I can one day build a complete 3D
          game in the browser. You can check out the demos in the side panel.
        </p>
      </main>
    </ThreeFiberLayout>
  );
}

export async function getStaticProps() {
  return { props: { title: "Index" } };
}
