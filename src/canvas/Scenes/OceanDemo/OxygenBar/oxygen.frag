float sdfCircle( vec2 p, float r )
{
    return length(p) - r;
}

void main() {
    float3 _objectScale = GetObjectScale();

    // leave some margin space
    float minScale = min(_objectScale.x, _objectScale.y);
    float margin = minScale * 0.1;

    // we 'elongate' instead of 'scaling' SDF to keep euclidean distance (so we can apply antialias easily)
    float3 _shapeElongation = (_objectScale - minScale) / 2;

    // Apply elongation operation to fragment position
    float3 p = (IN.positionOS) * _objectScale;
    float3 q = Elongate(p, _shapeElongation);

    // CONTAINER
    float halfSize = minScale / 2 - margin;

    #if _SHAPE_CIRCLE
    float healthBarSDF = sdfCircle(q, halfSize);
    #endif

    #if _SHAPE_BOX
    float healthBarSDF = BoxSDF(q, halfSize);
    #endif

    #if _SHAPE_RHOMBUS
    float healthBarSDF = RhombusSDF(q, float2(halfSize, halfSize));
    #endif

    float healthBarMask = GetSmoothMask(healthBarSDF);

    // LIQUID/FILLER
    // min(sin) term is used to decrease effect of wave near 0 and 1 healthNormalized.
    float waveOffset = _waveAmp * cos(_waveFreq * (IN.uv.x + _Time.y * _waveSpeed)) * min(1.3 * sin(PI * _healthNormalized), 1);
    float marginNormalizedY = margin / _objectScale.y;
    float borderNormalizedY = _borderWidth;
    float fillOffset = marginNormalizedY + borderNormalizedY;

    float healthMapped = lerp(fillOffset - 0.01, 1 - fillOffset, _healthNormalized);
    float fillSDF = IN.uv.y - healthMapped + waveOffset;
    float fillMask = GetSmoothMask(fillSDF);

    // BORDER 
    float borderSDF = healthBarSDF + _borderWidth * _objectScale.y;
    float borderMask = 1 - GetSmoothMask(borderSDF);

    // Get final color by combining masks
    float4 outColor = healthBarMask * (fillMask * (1 - borderMask) * _fillColor + (1 - fillMask) * (1 - borderMask) * _backgroundColor + borderMask * _borderColor);

    // Highlight center
    outColor *= float4(2 - healthBarSDF / (minScale / 2).xxx, 1);
}