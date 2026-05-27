import re

with open('src/components/PromoBanner.tsx', 'r') as f:
    content = f.read()

# Replace everything after Layer 1 with dynamic layers + fallback

search_content = """      {/* LAYER 2: OVERLAY IMAGE (FOTO PNG DEPAN) */}"""

replace_content = """      {/* RENDER CANVAS LAYERS IF EXIST */}
      {banner.canvasLayers && banner.canvasLayers.length > 0 ? (
        <div className="absolute inset-0 pointer-events-none">
          {banner.canvasLayers.filter(l => l.visible).sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)).map(layer => {
            const baseStyle = {
              position: 'absolute' as any,
              left: `${layer.x}%`,
              top: `${layer.y}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: layer.zIndex,
              opacity: (layer.opacity || 100) / 100,
              width: `${layer.width}%`,
            };

            if (layer.type === 'text') {
              const bgOp = layer.bgOpacity || 0;
              const bgColorHex = layer.bgColor || '#000000';
              const alphaHex = Math.round(bgOp * 2.55).toString(16).padStart(2, '0');
              
              const isButton = layer.role === 'button';
              const pointerEvents = isButton ? 'auto' : 'none';
              
              return (
                <div key={layer.id} style={{ ...baseStyle, pointerEvents }}>
                  <p 
                    onClick={(e) => {
                      if (isButton) {
                        e.stopPropagation();
                        if (banner.link) {
                          if (banner.link.startsWith('http')) window.open(banner.link, '_blank');
                          else window.location.href = banner.link;
                        } else if (onAction) onAction();
                      }
                    }}
                    className={cn(isButton && "cursor-pointer hover:scale-105 active:scale-95 transition-all")}
                    style={{
                      fontSize: `${(layer.fontSize || 32) / 8}cqw`, 
                      fontWeight: layer.fontWeight, 
                      fontStyle: layer.fontStyle,
                      textAlign: layer.textAlign, 
                      color: layer.color, 
                      letterSpacing: `${(layer.letterSpacing || 0) / 8}cqw`,
                      lineHeight: layer.lineHeight, 
                      fontFamily: layer.fontFamily,
                      textDecoration: layer.textDecoration, 
                      textTransform: layer.uppercase ? 'uppercase' : 'none',
                      padding: `${(layer.padding || 0) / 8}cqw`, 
                      borderRadius: `${(layer.borderRadius || 0) / 8}cqw`,
                      backgroundColor: bgOp > 0 ? `${bgColorHex}${alphaHex}` : 'transparent',
                      backdropFilter: layer.backdropBlur ? 'blur(8px)' : undefined,
                      textShadow: layer.shadow ? '0 0.5cqw 2cqw rgba(0,0,0,0.6)' : undefined,
                      border: (layer.borderWidth && layer.borderWidth > 0) ? `${(layer.borderWidth || 0) / 8}cqw ${layer.borderStyle || 'solid'} ${layer.borderColor}` : undefined,
                      margin: 0, 
                      whiteSpace: 'pre-wrap', 
                      wordBreak: 'break-word',
                      transform: `rotate(${layer.rotate || 0}deg)`,
                    }}>
                    {layer.content}
                  </p>
                </div>
              );
            }

            if (layer.type === 'image') {
              const filterStr = `brightness(${layer.brightness || 100}%) contrast(${layer.contrast || 100}%) saturate(${layer.saturate || 100}%) blur(${(layer.blur || 0) / 8}cqw) ${layer.grayscale ? 'grayscale(100%)' : ''} ${layer.sepia ? 'sepia(100%)' : ''}`;
              return (
                <div key={layer.id} style={{ ...baseStyle, pointerEvents: 'none' }}>
                  <img src={layer.src} alt="" 
                    style={{
                      width: '100%', height: 'auto', display: 'block',
                      transform: `rotate(${layer.rotate || 0}deg) scaleX(${layer.flipX ? -1 : 1}) scaleY(${layer.flipY ? -1 : 1})`,
                      filter: filterStr, 
                      mixBlendMode: layer.mixBlendMode as any,
                      borderRadius: `${(layer.borderRadius || 0) / 8}cqw`,
                      boxShadow: layer.shadow ? '0 1.5cqw 4cqw rgba(0,0,0,0.4)' : undefined,
                    }} />
                </div>
              );
            }
            return null;
          })}
        </div>
      ) : (
        <>
          {/* LAYER 2: OVERLAY IMAGE (FOTO PNG DEPAN) */}"""

idx = content.find(search_content)
if idx != -1:
    new_content = content[:idx] + replace_content + content[idx + len(search_content):]
    new_content = new_content.replace(
        """{(banner.description || onAction || banner.link || banner.buttonText) && (""",
        """{(banner.description || onAction || banner.link || banner.buttonText) && ("""
    ).replace("      {/* LAYER 3: TITLE BOX */}","      {/* LAYER 3: TITLE BOX */}") # no changes needed to fallback HTML structure
    
    # We must add an outer closing fragment for fallback
    idx2 = new_content.rfind("""    </div>""")
    new_content = new_content[:idx2] + """        </>\n      )}\n""" + new_content[idx2:]
    
    with open('src/components/PromoBanner.tsx', 'w') as f:
        f.write(new_content)
    print("PromoBanner.tsx patched")
else:
    print("Could not find anchor in PromoBanner.tsx")
