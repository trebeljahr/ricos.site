// vertex.glsl
attribute vec3 aPosition;
attribute vec2 aTexCoord;

uniform mat4 uModelViewProjection;

varying vec2 vUv;

void main() {
    vUv = aTexCoord;
    gl_Position = uModelViewProjection * vec4(aPosition, 1.0);
}
