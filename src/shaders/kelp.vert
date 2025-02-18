precision mediump float;

uniform float uTime;
varying float y;

void main() {

  vec3 modifiedPosition = position;

  // float offset = smoothstep(0.0, 10.0, 20.0);
  // modifiedPosition.x += sin(position.y + uTime);
  y = position.y / 300.0;

  modifiedPosition.x += sin(position.y / 40.0 + uTime * 0.8) * 10.0 * y;
  // modifiedPosition.z += sin(position.y / 10.0 + uTime * 0.5 + 2.5) * 4.0;

  // modifiedPosition.z += sin(uTime) * offset;

  csm_Position = modifiedPosition;
}