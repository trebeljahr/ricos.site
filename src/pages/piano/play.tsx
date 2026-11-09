import { devOnlyProps, PianoDemoPage } from "@components/piano/PianoDemoPage";
import { PlayablePiano } from "@components/piano/PlayablePiano";

export default function PlayPage() {
  return (
    <PianoDemoPage
      slug="play"
      description="A sampled grand piano to play with a mouse, fingers, the computer keyboard or a MIDI keyboard."
    >
      <PlayablePiano maxWhiteKeys={36} />
    </PianoDemoPage>
  );
}

export const getStaticProps = devOnlyProps;
