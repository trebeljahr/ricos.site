import React, { useCallback, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ShaderMaterial, Vector2, Texture, TextureLoader } from "three";
import { useRef } from "react";
import fragmentShader from "./fragmentShader.glsl";
import vertexShader from "./vertexShader.glsl";
import { FaTrash, FaEdit, FaChevronDown, FaChevronUp } from "react-icons/fa";

// --- FullCanvasShaderMesh Component ---
export function FullCanvasShaderMesh({ textures }: { textures: Texture[] }) {
  const shaderRef = useRef<ShaderMaterial>(null!);
  const { size, pointer } = useThree();

  useFrame(({ clock }) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.u_time.value = clock.getElapsedTime();
      shaderRef.current.uniforms.u_pointer.value.copy(pointer);
    }
  });

  // Build texture uniforms (u_tex0, u_tex1, etc.)
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
          u_pixelRatio: { value: window.devicePixelRatio },
          u_pointer: { value: new Vector2(0, 0) },
          ...textureUniforms,
        }}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  );
}

// --- TextureUploadMenu Component ---
type TextureUploadMenuProps = {
  previewUrls: string[];
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDelete: (index: number) => void;
  onUpdate: (index: number, file: File) => void;
};

export function TextureUploadMenu({
  previewUrls,
  onFileChange,
  onDelete,
  onUpdate,
}: TextureUploadMenuProps) {
  const [menuOpen, setMenuOpen] = useState(true);

  const handleToggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const handleUpdateFileChange = (
    index: number,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (files && files[0]) {
      onUpdate(index, files[0]);
    }
  };

  return (
    <div className="absolute top-2 right-2 bg-white bg-opacity-90 p-4 rounded shadow-lg max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <span className="font-bold">Uploaded Textures</span>
        <button onClick={handleToggleMenu} className="focus:outline-none">
          {menuOpen ? <FaChevronUp /> : <FaChevronDown />}
        </button>
      </div>
      {menuOpen && (
        <>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={onFileChange}
            className="block mb-4"
          />
          {previewUrls.length > 0 && (
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
                  <div className="flex space-x-2 ml-auto">
                    <button
                      onClick={() => onDelete(index)}
                      className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                      title="Delete texture"
                    >
                      <FaTrash />
                    </button>
                    <label
                      htmlFor={`update-file-${index}`}
                      className="bg-blue-500 text-white px-2 py-1 rounded cursor-pointer hover:bg-blue-600"
                      title="Change texture"
                    >
                      <FaEdit />
                    </label>
                    <input
                      id={`update-file-${index}`}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleUpdateFileChange(index, e)}
                      className="hidden"
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

// --- Main ShaderWithTextureUpload Component ---
export function ShaderWithTextureUpload() {
  const [textures, setTextures] = useState<Texture[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  // Append new textures to the existing ones.
  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files) return;

      const loader = new TextureLoader();
      const fileArray = Array.from(files);

      fileArray.forEach((file) => {
        const url = URL.createObjectURL(file);
        loader.load(url, (texture) => {
          setTextures((prev) => [...prev, texture]);
          setPreviewUrls((prev) => [...prev, url]);
        });
      });
    },
    []
  );

  // Delete texture at index.
  const handleDelete = useCallback((index: number) => {
    setTextures((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  // Update (change) an existing texture.
  const handleUpdate = useCallback((index: number, file: File) => {
    const loader = new TextureLoader();
    const url = URL.createObjectURL(file);
    loader.load(url, (texture) => {
      setTextures((prev) => {
        const newTextures = [...prev];
        newTextures[index] = texture;
        return newTextures;
      });
      setPreviewUrls((prev) => {
        const newUrls = [...prev];
        URL.revokeObjectURL(prev[index]);
        newUrls[index] = url;
        return newUrls;
      });
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
        {/* We use a random key to force re-mounting on changes */}
        <FullCanvasShaderMesh key={Math.random()} textures={textures} />
      </Canvas>

      <TextureUploadMenu
        previewUrls={previewUrls}
        onFileChange={handleFileChange}
        onDelete={handleDelete}
        onUpdate={handleUpdate}
      />
    </div>
  );
}

export default ShaderWithTextureUpload;
