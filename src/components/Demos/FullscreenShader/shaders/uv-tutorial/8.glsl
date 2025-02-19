precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;

float sdfHexagon(in vec2 p, in float r) {
    const vec3 k = vec3(-0.866025404, 0.5, 0.577350269);
    p = abs(p);
    p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy;
    p -= vec2(clamp(p.x, -k.z * r, k.z * r), r);
    return length(p) * sign(p.y);
}

vec3 pal(in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d) {
    return a + b * cos(6.28318 * (c * t + d));
}

vec3 pal1(float p) {
    return pal(p, vec3(0.5, 0.5, 0.5), vec3(0.5, 0.5, 0.5), vec3(1.0, 1.0, 1.0), vec3(0.3, 0.20, 0.20));
}
vec3 pal2(float p) {
    return pal(p, vec3(0.5, 0.5, 0.5), vec3(0.5, 0.5, 0.5), vec3(1.0, 1.0, 0.5), vec3(0.8, 0.90, 0.30));
}
vec3 pal3(float p) {
    return pal(p, vec3(0.5, 0.5, 0.5), vec3(0.5, 0.5, 0.5), vec3(1.0, 0.7, 0.4), vec3(0.0, 0.15, 0.20));
}
vec3 pal4(float p) {
    return pal(p, vec3(0.5, 0.5, 0.5), vec3(0.5, 0.5, 0.5), vec3(2.0, 1.0, 0.0), vec3(0.5, 0.20, 0.25));
}
vec3 pal5(float p) {
    return pal(p, vec3(0.8, 0.5, 0.4), vec3(0.2, 0.4, 0.2), vec3(2.0, 1.0, 1.0), vec3(0.0, 0.25, 0.25));
}

vec3 pal6(float p) {
    return pal(p, vec3(0.5, 0.5, 0.5), vec3(0.5, 0.5, 0.5), vec3(1.0, 1.0, 1.0), vec3(0.0, 0.33, 0.67));
}

vec3 pal7(float p) {
    return pal(p, vec3(0.5, 0.5, 0.5), vec3(0.5, 0.5, 0.5), vec3(1.0, 1.0, 1.0), vec3(0.0, 0.10, 0.20));
}

void main() {
    // this is the same as the below three lines
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;

    // vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    // uv = (uv - 0.5) * 2.0;
    // uv.x *= u_resolution.x / u_resolution.y;

    vec2 uv0 = uv;
    uv = fract(uv * 2.0) - 0.5;

    float d = sdfHexagon(uv, 1.0);

    vec3 col = pal6( length(uv0) + u_time);

    float space = 10.0;
    d = sin(d * space + u_time * 2.0) / space;
    d = abs(d);
    // d = smoothstep(0.01, 0.02, d);
    d = 0.02 / d;

    // vec3 col = vec3(0.1961, 1.0, 0.6118);
    col *= d;

    gl_FragColor = vec4(col, 1.0);
}
