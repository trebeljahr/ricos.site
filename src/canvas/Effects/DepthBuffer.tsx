import { type Node, extend, useFrame, useThree } from "@react-three/fiber";
import vertexShader from "@shaders/depth2.vert";
import fragmentShader from "@shaders/sampleDepthBuffer.frag";
import { useEffect, useMemo, useRef } from "react";
import { DepthTexture, LinearFilter, RGBAFormat, WebGLRenderTarget } from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass";

extend({ EffectComposer, ShaderPass, RenderPass });

const _shaderPassOptions = {
  uniforms: {
    time: { value: 0 },
    tDiffuse: { value: null },
    depthTexture: { value: null },
    projectionMatrixInverse: { value: null },
    viewMatrixInverse: { value: null },
  },
  vertexShader,
  fragmentShader,
};

export const DepthBufferEffect = () => {
  const composer = useRef<Node<EffectComposer, typeof EffectComposer>>(null!);
  const ref = useRef<ShaderPass>();
  const { gl, size, scene, camera } = useThree();

  const [target] = useMemo(() => {
    const target = new WebGLRenderTarget(window.innerWidth, window.innerHeight, {
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      format: RGBAFormat,
      stencilBuffer: false,
      depthBuffer: true,
      depthTexture: new DepthTexture(size.width, size.height),
    });
    return [target];
  }, [size]);

  useEffect(() => {
    if (!composer.current.setSize) return;

    composer.current.setSize(size.width, size.height);
  }, [size]);

  useFrame((state) => {
    state.gl.setRenderTarget(target);
    state.gl.render(scene, camera);

    if (ref.current) {
      ref.current.uniforms.depthTexture.value = target.depthTexture;
      ref.current.uniforms.projectionMatrixInverse.value = camera.projectionMatrixInverse;
      ref.current.uniforms.viewMatrixInverse.value = camera.matrixWorld;
      ref.current.uniforms.time.value = state.clock.elapsedTime;
    }
    // composer.current.render()
  }, 1);

  return (
    // @ts-ignore: next-line
    <effectComposer ref={composer} args={[gl]}>
      {/* <renderPass attach='passes' scene={scene} camera={camera} /> */}
      {/* @ts-ignore: next-line */}
      {/* <shaderPass attach='passes' ref={ref} args={[shaderPassOptions]} needsSwap={false} renderToScreen={false} /> */}
    </effectComposer>
  );
};
