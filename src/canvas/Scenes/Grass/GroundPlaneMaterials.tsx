import { DoubleSide, ShaderMaterial } from "three";

const vertexShader = `
        void main() {
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;

const lightGreenFragmentShader = `
void main() {
    gl_FragColor = vec4(0.2, 0.8, 0.6, 1.0);
}
`;

const blackFragmentShader = `
void main() {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
}
`;

export const LightGreenPlaneMaterial = new ShaderMaterial({
  vertexShader,
  fragmentShader: lightGreenFragmentShader,
  side: DoubleSide,
  transparent: true,
});

export const BlackPlaneMaterial = new ShaderMaterial({
  vertexShader,
  fragmentShader: blackFragmentShader,
  side: DoubleSide,
  transparent: true,
});
