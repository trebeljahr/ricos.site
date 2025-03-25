import { useEffect, useRef, useState } from "react";
import data from "src/lib/links.preval";
import { toLinks, toLinksFromNameUrlTuples } from "src/lib/toLinks";

const sideStyle =
  "z-[1500] absolute overflow-x-hidden overflow-y-auto text-sm w-60 bg-leva-dark h-screen  transform transition-all fixed duration-700 text-leva-white p-2";

const buttonStyle =
  "z-[1500] absolute w-10 h-10 bg-yellow-400 hover:w-11 hover:h-11 top-0 cursor-pointer transition-all transform duration-700 flex items-center justify-center";

export const NavbarR3F = () => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null!);

  const toggleOpen = (e: any) => {
    setOpen(!open);
    e.stopPropagation();
  };

  useEffect(() => {
    if (!document) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (open && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("click", handleOutsideClick);

    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [open]);

  return (
    <>
      <button
        id="close-btn"
        className={`${buttonStyle} ${open && "translate-x-60"} text-leva-dark`}
        onClick={toggleOpen}
      >
        {open ? "<" : ">"}
      </button>
      <div className={`${sideStyle} ${!open && "-translate-x-60"}`}>
        <div className="relative h-fit min-h-screen pb-20" ref={menuRef}>
          <nav className="flex flex-col">
            {Object.entries(data.links).map(([key, links]) => {
              return (
                <div key={key} className="flex flex-col">
                  <h2 className="text-lg font-bold">{key}</h2>
                  <div className="flex flex-col">
                    {links.map(toLinksFromNameUrlTuples)}
                  </div>
                </div>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
};
