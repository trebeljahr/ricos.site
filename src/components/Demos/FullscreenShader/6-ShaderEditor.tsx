import React, { useCallback, useState } from "react";
import { Texture, TextureLoader } from "three";
import { TextureUploadMenu } from "./5-TextureUploadMenu";
import { FullCanvasShaderEditor } from "./6-withInput";

export function ShaderEditorWithTextureUpload() {
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
      <FullCanvasShaderEditor textures={textures} />

      <TextureUploadMenu
        previewUrls={previewUrls}
        onFileChange={handleFileChange}
        onDelete={handleDelete}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
