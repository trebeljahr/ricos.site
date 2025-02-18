precision mediump float;

varying float z;
uniform vec3 color;

void main() {
  // vec3 green = vec3(0.4, 0.7, 0.1);
  vec3 orange = vec3(0.949, 0.412, 0.0);
  csm_DiffuseColor = vec4(color, 1.0);
}