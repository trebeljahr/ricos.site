precision mediump float;

uniform vec2 u_resolution;

float circleDistance(vec2 p, float r) {
    return length(p) - r;
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    uv = fract(uv * 5.0);
    uv = (uv - 0.5) * 2.0;
    uv.x *= u_resolution.x / u_resolution.y;

    float d = circleDistance(uv, 0.5);
    gl_FragColor = vec4(d, d, d, 1.0);
}