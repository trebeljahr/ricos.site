uniform float time;
uniform sampler2D tDiffuse;
uniform sampler2D depthTexture;
varying vec2 vUv;

uniform mat4 projectionMatrixInverse;
uniform mat4 viewMatrixInverse;

vec3 worldCoordinatesFromDepth(float depth) {
  float z = depth * 2.0 - 1.0;

  vec4 clipSpaceCoordinate = vec4(vUv * 2.0 - 1.0, z, 1.0);
  vec4 viewSpaceCoordinate = projectionMatrixInverse * clipSpaceCoordinate;

  viewSpaceCoordinate /= viewSpaceCoordinate.w;

  vec4 worldSpaceCoordinates = viewMatrixInverse * viewSpaceCoordinate;

  return worldSpaceCoordinates.xyz;
}

float sphereSDF(vec3 p, float radius) { return length(p) - radius; }

void main() {
  float depth = texture(depthTexture, vUv).x;
  vec3 worldPosition = worldCoordinatesFromDepth(depth);
  float radius = mod(0.1 * time * 10.0, 3.0);

  if (sphereSDF(worldPosition, radius) < 0.0 &&
      sphereSDF(worldPosition, radius) > -1.0) {
    gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
  } else {
    vec3 sceneColor = texture(tDiffuse, vUv).xyz;
    gl_FragColor = vec4(sceneColor, 1.0);
  }
}
