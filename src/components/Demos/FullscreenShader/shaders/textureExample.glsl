uniform sampler2D u_tex0;
uniform vec2 u_tex0Resolution;

uniform vec2 u_resolution;
uniform float u_pixelRatio; 
uniform vec2 u_mouse;
uniform float u_time;

void main () {
    vec2 uv = gl_FragCoord.xy / (u_resolution * u_pixelRatio);
    vec4 color = texture2D(u_tex0, uv);
    gl_FragColor = color;
}
