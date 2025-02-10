import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const sideStyle =
  "z-[1500] absolute overflow-x-hidden overflow-y-auto font-leva text-sm	w-60 bg-leva-dark h-screen  transform transition-all fixed duration-700 text-leva-white p-2";

const buttonStyle =
  "z-[1500] font-leva text-sm absolute w-10 h-10 bg-yellow-400 hover:w-11 hover:h-11 top-0 cursor-pointer transition-all transform duration-700 flex items-center justify-center";

export const Navbar = () => {
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
        className={`${buttonStyle} ${open && "translate-x-60"}`}
        onClick={toggleOpen}
      >
        {open ? "<" : ">"}
      </button>
      <div className={`${sideStyle} ${!open && "-translate-x-60"}`}>
        <div className="relative h-full min-h-[750px]" ref={menuRef}>
          <nav className="flex flex-col">
            <Link href={"/r3f"}>Home</Link>
            <Link href={"/r3f/birds"}>Birds</Link>
            <Link href={"/r3f/fbo-demo"}>FBO Demo</Link>
            <Link href={"/r3f/mixamo-character"}>Mixamo Character</Link>
            <Link href={"/r3f/first-person-controller"}>
              First Person Controller
            </Link>
            <Link href={"/r3f/fishs"}>Fish</Link>
            <Link href={"/r3f/ocean"}>Ocean</Link>
            <Link href={"/r3f/ship"}>Ship</Link>
            <Link href={"/r3f/third-person-camera"}>Third Person Camera</Link>
          </nav>
        </div>
      </div>
    </>
  );
};
