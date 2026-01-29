import { useState, useEffect } from 'react';
import { isInJuceWebView, addEventListener } from '../lib/juce-bridge';

export interface VisualizerData {
  rms: number;
  peak: number;
  wobblePhase: number;
  crackleActivity: number;
  mode: number;
  bypassed: boolean;
  degradation: number;
}

const defaultData: VisualizerData = {
  rms: 0,
  peak: 0,
  wobblePhase: 0,
  crackleActivity: 0,
  mode: 0,
  bypassed: false,
  degradation: 0
};

export function useVisualizerData(): VisualizerData {
  const [data, setData] = useState<VisualizerData>(defaultData);

  useEffect(() => {
    if (!isInJuceWebView()) {
      // Demo animation when not in JUCE
      let animationFrame: number;
      let time = 0;

      const animate = () => {
        time += 0.016;

        // Smooth demo animation
        const pulse = Math.sin(time * 2) * 0.5 + 0.5;
        const wobble = (time * 0.5) % 1;

        setData({
          rms: 0.3 + pulse * 0.3,
          peak: 0.5 + pulse * 0.4,
          wobblePhase: wobble,
          crackleActivity: Math.random() > 0.95 ? Math.random() : 0,
          mode: 0,
          bypassed: false,
          degradation: 50
        });

        animationFrame = requestAnimationFrame(animate);
      };

      animate();
      return () => cancelAnimationFrame(animationFrame);
    }

    // In JUCE, listen for visualizer data events
    const unsubscribe = addEventListener('visualizerData', (eventData: unknown) => {
      const d = eventData as Record<string, number | boolean>;
      if (d && typeof d === 'object') {
        setData({
          rms: (d.rms as number) ?? 0,
          peak: (d.peak as number) ?? 0,
          wobblePhase: (d.wobblePhase as number) ?? 0,
          crackleActivity: (d.crackleActivity as number) ?? 0,
          mode: (d.mode as number) ?? 0,
          bypassed: (d.bypassed as boolean) ?? false,
          degradation: (d.degradation as number) ?? 0
        });
      }
    });

    return unsubscribe;
  }, []);

  return data;
}
