varying vec2 vUv;
varying vec2 cloudUV;
varying vec3 vColor;
uniform float iTime;
uniform vec3 foxPosition;

void main() {
    vUv = uv;
    cloudUV = uv;
    cloudUV.x += iTime / 300.0;
    cloudUV.y += iTime / 200.0;
    vColor = color;
    vec3 cpos = position;

    float waveSize = 5.0;
    float tipDistance = 0.2;
    float centerDistance = 0.05;
    float waveFrequency = 1500.0;

    float foxRadius = 0.5;

    float foxStrength = 0.2;

    vec3 toFox = foxPosition - position;
    float distanceToFox = length(toFox);

    if(distanceToFox < foxRadius) {
        float pushStrength = (1.0 - distanceToFox / foxRadius) * foxStrength;

        pushStrength *= smoothstep(0.0, 1.0, vColor.g);

        vec3 pushDir = normalize(vec3(toFox.x, 0.0, toFox.z));
        cpos.xz -= pushDir.xz * pushStrength;
    } else if(color.x > 0.6) {
        cpos.x += sin((iTime / waveFrequency) + (uv.x * waveSize)) * tipDistance;
    } else if(color.x > 0.0) {
        cpos.x += sin((iTime / waveFrequency) + (uv.x * waveSize)) * centerDistance;
    }

    gl_Position = projectionMatrix * modelViewMatrix * vec4(cpos, 1.0);
}