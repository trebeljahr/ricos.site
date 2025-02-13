#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D u_tex0;
uniform vec2 u_tex0Resolution;

uniform vec2 u_resolution;
uniform float u_pixelRatio; // new uniform for device pixel ratio
uniform vec2 u_mouse;
uniform float u_time;

void main () {
    // Divide by (u_resolution * u_pixelRatio) so that the coordinate is normalized 
    // to the actual physical resolution.
    vec2 st = gl_FragCoord.xy / (u_resolution * u_pixelRatio);
    vec4 color = texture2D(u_tex0, st);
    gl_FragColor = color;
}
