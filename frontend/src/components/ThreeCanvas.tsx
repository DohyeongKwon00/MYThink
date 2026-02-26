"use client";

import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Line, Text } from "@react-three/drei";
import type { VizData } from "@/types";

interface Props {
  vizData: VizData | null;
}

function safeEval(expression: string, x: number): number | null {
  try {
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
    const steps = 300;
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= steps; i++) {
      const x = xMin + (i / steps) * (xMax - xMin);
      const y = safeEval(vizData.expression, x);
      if (y !== null) pts.push([x, y, 0]);
    }
    return pts;
  }, [vizData]);

  if (points.length < 2) return null;
  const maxY = points.reduce((max, p) => Math.max(max, p[1]), -Infinity);

  return (
    <>
      <Line points={points} color="#818cf8" lineWidth={2} />
      <Text
        position={[0, maxY + 0.5, 0]}
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
  for (let i = -6; i <= 6; i++) {
    lines.push([[-7, i, 0], [7, i, 0]]);
    lines.push([[i, -6, 0], [i, 6, 0]]);
  }
  return (
    <>
      {lines.map((pts, idx) => (
        <Line key={idx} points={pts} color="#1f2937" lineWidth={0.5} />
      ))}
      <Line points={[[-7, 0, 0], [7, 0, 0]]} color="#4b5563" lineWidth={1.5} />
      <Line points={[[0, -6, 0], [0, 6, 0]]} color="#4b5563" lineWidth={1.5} />
    </>
  );
}

function VisualizationContent({ vizData }: { vizData: VizData | null }) {
  if (vizData) {
    return (
      <Canvas
        camera={{ position: [0, 0, 12], fov: 45 }}
        style={{ background: "#030712" }}
      >
        <GridLines />
        <FunctionGraph vizData={vizData} />
        <OrbitControls
          enableRotate={false}
          enablePan
          enableZoom
          screenSpacePanning
          mouseButtons={{ LEFT: 2, MIDDLE: 1, RIGHT: 2 } as never}
        />
      </Canvas>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 px-4 text-center">
      <span className="text-3xl">📈</span>
      <p className="text-gray-500 text-sm">
        Function graphs will appear here
      </p>
    </div>
  );
}

export default function ThreeCanvas({ vizData }: Props) {
  const [expanded, setExpanded] = useState(false);
  const hasContent = vizData !== null;
  const title = vizData ? "Graph" : "Visualization";

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  return (
    <>
      {/* Compact panel */}
      <div className="w-full h-full bg-gray-950 flex flex-col">
        <div className="px-4 py-2 border-b border-gray-800 shrink-0 flex items-center justify-between">
          <h2 className="font-semibold text-gray-200 text-sm">{title}</h2>
          {hasContent && (
            <button
              onClick={() => setExpanded(true)}
              className="text-xs text-gray-400 hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-800 transition"
              title="Expand (Esc to close)"
            >
              ⤢ Expand
            </button>
          )}
        </div>
        <div className="flex-1 min-h-0">
          {expanded ? (
            <div className="flex items-center justify-center h-full text-gray-600 text-xs">
              Viewing in expanded mode — press Esc or{" "}
              <button
                onClick={() => setExpanded(false)}
                className="ml-1 text-indigo-400 hover:text-indigo-300 underline"
              >
                close
              </button>
            </div>
          ) : (
            <VisualizationContent vizData={vizData} />
          )}
        </div>
      </div>

      {/* Expanded fullscreen overlay */}
      {expanded && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6">
          <div className="w-full h-full max-w-6xl max-h-[92vh] rounded-2xl overflow-hidden border border-gray-700 bg-gray-950 flex flex-col">
            <div className="px-4 py-2 border-b border-gray-800 shrink-0 flex items-center justify-between">
              <h2 className="font-semibold text-gray-200 text-sm">{title}</h2>
              <button
                onClick={() => setExpanded(false)}
                className="text-xs text-gray-400 hover:text-gray-200 px-3 py-1 rounded hover:bg-gray-800 transition"
              >
                ✕ Close (Esc)
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <VisualizationContent vizData={vizData} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
