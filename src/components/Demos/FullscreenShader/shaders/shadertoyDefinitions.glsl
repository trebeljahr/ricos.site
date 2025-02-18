uniform vec3      iResolution;  
uniform float     iTime;      
uniform float     iTimeDelta;  
uniform float     iFrameRate;   
uniform int       iFrame;   
uniform float     iChannelTime[4];
uniform vec3      iChannelResolution[4];
uniform vec4      iMouse;
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
uniform sampler2D iChannel2;
uniform sampler2D iChannel3;
uniform vec4      iDate;
uniform float     iSampleRate;

void mainImage( out vec4 c, in vec2 f );
void main( void )
{
    vec4 color = vec4(0.0,0.0,0.0,0.0);
    vec2 scaledUv = vec2(gl_FragCoord.x / iResolution.z, gl_FragCoord.y / iResolution.z); 
    mainImage( color, scaledUv);
    gl_FragColor = vec4(color);
}