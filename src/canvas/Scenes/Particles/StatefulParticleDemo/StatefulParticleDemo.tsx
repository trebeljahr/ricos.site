import { useFont, useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferGeometry,
  DataTexture,
  Float32BufferAttribute,
  FloatType,
  GLSL3,
  Mesh,
  MeshBasicMaterial,
  NearestFilter,
  OrthographicCamera,
  PlaneGeometry,
  Points,
  RawShaderMaterial,
  RGBAFormat,
  Scene,
  Sphere,
  Vector2,
  Vector3,
  WebGLRenderTarget,
} from "three";
import { MeshSurfaceSampler, TextGeometry } from "three-stdlib";

import {
  Bloom,
  EffectComposer,
  ToneMapping,
} from "@react-three/postprocessing";
import drawFragmentShader from "./shaders/drawFragmentShader.glsl";
import drawVertexShader from "./shaders/drawVertexShader.glsl";
import initFragmentShader from "./shaders/initFragmentShader.glsl";
import initVertexShader from "./shaders/initVertexShader.glsl";
import updateFragmentShader from "./shaders/updateFragmentShader.glsl";
import updateVertexShader from "./shaders/updateVertexShader.glsl";

export const StatefulParticleDemo = ({ numParticles = 1024 }) => {
  const font = useFont("/3d-assets/fonts/mystery-quest.json");
  const diffuseTexture = useTexture("/3d-assets/textures/particles/circle.png");

  const { gl } = useThree();
  const particleBufferIndex = useRef(0);
  const particleBuffers = useRef<WebGLRenderTarget[]>([]);
  const particleUpdateQuad = useRef<Mesh<BufferGeometry, RawShaderMaterial>>(
    null!
  );

  const { pointGeo, matDraw, fullscreenCamera, fullscreenScene } =
    useMemo(() => {
      const text = "three.js";

      const data = new Float32Array(numParticles * numParticles * 4);

      const textGeo = new TextGeometry(text, {
        font,
        size: 1,
        height: 0.1,
        curveSegments: 12,
        bevelEnabled: true,
        bevelThickness: 0.1,
        bevelSize: 0.05,
      });

      textGeo.computeBoundingBox();

      const centerOffset =
        -0.5 * (textGeo.boundingBox!.max.x - textGeo.boundingBox!.min.x);
      textGeo.translate(centerOffset, 0, 0);

      const textMesh = new Mesh(textGeo, new MeshBasicMaterial());
      const sampler = new MeshSurfaceSampler(textMesh).build();

      const pt = new Vector3();
      for (let i = 0; i < numParticles * numParticles; i++) {
        sampler.sample(pt);
        data[i * 4 + 0] = pt.x;
        data[i * 4 + 1] = pt.y;
        data[i * 4 + 2] = pt.z;
        data[i * 4 + 3] = 0;
      }

      const dataTexture = new DataTexture(data, numParticles, numParticles);
      dataTexture.format = RGBAFormat;
      dataTexture.type = FloatType;
      dataTexture.needsUpdate = true;

      const fullscreenScene = new Scene();
      const fullscreenCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

      const fsQuadGeo = new PlaneGeometry(2, 2);
      const fsQuad = new Mesh(fsQuadGeo, new RawShaderMaterial());

      const matInit = new RawShaderMaterial({
        uniforms: {
          dataTexture: { value: dataTexture },
        },
        vertexShader: initVertexShader,
        fragmentShader: initFragmentShader,
        glslVersion: GLSL3,
        depthTest: false,
        depthWrite: false,
      });

      const opts = {
        minFilter: NearestFilter,
        magFilter: NearestFilter,
        format: RGBAFormat,
        type: FloatType,
      };

      particleBuffers.current = [
        new WebGLRenderTarget(numParticles, numParticles, opts),
        new WebGLRenderTarget(numParticles, numParticles, opts),
        new WebGLRenderTarget(numParticles, numParticles, opts),
      ];

      fsQuad.material = matInit;
      fullscreenScene.add(fsQuad);

      for (let i = 0; i < particleBuffers.current.length; ++i) {
        gl.setRenderTarget(particleBuffers.current[i]);
        gl.render(fullscreenScene, fullscreenCamera);
      }
      gl.setRenderTarget(null);

      // console.log(particleBuffers);

      fullscreenScene.remove(fsQuad);

      const matUpdate = new RawShaderMaterial({
        uniforms: {
          dataTexture: { value: dataTexture },
          currentBuffer: { value: null },
          previousBuffer: { value: null },
          timeDelta: { value: 0 },
          time: { value: 0 },
        },
        vertexShader: updateVertexShader,
        fragmentShader: updateFragmentShader,
        glslVersion: GLSL3,
        depthTest: false,
        depthWrite: false,
      });

      particleUpdateQuad.current = fsQuad.clone();
      particleUpdateQuad.current.material = matUpdate;

      fullscreenScene.add(particleUpdateQuad.current);

      const pointGeo = new BufferGeometry();
      const positions = [];
      for (let i = 0; i < numParticles * numParticles; ++i) {
        positions.push(i);
      }

      pointGeo.setAttribute(
        "position",
        new Float32BufferAttribute(positions, 1)
      );

      const matDraw = new RawShaderMaterial({
        uniforms: {
          diffuseTexture: { value: diffuseTexture },
          dataTexture: { value: particleBuffers.current[0].texture },
          resolution: { value: new Vector2(numParticles, numParticles) },
          time: { value: 0 },
        },
        vertexShader: drawVertexShader,
        fragmentShader: drawFragmentShader,
        blending: AdditiveBlending,
        depthTest: false,
        depthWrite: false,
        transparent: true,
        glslVersion: GLSL3,
      });

      pointGeo.boundingBox = null;
      pointGeo.boundingSphere = new Sphere(new Vector3(), 1000);

      return {
        particleBuffers,
        particleUpdateQuad,
        pointGeo,
        matDraw,
        fullscreenCamera,
        fullscreenScene,
      };
    }, [gl, numParticles, font, diffuseTexture]);

  useFrame(({ clock, scene, camera, gl }) => {
    const deltaTime = clock.getDelta() * 10;
    const timeTotal = clock.getElapsedTime();

    pointsRef.current.material.uniforms.time.value = timeTotal;

    const currentIndex = particleBufferIndex.current;
    const currentBuffer = particleBuffers.current[currentIndex];
    const prevIndex = (particleBufferIndex.current + 2) % 3;
    const previousBuffer = particleBuffers.current[prevIndex];

    // currentBuffer.texture.needsUpdate = true;
    // previousBuffer.texture.needsUpdate = true;

    particleBufferIndex.current = (particleBufferIndex.current + 1) % 3;

    particleUpdateQuad.current.material.uniforms.currentBuffer.value =
      currentBuffer.texture;
    particleUpdateQuad.current.material.uniforms.previousBuffer.value =
      previousBuffer.texture;
    particleUpdateQuad.current.material.uniforms.time.value = timeTotal;
    particleUpdateQuad.current.material.uniforms.timeDelta.value = deltaTime;
    particleUpdateQuad.current.material.needsUpdate = true;

    gl.render(scene, camera);

    gl.setRenderTarget(particleBuffers.current[particleBufferIndex.current]);
    gl.render(fullscreenScene, fullscreenCamera);
    gl.setRenderTarget(null);

    pointsRef.current.material.uniforms.dataTexture.value =
      particleBuffers.current[particleBufferIndex.current].texture;
  }, 1);

  // useFrame(({ gl, scene, camera }) => {}, 2);

  // useFrame(({ gl, scene, camera }) => {
  //   // gl.render(scene, camera);
  // }, 3);

  const pointsRef = useRef<Points<BufferGeometry, RawShaderMaterial>>(null!);
  return (
    <>
      <points ref={pointsRef} geometry={pointGeo} material={matDraw} />
      <EffectComposer renderPriority={2}>
        <Bloom mipmapBlur luminanceThreshold={1} levels={8} intensity={4} />
        <ToneMapping />
      </EffectComposer>
    </>
  );
};
