import { WorldManager } from "@components/canvas/ChunkGenerationSystem/WorldManager";

const Page = () => {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <WorldManager />
    </div>
  );
};

export default Page;
