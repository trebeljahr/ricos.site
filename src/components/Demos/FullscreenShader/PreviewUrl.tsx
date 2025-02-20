import React, { useState } from "react";
import { FaChevronDown, FaChevronUp, FaEdit, FaTrash } from "react-icons/fa";

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
                <PreviewUrl
                  key={index}
                  url={url}
                  onDelete={onDelete}
                  onUpdate={onUpdate}
                  index={index}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

type PreviewUrlProps = {
  url: string;
  onDelete: (index: number) => void;
  onUpdate: (index: number, file: File) => void;
  index: number;
};

export function PreviewUrl({
  url,
  onDelete,
  onUpdate,
  index,
}: PreviewUrlProps) {
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
    <div className="flex items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={`Texture ${index}`}
        className="w-12 h-12 object-cover rounded"
      />
      <span className="ml-2">{`u_tex${index}`}</span>
      <div className="flex space-x-2 ml-auto">
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
        <button
          onClick={() => onDelete(index)}
          className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
          title="Delete texture"
        >
          <FaTrash />
        </button>
      </div>
    </div>
  );
}
