precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;

float sdfHexagon( in vec2 p, in float r ) {
    const vec3 k = vec3(-0.866025404,0.5,0.577350269);
    p = abs(p);
    p -= 2.0*min(dot(k.xy,p),0.0)*k.xy;
    p -= vec2(clamp(p.x, -k.z*r, k.z*r), r);
    return length(p)*sign(p.y);
}

void main() {
    vec2 uv0 = gl_FragCoord.xy / u_resolution.xy;
    vec2 uv = fract(uv0 * 5.0);
    uv = (uv - 0.5) * 2.0;
    uv.x *= u_resolution.x / u_resolution.y;

    float d = sdfHexagon(uv, 1.0);
    float space = 10.0;
    d = sin(d * space + u_time * 2.0) / space;
    d = abs(d);
    // d = smoothstep(0.01, 0.02, d);
    d = 0.02 / d;

    vec3 col = vec3(0.1961, 1.0, 0.6118);
    col *= d;

    gl_FragColor = vec4(col, 1.0);
}
