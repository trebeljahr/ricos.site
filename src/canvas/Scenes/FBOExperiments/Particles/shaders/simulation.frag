// clang-format off
#pragma glslify: curlNoise = require('glsl-curl-noise2')

uniform sampler2D positions;
uniform float uTime;
uniform float uFrequency;

varying vec2 vUv;

void main() {
  vec3 pos = texture2D(positions, vUv).rgb;
  vec3 curlPos = texture2D(positions, vUv).rgb;

  pos = curlNoise(pos * uFrequency + uTime * 0.05);
  curlPos = curlNoise(curlPos * uFrequency + uTime * 0.05);
  curlPos += curlNoise(curlPos * uFrequency * 2.0) * 0.5;

  gl_FragColor = vec4(mix(pos, curlPos, sin(uTime)), 1.0);
}