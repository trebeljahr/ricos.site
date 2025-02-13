import React, { useCallback, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ShaderMaterial, Vector2, Texture, TextureLoader } from "three";
import { useRef } from "react";
import fragmentShader from "./fragmentShader.glsl";
import vertexShader from "./vertexShader.glsl";

function FullCanvasShaderMesh({ textures }: { textures: Texture[] }) {
  const shaderRef = useRef<ShaderMaterial>(null!);
  const { size, pointer } = useThree();

  useFrame(({ clock }) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.u_time.value = clock.getElapsedTime();
      shaderRef.current.uniforms.u_pointer.value.copy(pointer);
    }
  });

  // Create texture uniforms like: u_tex0, u_tex1, etc.
  const textureUniforms = textures.reduce((acc, texture, index) => {
    acc[`u_tex${index}`] = { value: texture };
    return acc;
  }, {} as { [key: string]: { value: Texture } });

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={shaderRef}
        uniforms={{
          u_time: { value: 0 },
          u_resolution: { value: new Vector2(size.width, size.height) },
          u_pixelRatio: { value: window.devicePixelRatio }, // pass the pixel ratio
          u_pointer: { value: new Vector2(0, 0) },
          ...textureUniforms, // pass the texture uniforms so that they can be used in the shader
        }}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  );
}

export function ShaderWithTextureUpload() {
  const [textures, setTextures] = useState<Texture[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files) return;

      const loader = new TextureLoader();
      const fileArray = Array.from(files);
      const loadedTextures: Texture[] = [];
      const urls: string[] = [];

      fileArray.forEach((file) => {
        const url = URL.createObjectURL(file);
        urls.push(url);

        loader.load(url, (texture) => {
          loadedTextures.push(texture);
          if (loadedTextures.length === fileArray.length) {
            setTextures(loadedTextures);
            setPreviewUrls(urls);
          }
        });
      });
    },
    []
  );

  const handleDelete = useCallback((index: number) => {
    // Remove texture from textures array.
    setTextures((prev) => prev.filter((_, i) => i !== index));
    // Remove preview URL and revoke it.
    setPreviewUrls((prev) => {
      const newUrls = prev.filter((_, i) => i !== index);
      URL.revokeObjectURL(prev[index]);
      return newUrls;
    });
  }, []);

  return (
    <div className="relative w-full h-screen">
      <Canvas
        orthographic
        camera={{
          left: -1,
          right: 1,
          top: 1,
          bottom: -1,
          near: 0.1,
          far: 1000,
          position: [0, 0, 1],
        }}
        className="w-full h-full"
      >
        <FullCanvasShaderMesh key={Math.random()} textures={textures} />
      </Canvas>

      {/* UI Overlay */}
      <div className="absolute top-2 right-2 bg-white bg-opacity-90 p-4 rounded shadow-lg max-h-[90vh] overflow-y-auto">
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileChange}
          className="block mb-4"
        />
        {previewUrls.length > 0 && (
          <div>
            <strong className="block mb-2">Uploaded Textures:</strong>
            <ul className="space-y-2">
              {previewUrls.map((url, index) => (
                <li key={index} className="flex items-center space-x-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Texture ${index}`}
                    className="w-12 h-12 object-cover rounded"
                  />
                  <span>{`u_tex${index}`}</span>
                  <button
                    onClick={() => handleDelete(index)}
                    className="ml-auto bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
