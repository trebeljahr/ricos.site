import { In, ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";

const seoInfo = {
  title: "Rico's R3F Playground",
  description:
    "Welcome to my R3F Playground! It's where I experiment with all things Three.js and React Three Fibre to learn those technologies, building out little demos, trying to improve my understanding",
  url: "/r3f",
  keywords: [
    "threejs",
    "react-three-fiber",
    "r3f",
    "3D",
    "programming",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/r3f.png",
  imageAlt: "image of a 3D playground",
};

export default function Page() {
  return (
    <ThreeFiberLayout seoInfo={seoInfo}>
      <In>
        <div className="flex-col items-center justify-center m-auto mt-10 max-w-2xl">
          <h1>Welcome to my R3F Playground!</h1>
          <p>
            Here is where I experiment with all things Three.js and React Three
            Fibre to learn those technologies, building out little demos, trying
            to improve my understanding so that I can one day build a complete
            3D game in the browser. You can check out the demos in the side
            panel.
          </p>
        </div>
      </In>
    </ThreeFiberLayout>
  );
}

export async function getStaticProps() {
  return { props: { title: "Index" } };
}
