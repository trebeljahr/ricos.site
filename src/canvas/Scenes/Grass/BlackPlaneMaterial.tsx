import { DoubleSide, ShaderMaterial } from "three";

const vertexShader = `
        void main() {
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;

const fragmentShader = `
        void main() {
            gl_FragColor = vec4(0., 0., 0., 1.0);
        }
    `;

export const blackPlaneMaterial = new ShaderMaterial({
  vertexShader,
  fragmentShader,
  side: DoubleSide,
  transparent: true,
});
