import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';

// --- 1. Dither Shader Material ---
const DitherMaterial = shaderMaterial(
  {
    uLightDir: new THREE.Vector3(0.5, 0.8, 0.5).normalize(),
    uColor: new THREE.Color('#ffffff'), // White dots
    uBgColor: new THREE.Color('#0a0a0a'), // Dark background
  },
  // Vertex Shader
  `
    varying vec3 vNormal;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment Shader
  `
    uniform vec3 uLightDir;
    uniform vec3 uColor;
    uniform vec3 uBgColor;
    varying vec3 vNormal;

    float bayer4x4(vec2 uv) {
        int x = int(mod(uv.x, 4.0));
        int y = int(mod(uv.y, 4.0));
        int index = y * 4 + x;
        if (index == 0) return 0.0/16.0;
        if (index == 1) return 8.0/16.0;
        if (index == 2) return 2.0/16.0;
        if (index == 3) return 10.0/16.0;
        if (index == 4) return 12.0/16.0;
        if (index == 5) return 4.0/16.0;
        if (index == 6) return 14.0/16.0;
        if (index == 7) return 6.0/16.0;
        if (index == 8) return 3.0/16.0;
        if (index == 9) return 11.0/16.0;
        if (index == 10) return 1.0/16.0;
        if (index == 11) return 9.0/16.0;
        if (index == 12) return 15.0/16.0;
        if (index == 13) return 7.0/16.0;
        if (index == 14) return 13.0/16.0;
        if (index == 15) return 5.0/16.0;
        return 0.0;
    }

    void main() {
      vec3 normal = normalize(vNormal);
      float light = dot(normal, uLightDir);
      light = light * 0.5 + 0.5; 
      light = pow(light, 1.2);   
      
      vec2 xy = gl_FragCoord.xy;
      float threshold = bayer4x4(xy);
      
      if (light < threshold) {
        gl_FragColor = vec4(uColor, 1.0);
      } else {
        gl_FragColor = vec4(uBgColor, 1.0);
      }
    }
  `
);

extend({ DitherMaterial });

// --- 2. Book Stack Structure ---
function BookStack({ color, bgColor }) {
  const group = useRef();
  const books = useMemo(() => {
    const temp = [];
    const count = 12;
    let currentHeight = -2.5;
    
    for(let i=0; i<count; i++) {
        const thickness = 0.3 + Math.random() * 0.4;
        const width = 3.5 + Math.random() * 1.5;
        const depth = 5 + Math.random() * 1.5;
        
        // Randomize position slightly for "messy stack" look
        const offsetX = (Math.random() - 0.5) * 1.0;
        const offsetZ = (Math.random() - 0.5) * 1.0;
        
        // Randomize rotation
        const rotY = (Math.random() - 0.5) * Math.PI * 0.6;

        temp.push({
            position: [offsetX, currentHeight + thickness / 2, offsetZ],
            rotation: [0, rotY, 0],
            scale: [width, thickness, depth]
        });
        currentHeight += thickness;
    }
    return temp;
  }, []);

  useFrame(() => {
    if (group.current) {
        // Continuous clockwise rotation
        group.current.rotation.y = -(Date.now() * 0.0002);
    }
  });

  return (
    <group ref={group}>
        {books.map((b, i) => (
            <mesh key={i} position={b.position} rotation={b.rotation}>
                <boxGeometry args={b.scale} />
                <ditherMaterial uColor={new THREE.Color(color)} uBgColor={new THREE.Color(bgColor)} />
            </mesh>
        ))}
    </group>
  );
}

// --- 3. Main Component ---
export default function DitherHero({ color = '#ffffff', backgroundColor = '#0a0a0a', position = [0, 0, 0] }) {
  return (
    <div style={{ width: '100%', height: '100%', backgroundColor }}>
      <Canvas orthographic camera={{ zoom: 35, position: [20, 20, 20] }}>
        <group position={position}>
            <BookStack color={color} bgColor={backgroundColor} />
        </group>
      </Canvas>
    </div>
  );
}
