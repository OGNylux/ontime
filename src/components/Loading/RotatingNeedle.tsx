import { useEffect, useRef } from "react";

interface AnimatedNeedleProps {
  d: string;
  centerX: number;
  centerY: number;
}

export function AnimatedNeedle({ d, centerX, centerY }: AnimatedNeedleProps) {
  const pathRef = useRef<SVGPathElement>(null);

  // Animation timing variables (in milliseconds)
  const ROTATION_DURATION = 1200; // How long the needle takes to rotate 360 degrees
  const SHAKE_DURATION = 1000; // How long the shake effect lasts (2 shakes)
  const SHAKE_INTENSITY = 3; // How many degrees the shake rotates

  useEffect(() => {
    let animationFrame: number;
    let startTime: number | null = null;
    const totalCycle = ROTATION_DURATION + SHAKE_DURATION;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const cycleProgress = elapsed % totalCycle;

      let rotation = 0;
      let shakeOffset = 0;

      if (cycleProgress < ROTATION_DURATION) {
        // During rotation - only rotate, no shake
        const rotationProgress = cycleProgress / ROTATION_DURATION;
        rotation = Math.floor(elapsed / totalCycle) * 360 + rotationProgress * 360;
      } else {
        // After rotation completes - hold position and shake
        rotation = Math.floor(elapsed / totalCycle + 1) * 360;
        const shakeProgress = cycleProgress - ROTATION_DURATION;
        const shakePhase = (shakeProgress / SHAKE_DURATION) * Math.PI * 4; // 2 complete shakes
        shakeOffset = Math.sin(shakePhase) * SHAKE_INTENSITY * (1 - shakeProgress / SHAKE_DURATION); // Decay over time
      }

      if (pathRef.current) {
        pathRef.current.setAttribute(
          "transform",
          `rotate(${rotation + shakeOffset} ${centerX} ${centerY})`
        );
      }

      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [centerX, centerY, ROTATION_DURATION, SHAKE_DURATION, SHAKE_INTENSITY]);

  return (
    <path
      ref={pathRef}
      clipRule="evenodd"
      d={d}
      fill="white"
      fillRule="evenodd"
      id="Clock needle"
    />
  );
}