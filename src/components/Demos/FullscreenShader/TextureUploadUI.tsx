import React, { useCallback, useState } from "react";
import { FaChevronDown, FaChevronUp, FaImage } from "react-icons/fa";
import { TextureLoader } from "three";
import { useEditorContext } from "./EditorContextProvider";
import { PreviewUrl } from "./PreviewUrl";

export const TextureUploadUI = () => {
  const { setTextures } = useEditorContext();
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

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
    [setTextures]
  );

  // Delete texture at index.
  const handleDelete = useCallback(
    (index: number) => {
      setTextures((prev) => prev.filter((_, i) => i !== index));
      setPreviewUrls((prev) => {
        URL.revokeObjectURL(prev[index]);
        return prev.filter((_, i) => i !== index);
      });
    },
    [setTextures]
  );

  // Update (change) an existing texture.
  const handleUpdate = useCallback(
    (index: number, file: File) => {
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
    },
    [setTextures]
  );

  const [menuOpen, setMenuOpen] = useState(false);

  const handleToggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  return (
    <div className="bg-inherit overflow-y-auto w-fit">
      <button
        onClick={handleToggleMenu}
        className="flex place-items-center p-2"
      >
        <FaImage />
      </button>
      {menuOpen && (
        <div className="absolute z-20 top-[34px] right-0 w-72 h-fit bg-[#0a0a0a] p-2">
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full"
          />
          {previewUrls.length > 0 && (
            <div className="mt-4">
              {previewUrls.map((url, index) => (
                <PreviewUrl
                  key={index}
                  url={url}
                  onDelete={handleDelete}
                  onUpdate={handleUpdate}
                  index={index}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
