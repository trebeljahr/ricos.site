varying float v_fogDepth;
varying vec3 vNormal;

void main() {
  vNormal = (viewMatrix * instanceMatrix * vec4(normal, 0.0)).xyz;

  gl_Position =
      projectionMatrix * viewMatrix * instanceMatrix * vec4(position, 1.0);

  vec4 mvPosition = viewMatrix * vec4(position, 1.0);
  v_fogDepth = length(mvPosition);
}