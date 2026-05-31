"use client";

import { useEffect, useRef, useCallback } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  phase: number;
}

const NEURAL_COLOR = "6, 182, 212";
const DREAM_COLOR = "129, 140, 248";
const CONNECTION_DISTANCE = 120;

function createParticle(width: number, height: number): Particle {
  const isNeural = Math.random() > 0.4;
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
    radius: 1.5 + Math.random() * 1.5,
    color: isNeural ? NEURAL_COLOR : DREAM_COLOR,
    phase: Math.random() * Math.PI * 2,
  };
}

export function NeuralCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const timeRef = useRef(0);
  const reducedMotionRef = useRef(false);

  const getParticleCount = useCallback(() => {
    if (typeof window === "undefined") return 80;
    return window.innerWidth < 768 ? 80 : 150;
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = mq.matches;
    const handler = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;

      const count = window.innerWidth < 768 ? 80 : 150;
      while (particlesRef.current.length < count) {
        particlesRef.current.push(createParticle(width, height));
      }
      while (particlesRef.current.length > count) {
        particlesRef.current.pop();
      }
    };

    resize();
    const count = getParticleCount();
    particlesRef.current = Array.from({ length: count }, () =>
      createParticle(width, height)
    );

    let paused = false;
    const handleVisibility = () => {
      paused = document.hidden;
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("resize", resize);

    const draw = () => {
      if (paused) {
        animFrameRef.current = requestAnimationFrame(draw);
        return;
      }

      timeRef.current += 0.01;
      ctx.clearRect(0, 0, width, height);

      const particles = particlesRef.current;
      const isReduced = reducedMotionRef.current;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (!isReduced) {
          const drift = Math.sin(timeRef.current + p.phase) * 0.15;
          const orbital = Math.cos(timeRef.current * 0.5 + p.phase * 2) * 0.1;
          p.x += p.vx + drift;
          p.y += p.vy + orbital;

          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = height;
          if (p.y > height) p.y = 0;
        }

        const opacity = p.color === NEURAL_COLOR ? 0.12 : 0.08;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color}, ${opacity})`;
        ctx.fill();
      }

      if (!isReduced) {
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = dx * dx + dy * dy;
            if (dist < CONNECTION_DISTANCE * CONNECTION_DISTANCE) {
              const alpha = 0.06 * (1 - Math.sqrt(dist) / CONNECTION_DISTANCE);
              ctx.beginPath();
              ctx.moveTo(particles[i].x, particles[i].y);
              ctx.lineTo(particles[j].x, particles[j].y);
              ctx.strokeStyle = `rgba(${NEURAL_COLOR}, ${alpha})`;
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("resize", resize);
    };
  }, [getParticleCount]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      aria-hidden="true"
    />
  );
}
