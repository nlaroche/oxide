import { useRef, useEffect } from 'react';
import { useVisualizerData } from '../hooks/useVisualizerData';

interface OxideVisualizerProps {
  mode: number;
  degradation: number;
}

// Mode color palettes for the pixel scene
const modePalettes = [
  // Cassette - warm sunset city
  { sky: ['#1a0a1a', '#2d1b3d', '#4a2c5a', '#7a3d6a', '#ff6b35'], buildings: '#0a0808', windows: '#ff9f1c', accent: '#ff6b35' },
  // Vinyl - purple night
  { sky: ['#0a0a1a', '#1a1a3d', '#2a2a5a', '#4a3a7a', '#8b5cf6'], buildings: '#08080a', windows: '#a78bfa', accent: '#8b5cf6' },
  // VHS - cyan retro
  { sky: ['#0a1a1a', '#0a2a3a', '#0a4a5a', '#0a6a7a', '#06b6d4'], buildings: '#080a0a', windows: '#22d3ee', accent: '#06b6d4' },
  // Radio - green terminal
  { sky: ['#0a1a0a', '#0a2a1a', '#0a3a2a', '#1a5a3a', '#22c55e'], buildings: '#080a08', windows: '#4ade80', accent: '#22c55e' }
];

export function OxideVisualizer({ mode, degradation }: OxideVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visualizerData = useVisualizerData();
  const animationRef = useRef<number>();
  const timeRef = useRef(0);
  const pixelBuffer = useRef<ImageData | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const pixelSize = 4; // Size of each "pixel" for the lo-fi look
    const pxWidth = Math.floor(width / pixelSize);
    const pxHeight = Math.floor(height / pixelSize);

    // Create offscreen canvas for pixel rendering
    const offscreen = document.createElement('canvas');
    offscreen.width = pxWidth;
    offscreen.height = pxHeight;
    const offCtx = offscreen.getContext('2d')!;

    const palette = modePalettes[mode] || modePalettes[0];

    // Generate building silhouettes (static per mode)
    const buildings: { x: number; w: number; h: number; windows: { x: number; y: number; on: boolean }[] }[] = [];
    const buildingCount = 12;
    let bx = 0;
    for (let i = 0; i < buildingCount; i++) {
      const bw = 8 + Math.floor(Math.random() * 12);
      const bh = 20 + Math.floor(Math.random() * 35);
      const windows: { x: number; y: number; on: boolean }[] = [];

      // Add windows
      for (let wy = 3; wy < bh - 2; wy += 4) {
        for (let wx = 2; wx < bw - 2; wx += 3) {
          windows.push({ x: wx, y: wy, on: Math.random() > 0.3 });
        }
      }

      buildings.push({ x: bx, w: bw, h: bh, windows });
      bx += bw + Math.floor(Math.random() * 3);
    }

    // Stars (static)
    const stars: { x: number; y: number; brightness: number }[] = [];
    for (let i = 0; i < 30; i++) {
      stars.push({
        x: Math.floor(Math.random() * pxWidth),
        y: Math.floor(Math.random() * (pxHeight * 0.5)),
        brightness: 0.3 + Math.random() * 0.7
      });
    }

    const animate = () => {
      timeRef.current += 0.016;
      const t = timeRef.current;

      const rms = visualizerData.rms;
      const peak = visualizerData.peak;
      const wobblePhase = visualizerData.wobblePhase;
      const crackle = visualizerData.crackleActivity;
      const deg = degradation / 100;

      // Clear offscreen with sky gradient
      const skyGradient = offCtx.createLinearGradient(0, 0, 0, pxHeight);
      palette.sky.forEach((color, i) => {
        skyGradient.addColorStop(i / (palette.sky.length - 1), color);
      });
      offCtx.fillStyle = skyGradient;
      offCtx.fillRect(0, 0, pxWidth, pxHeight);

      // Draw stars (twinkling based on audio)
      stars.forEach(star => {
        const twinkle = Math.sin(t * 3 + star.x * 0.5) * 0.3 + 0.7;
        const audioPulse = 1 + rms * 0.5;
        const alpha = star.brightness * twinkle * audioPulse;
        offCtx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, alpha)})`;
        offCtx.fillRect(star.x, star.y, 1, 1);
      });

      // Moon/sun glow (pulses with audio)
      const moonX = pxWidth * 0.75;
      const moonY = pxHeight * 0.25;
      const moonGlow = 3 + rms * 2;
      offCtx.fillStyle = palette.accent + '30';
      offCtx.beginPath();
      offCtx.arc(moonX, moonY, moonGlow + 2, 0, Math.PI * 2);
      offCtx.fill();
      offCtx.fillStyle = palette.accent + '60';
      offCtx.beginPath();
      offCtx.arc(moonX, moonY, moonGlow, 0, Math.PI * 2);
      offCtx.fill();
      offCtx.fillStyle = '#ffffff';
      offCtx.beginPath();
      offCtx.arc(moonX, moonY, 2, 0, Math.PI * 2);
      offCtx.fill();

      // Draw buildings
      const groundY = pxHeight - 5;
      buildings.forEach(building => {
        // Building silhouette
        offCtx.fillStyle = palette.buildings;
        offCtx.fillRect(building.x, groundY - building.h, building.w, building.h);

        // Windows (some flicker with audio/degradation)
        building.windows.forEach(win => {
          let isOn = win.on;

          // Flicker effect based on degradation and audio
          if (deg > 0.3 && Math.random() < deg * 0.1) {
            isOn = !isOn;
          }
          if (peak > 0.8 && Math.random() < 0.1) {
            isOn = true; // Flash on beat
          }

          if (isOn) {
            const flicker = Math.sin(t * 10 + win.x + win.y) > 0.95 ? 0.5 : 1;
            offCtx.fillStyle = palette.windows + (flicker < 1 ? '80' : 'ff');
            offCtx.fillRect(building.x + win.x, groundY - building.h + win.y, 2, 2);
          }
        });
      });

      // Ground reflection line
      offCtx.fillStyle = palette.accent + '40';
      offCtx.fillRect(0, groundY, pxWidth, 1);

      // Audio waveform at bottom (like a reflection)
      offCtx.fillStyle = palette.accent + '20';
      for (let x = 0; x < pxWidth; x++) {
        const wave = Math.sin(x * 0.2 + t * 5) * rms * 3;
        const h = Math.abs(wave);
        offCtx.fillRect(x, groundY + 2, 1, Math.min(3, h));
      }

      // === Apply CRT post-processing ===

      // Scale up to main canvas with nearest-neighbor (pixelated look)
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(offscreen, 0, 0, width, height);

      // Wobble/distortion effect (horizontal displacement)
      if (deg > 0.1) {
        const wobbleAmount = deg * 10 * (1 + Math.sin(wobblePhase * Math.PI * 2) * 0.5);
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const tempData = new Uint8ClampedArray(data);

        for (let y = 0; y < height; y++) {
          const lineWobble = Math.sin(y * 0.1 + t * 20) * wobbleAmount;
          const offset = Math.floor(lineWobble);

          for (let x = 0; x < width; x++) {
            const srcX = Math.max(0, Math.min(width - 1, x + offset));
            const srcIdx = (y * width + srcX) * 4;
            const dstIdx = (y * width + x) * 4;

            data[dstIdx] = tempData[srcIdx];
            data[dstIdx + 1] = tempData[srcIdx + 1];
            data[dstIdx + 2] = tempData[srcIdx + 2];
            data[dstIdx + 3] = tempData[srcIdx + 3];
          }
        }
        ctx.putImageData(imageData, 0, 0);
      }

      // Chromatic aberration (RGB split)
      if (deg > 0.2) {
        const aberration = Math.floor(deg * 3);
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          const x = (i / 4) % width;
          const y = Math.floor((i / 4) / width);

          // Shift red channel left
          const redIdx = (y * width + Math.max(0, x - aberration)) * 4;
          // Shift blue channel right
          const blueIdx = (y * width + Math.min(width - 1, x + aberration)) * 4;

          if (redIdx >= 0 && redIdx < data.length) {
            data[i] = data[redIdx]; // Red from shifted position
          }
          if (blueIdx >= 0 && blueIdx < data.length) {
            data[i + 2] = data[blueIdx + 2]; // Blue from shifted position
          }
        }
        ctx.putImageData(imageData, 0, 0);
      }

      // Scanlines
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      for (let y = 0; y < height; y += 3) {
        ctx.fillRect(0, y, width, 1);
      }

      // CRT curvature vignette
      const vignette = ctx.createRadialGradient(
        width / 2, height / 2, height * 0.3,
        width / 2, height / 2, height * 0.8
      );
      vignette.addColorStop(0, 'transparent');
      vignette.addColorStop(0.7, 'rgba(0, 0, 0, 0.2)');
      vignette.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);

      // Phosphor glow overlay
      ctx.fillStyle = palette.accent + '08';
      ctx.fillRect(0, 0, width, height);

      // Static noise
      if (deg > 0.3) {
        const noiseIntensity = deg * 0.3;
        for (let i = 0; i < 100 * deg; i++) {
          const nx = Math.random() * width;
          const ny = Math.random() * height;
          const brightness = Math.random();
          ctx.fillStyle = `rgba(255, 255, 255, ${brightness * noiseIntensity})`;
          ctx.fillRect(nx, ny, pixelSize, pixelSize);
        }
      }

      // Dropout effect (horizontal black bars)
      if (deg > 0.5) {
        const dropoutChance = (deg - 0.5) * 0.05;
        if (Math.random() < dropoutChance) {
          const dropY = Math.random() * height;
          const dropH = 2 + Math.random() * 8;
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, dropY, width, dropH);
        }
      }

      // Crackle flash
      if (crackle > 0.1) {
        ctx.fillStyle = `rgba(255, 255, 255, ${crackle * 0.2})`;
        ctx.fillRect(0, 0, width, height);
      }

      // CRT screen edge glow
      ctx.strokeStyle = palette.accent + '20';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, width - 2, height - 2);

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [mode, degradation, visualizerData]);

  return (
    <div className="oxide-visualizer">
      <div className="crt-frame">
        <canvas
          ref={canvasRef}
          width={280}
          height={200}
        />
        <div className="crt-reflection" />
        <div className="crt-glare" />
      </div>

      <style>{`
        .oxide-visualizer {
          width: 300px;
          height: 240px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .crt-frame {
          position: relative;
          width: 280px;
          height: 200px;
          background: #0a0a0c;
          border-radius: 12px;
          padding: 8px;
          box-shadow:
            inset 0 0 30px rgba(0, 0, 0, 0.8),
            0 4px 20px rgba(0, 0, 0, 0.5),
            0 0 0 3px #1a1a1e,
            0 0 0 5px #0a0a0c;
          overflow: hidden;
        }

        .crt-frame canvas {
          width: 100%;
          height: 100%;
          border-radius: 8px;
          image-rendering: pixelated;
          image-rendering: crisp-edges;
        }

        .crt-reflection {
          position: absolute;
          top: 8px;
          left: 8px;
          right: 8px;
          height: 40%;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.03) 0%,
            transparent 100%
          );
          border-radius: 8px 8px 0 0;
          pointer-events: none;
        }

        .crt-glare {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 30px;
          height: 30px;
          background: radial-gradient(
            circle,
            rgba(255, 255, 255, 0.08) 0%,
            transparent 70%
          );
          pointer-events: none;
        }

        /* Subtle screen flicker animation */
        @keyframes crtFlicker {
          0%, 100% { opacity: 1; }
          92% { opacity: 1; }
          93% { opacity: 0.95; }
          94% { opacity: 1; }
        }

        .crt-frame canvas {
          animation: crtFlicker 4s infinite;
        }
      `}</style>
    </div>
  );
}
