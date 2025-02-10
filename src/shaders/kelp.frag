precision mediump float;

varying float y;

void main() {
  vec3 green = vec3(0.4, 0.7, 0.1);
  csm_DiffuseColor = vec4(green * (y + 0.2), 1.0);
}