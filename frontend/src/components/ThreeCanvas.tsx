"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Line, Text } from "@react-three/drei";
import type { VizData } from "@/types";

interface Props {
  vizData: VizData | null;
}

function safeEval(expression: string, x: number): number | null {
  try {
    // Replace Python-style ** with JS **
    const expr = expression.replace(/\*\*/g, "**");
    // eslint-disable-next-line no-new-func
    const fn = new Function("x", `"use strict"; return (${expr});`);
    const result = fn(x);
    return typeof result === "number" && isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

function FunctionGraph({ vizData }: { vizData: VizData }) {
  const points = useMemo(() => {
    const [xMin, xMax] = vizData.xRange;
    const steps = 200;
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= steps; i++) {
      const x = xMin + (i / steps) * (xMax - xMin);
      const y = safeEval(vizData.expression, x);
      if (y !== null) pts.push([x, y, 0]);
    }
    return pts;
  }, [vizData]);

  if (points.length < 2) return null;

  return (
    <>
      <Line points={points} color="#818cf8" lineWidth={2} />
      <Text
        position={[0, points.reduce((max, p) => Math.max(max, p[1]), -Infinity) + 0.5, 0]}
        fontSize={0.3}
        color="#a5b4fc"
        anchorX="center"
      >
        {vizData.label}
      </Text>
    </>
  );
}

function GridLines() {
  const lines: [number, number, number][][] = [];
  for (let i = -5; i <= 5; i++) {
    lines.push([[-5, i, 0], [5, i, 0]]);
    lines.push([[i, -5, 0], [i, 5, 0]]);
  }
  return (
    <>
      {lines.map((pts, idx) => (
        <Line key={idx} points={pts} color="#1f2937" lineWidth={0.5} />
      ))}
      <Line points={[[-5, 0, 0], [5, 0, 0]]} color="#374151" lineWidth={1.5} />
      <Line points={[[0, -5, 0], [0, 5, 0]]} color="#374151" lineWidth={1.5} />
    </>
  );
}

export default function ThreeCanvas({ vizData }: Props) {
  return (
    <div className="w-full h-full bg-gray-950 flex flex-col">
      <div className="px-4 py-2 border-b border-gray-800 shrink-0">
        <h2 className="font-semibold text-gray-200 text-sm">3D Visualization</h2>
      </div>
      <div className="flex-1">
        {vizData ? (
          <Canvas
            camera={{ position: [0, 0, 10], fov: 50 }}
            style={{ background: "#030712" }}
          >
            <ambientLight intensity={0.5} />
            <GridLines />
            <FunctionGraph vizData={vizData} />
            <OrbitControls enablePan enableZoom enableRotate />
          </Canvas>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-600 text-sm">
            Graph will appear when the tutor references a function
          </div>
        )}
      </div>
    </div>
  );
}
