uniform float u_time;
uniform vec2 u_resolution;
varying vec2 vUv;

void main() {
    vec2 st = gl_FragCoord.xy / u_resolution;
    gl_FragColor = vec4(st.x, st.y, abs(sin(u_time)), 1.0);
}
        