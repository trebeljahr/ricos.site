import {
  DecoderDemo,
  MemoryAddressDemo,
  MultiplexerDemo,
} from "@components/computer/AddressRouting";
import { ComputerDemoNav } from "@components/computer/ComputerDemoNav";
import { LazyLogicTutorial } from "@components/computer/tutorial/LazyLogicTutorial";
import Layout from "@components/Layout";
import { useState } from "react";

export default function AddressRoutingPage() {
  const [building, setBuilding] = useState(false);
  return (
    <Layout
      title="Decoders and multiplexers"
      description="Build a decoder, follow a multiplexer, and address a memory cell."
      keywords={[]}
      url="computer/decoders-and-multiplexers"
      noindex
      fillViewport
    >
      <main className="mx-auto w-full max-w-6xl px-3 pb-16 pt-5 sm:px-6 sm:pt-8">
        <ComputerDemoNav current="decoders-and-multiplexers" />
        <header className="mx-auto my-8 max-w-prose">
          <h1 className="text-3xl font-semibold tracking-tight">Decoders and multiplexers</h1>
          <p className="mt-3">
            An address picks a wire. A multiplexer picks the data that travels along it.
          </p>
        </header>
        <section className="mb-10" aria-label="Build a decoder first">
          <div className="mx-auto max-w-prose">
            <h2 className="text-xl font-semibold">Build a decoder first</h2>
            <p className="my-3">
              Use two address bits to light exactly one of four outputs. Try your circuit before
              revealing the wiring below.
            </p>
            <button
              type="button"
              className="rounded border border-current px-4 py-3 text-sm hover:bg-gray-100 focus-visible:outline-2 dark:hover:bg-gray-800"
              aria-expanded={building}
              aria-controls="decoder-builder"
              onClick={() => setBuilding(!building)}
            >
              {building ? "Close the builder" : "Try building a decoder"}
            </button>
          </div>
          <div id="decoder-builder" className={building ? "mt-5" : "hidden"}>
            {building && <LazyLogicTutorial title="Build a decoder" levels={["decoder"]} />}
          </div>
        </section>
        <div className="mx-auto max-w-prose space-y-12">
          <section>
            <h2 className="mb-4 text-xl font-semibold">Decode the address</h2>
            <DecoderDemo />
            <p className="mt-3 text-sm">
              <code>{"<DecoderDemo />"}</code>
            </p>
          </section>
          <section>
            <h2 className="mb-4 text-xl font-semibold">Choose which signal gets through</h2>
            <MultiplexerDemo />
            <p className="mt-3 text-sm">
              <code>{"<MultiplexerDemo />"}</code>
            </p>
          </section>
          <section>
            <h2 className="mb-4 text-xl font-semibold">Read and write one memory cell</h2>
            <MemoryAddressDemo />
            <p className="mt-3 text-sm">
              <code>{"<MemoryAddressDemo />"}</code>
            </p>
          </section>
        </div>
        <ComputerDemoNav current="decoders-and-multiplexers" bottom />
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true } as const;
  return { props: {} };
}
