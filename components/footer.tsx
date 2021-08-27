const Footer = () => {
  return (
    <footer className="bg-accent-2 border-t border-accent-2">
      <div className="py-28 flex flex-col lg:flex-row items-center">
        <div className="flex flex-col">
          <h3 className="text-4xl lg:text-5xl font-bold tracking-tighter leading-tight text-center lg:text-left mb-10 lg:mb-5 lg:pr-4">
            Ramblings about the things I learn.
          </h3>
          <p className="mb-10 lg:mb-5 text-center lg:text-left">
            Every other wednesday... or so.
          </p>
        </div>
        <div className="flex flex-col lg:flex-row justify-center items-center lg:pl-4 lg:w-1/2">
          <a className="mx-3 bg-black hover:bg-white hover:text-black border border-black text-white font-bold py-3 px-12 lg:px-8 duration-200 transition-colors mb-6 lg:mb-0">
            Call to Action
          </a>
          <a className="mx-3 font-bold hover:underline">Some other link</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
