precision mediump float;

uniform float u_time;
uniform vec2 u_resolution;

vec2 cubic(vec2 p) {
  return p * p * (3.0 - 2.0 * p);
}

vec2 quintic(vec2 p) {
  return p * p * p * (10.0 + p * (-15.0 + p * 6.0));
}

float whiteNoise2x1(vec2 p) {
  float random = dot(p, vec2(12., 78.));
  random = sin(random);
  random = random * 43758.5453;
  random = fract(random);
  return random;
}

float valueNoiseFn(vec2 uv) {
  vec2 gridUv = fract(uv);
  vec2 gridId = floor(uv);

  gridUv = quintic(gridUv);

  float botLeft = whiteNoise2x1(gridId);
  float botRight = whiteNoise2x1(gridId + vec2(1.0, 0.0));
  float b = mix(botLeft, botRight, gridUv.x);

  float topLeft = whiteNoise2x1(gridId + vec2(0.0, 1.0));
  float topRight = whiteNoise2x1(gridId + vec2(1.0, 1.0));
  float t = mix(topLeft, topRight, gridUv.x);

  float noise = mix(b, t, gridUv.y);

  return noise;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  uv = gl_FragCoord.xy / u_resolution.y;

  vec3 color = vec3(1.0);

  uv += u_time / 10.0;
  float vn = valueNoiseFn(uv * 4.0) * 1.0;
  vn += valueNoiseFn(uv * 8.0) * 0.5;
  vn += valueNoiseFn(uv * 16.0) * 0.25;
  vn += valueNoiseFn(uv * 32.0) * 0.125;
  vn += valueNoiseFn(uv * 64.0) * 0.0625;
  vn /= 2.0;
  color = vec3(vn);

  gl_FragColor = vec4(color, 1.0);
}