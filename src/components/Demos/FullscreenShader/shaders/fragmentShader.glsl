uniform sampler2D u_tex0;
uniform vec2 u_tex0Resolution;

uniform vec2 u_resolution;
uniform float u_pixelRatio;
uniform vec2 u_mouse;
uniform float u_time;

float map(float value, float min1, float max1, float min2, float max2) {
  return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}

void main () {
    vec2 uv = gl_FragCoord.xy / (u_resolution * u_pixelRatio);
    vec4 color1 = texture2D(u_tex0, uv);

    float radius = 0.2;
    vec2 dir = uv - (u_mouse / 2. + 0.5);

    float distance = sqrt(dir.x * dir.x + dir.y * dir.y);
    if (distance < radius) {
        vec3 color = vec3(uv.y, uv.x, abs(sin(u_time)));
        gl_FragColor = vec4(color, 1.0);
    } else {
        gl_FragColor = vec4(uv.x, uv.y, 0, 1.0);
    }
}
