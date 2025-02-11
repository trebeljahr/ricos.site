uniform float uTime;
uniform vec2 uResolution;
varying vec2 vUv;

void main() {
    vec2 st = gl_FragCoord.xy / uResolution;
    gl_FragColor = vec4(st.x, st.y, abs(sin(uTime)), 1.0);
}
        