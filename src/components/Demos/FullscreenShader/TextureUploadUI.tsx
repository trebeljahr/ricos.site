import React, { useCallback, useState } from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import { Rnd } from "react-rnd";
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

  const [menuOpen, setMenuOpen] = useState(true);

  const handleToggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  return (
    <Rnd enableResizing={false} className="absolute top-2 right-2 w-72">
      <div className=" bg-white dark:bg-gray-700 p-4 rounded shadow-lg overflow-y-auto z-10 w-72">
        <div
          className={`flex items-center justify-between ${
            menuOpen ? "mb-4" : ""
          }`}
        >
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
              onChange={handleFileChange}
              className="block mb-4 w-full"
            />
            {previewUrls.length > 0 && (
              <ul className="space-y-2">
                {previewUrls.map((url, index) => (
                  <PreviewUrl
                    key={index}
                    url={url}
                    onDelete={handleDelete}
                    onUpdate={handleUpdate}
                    index={index}
                  />
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </Rnd>
  );
};
