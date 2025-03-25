uniform sampler2D textures[2];
uniform vec3 foxPosition;
uniform float iTime;

varying vec2 vUv;
varying vec2 cloudUV;
varying vec3 vColor;

void main() {
    float contrast = 1.5;
    float brightness = 0.1;

    vec2 animatedUV = vUv;

    vec3 color = texture2D(textures[0], animatedUV / 2.5).rgb * contrast;
    color = color + vec3(brightness, brightness, brightness);

    float edgeLeft = smoothstep(0.0, 0.7, vColor.r);
    float edgeRight = smoothstep(0.3, 1.0, vColor.r);
    float isEdge = max(1.0 - edgeLeft, edgeRight);

    float heightGradient = smoothstep(0.0, 1.0, vColor.g);

    float darknessAlpha = 0.08;
    float darkness = isEdge * darknessAlpha * heightGradient;
    color -= (darkness * 0.9);

    float alpha = 1.0;
    gl_FragColor = vec4(color, alpha);
}