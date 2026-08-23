import React, { useMemo } from 'react';
import { TopicConfig, GroupExperimentData, TrendlineResult } from '../types';
import { filterValidPoints } from '../utils/mathAnalysis';

interface ReportGraphViewProps {
  topic: TopicConfig;
  groupData: GroupExperimentData;
  trendResult: TrendlineResult;
}

interface AxisGridConfig {
  majorStep: number;
  minorStep: number;
  domainMax: number;
  majorTicks: number[];
  minorTicks: number[];
}

function calcAxisGrid(maxVal: number, targetMajorTicks = 5): AxisGridConfig {
  const safeMax = Math.max(1, maxVal);
  const rawStep = safeMax / targetMajorTicks;
  const power = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / power;

  let step: number;
  if (normalized <= 1.25) {
    step = 1 * power;
  } else if (normalized <= 2.8) {
    step = 2 * power;
  } else if (normalized <= 6.5) {
    step = 5 * power;
  } else {
    step = 10 * power;
  }

  const precision = step < 1 ? Math.min(4, Math.ceil(-Math.log10(step)) + 1) : 2;
  step = Number(step.toFixed(precision));

  const domainMax = Number((Math.ceil(safeMax / step) * step).toFixed(precision));
  const minorStep = Number((step / 5).toFixed(precision + 1));

  const majorTicks: number[] = [];
  for (let val = 0; val <= domainMax + step * 0.001; val += step) {
    majorTicks.push(Number(val.toFixed(precision)));
  }

  const minorTicks: number[] = [];
  for (let val = 0; val <= domainMax + minorStep * 0.001; val += minorStep) {
    const isMajor = majorTicks.some((mj) => Math.abs(mj - val) < minorStep * 0.1);
    if (!isMajor) {
      minorTicks.push(Number(val.toFixed(precision + 1)));
    }
  }

  return { majorStep: step, minorStep, domainMax, majorTicks, minorTicks };
}

export const ReportGraphView: React.FC<ReportGraphViewProps> = ({
  topic,
  groupData,
  trendResult
}) => {
  const validPoints = useMemo(() => filterValidPoints(groupData.points), [groupData.points]);
  const manualData = groupData.manualGraphData;

  // Student Plotted Points: Only true student plotted points, NEVER mock table points!
  const studentPoints = useMemo(() => {
    return manualData?.studentPoints && manualData.studentPoints.length > 0
      ? manualData.studentPoints
      : [];
  }, [manualData]);

  const hasPlotted = studentPoints.length > 0;
  const hasAdjustedRuler = Boolean(manualData?.hasAdjustedRuler);
  const hasFreehand = Boolean(manualData?.freehandPaths && manualData.freehandPaths.length > 0);
  const hasAnyDrawing = hasPlotted || hasAdjustedRuler || hasFreehand;

  // Dimensions for SVG canvas
  const svgWidth = 650;
  const svgHeight = 330;
  const margin = { top: 25, right: 35, bottom: 45, left: 60 };
  const plotWidth = svgWidth - margin.left - margin.right;
  const plotHeight = svgHeight - margin.top - margin.bottom;

  // Grid & bounds
  const xGrid = useMemo(() => {
    let maxX = 4;
    const allX = [
      ...validPoints.map((p) => p.x),
      ...studentPoints.map((p) => p.x)
    ];
    if (allX.length > 0) {
      maxX = Math.max(1, Math.max(...allX) * 1.18);
    }
    return calcAxisGrid(maxX, 5);
  }, [validPoints, studentPoints]);

  const yGrid = useMemo(() => {
    let maxY = 8;
    const allY = [
      ...validPoints.map((p) => p.y),
      ...studentPoints.map((p) => p.y)
    ];
    if (allY.length > 0) {
      maxY = Math.max(1, Math.max(...allY) * 1.18);
    }
    return calcAxisGrid(maxY, 5);
  }, [validPoints, studentPoints]);

  const bounds = useMemo(() => ({
    minX: 0,
    maxX: xGrid.domainMax,
    minY: 0,
    maxY: yGrid.domainMax
  }), [xGrid, yGrid]);

  const dataToScreen = React.useCallback((dx: number, dy: number) => {
    const sx = margin.left + ((dx - bounds.minX) / (bounds.maxX - bounds.minX)) * plotWidth;
    const sy = margin.top + (1 - (dy - bounds.minY) / (bounds.maxY - bounds.minY)) * plotHeight;
    return { x: sx, y: sy };
  }, [bounds, margin, plotWidth, plotHeight]);

  // Convert points array to smooth SVG path
  const getSmoothPathData = React.useCallback((pts: Array<{ x: number; y: number }>) => {
    if (pts.length < 2) return '';
    const sPts = pts.map((p) => dataToScreen(p.x, p.y));
    let d = `M ${sPts[0].x.toFixed(1)} ${sPts[0].y.toFixed(1)}`;
    if (sPts.length === 2) {
      d += ` L ${sPts[1].x.toFixed(1)} ${sPts[1].y.toFixed(1)}`;
      return d;
    }
    for (let i = 1; i < sPts.length - 1; i++) {
      const xc = (sPts[i].x + sPts[i + 1].x) / 2;
      const yc = (sPts[i].y + sPts[i + 1].y) / 2;
      d += ` Q ${sPts[i].x.toFixed(1)} ${sPts[i].y.toFixed(1)}, ${xc.toFixed(1)} ${yc.toFixed(1)}`;
    }
    d += ` L ${sPts[sPts.length - 1].x.toFixed(1)} ${sPts[sPts.length - 1].y.toFixed(1)}`;
    return d;
  }, [dataToScreen]);

  // 1. Student Straight Line (Line Mode)
  const studentLineCoords = useMemo(() => {
    if (!manualData?.studentLineEquation || !hasAdjustedRuler) {
      return null;
    }

    const { slope, intercept, eqString } = manualData.studentLineEquation;
    const sStart = dataToScreen(0, intercept);
    const sEnd = dataToScreen(bounds.maxX, slope * bounds.maxX + intercept);
    return { start: sStart, end: sEnd, eqString };
  }, [manualData, hasAdjustedRuler, bounds, dataToScreen]);

  // 2. Student Quadratic Parabola Curve
  const studentQuadraticPath = useMemo(() => {
    if (!manualData?.studentQuadraticCurve || manualData.toolMode !== 'quadratic' || !hasAdjustedRuler) return null;
    const { a, b, c } = manualData.studentQuadraticCurve;
    const steps = 60;
    const pathPts: Array<{ x: number; y: number }> = [];
    for (let i = 0; i <= steps; i++) {
      const dx = (bounds.maxX / steps) * i;
      const dy = a * dx * dx + b * dx + c;
      if (dy >= bounds.minY && dy <= bounds.maxY * 1.1) {
        pathPts.push({ x: dx, y: dy });
      }
    }
    return getSmoothPathData(pathPts);
  }, [manualData, hasAdjustedRuler, bounds, getSmoothPathData]);

  // Active student equation text
  const studentEquationText = useMemo(() => {
    if (!hasAdjustedRuler && !hasFreehand) {
      return '미작도 (작도 대기 중)';
    }
    if (manualData?.toolMode === 'freehand') {
      return '자유 곡선 펜 작도 완료';
    }
    if (manualData?.toolMode === 'quadratic' && manualData?.studentQuadraticCurve) {
      return manualData.studentQuadraticCurve.eqString;
    }
    if (manualData?.studentLineEquation) {
      return manualData.studentLineEquation.eqString;
    }
    return '미작도';
  }, [manualData, hasAdjustedRuler, hasFreehand]);

  return (
    <div className="w-full bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
      <div className="w-full overflow-hidden flex justify-center relative">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto max-w-[650px] select-none font-sans"
          style={{ fontFeatureSettings: '"tnum"' }}
        >
          {/* Background Plot Area (Graph Paper Tone) */}
          <rect
            x={margin.left}
            y={margin.top}
            width={plotWidth}
            height={plotHeight}
            fill="#fafcff"
            stroke="#e2e8f0"
            strokeWidth="1"
          />

          {/* Minor Grid Lines (밀리미터 모눈눈금) */}
          <g stroke="#f1f5f9" strokeWidth="0.75">
            {xGrid.minorTicks.map((val, idx) => {
              const pt = dataToScreen(val, 0);
              return (
                <line
                  key={`x-minor-${idx}`}
                  x1={pt.x}
                  y1={margin.top}
                  x2={pt.x}
                  y2={margin.top + plotHeight}
                />
              );
            })}
            {yGrid.minorTicks.map((val, idx) => {
              const pt = dataToScreen(0, val);
              return (
                <line
                  key={`y-minor-${idx}`}
                  x1={margin.left}
                  y1={pt.y}
                  x2={margin.left + plotWidth}
                  y2={pt.y}
                />
              );
            })}
          </g>

          {/* Major Grid Lines */}
          <g stroke="#e2e8f0" strokeWidth="1">
            {xGrid.majorTicks.map((val, idx) => {
              const pt = dataToScreen(val, 0);
              return (
                <line
                  key={`x-major-${idx}`}
                  x1={pt.x}
                  y1={margin.top}
                  x2={pt.x}
                  y2={margin.top + plotHeight}
                />
              );
            })}
            {yGrid.majorTicks.map((val, idx) => {
              const pt = dataToScreen(0, val);
              return (
                <line
                  key={`y-major-${idx}`}
                  x1={margin.left}
                  y1={pt.y}
                  x2={margin.left + plotWidth}
                  y2={pt.y}
                />
              );
            })}
          </g>

          {/* 1. Student Drawn Straight Line (Only if ruler adjusted) */}
          {hasAdjustedRuler && studentLineCoords && (manualData?.toolMode === 'line' || manualData?.toolMode === 'plot') && (
            <line
              x1={studentLineCoords.start.x}
              y1={studentLineCoords.start.y}
              x2={studentLineCoords.end.x}
              y2={studentLineCoords.end.y}
              stroke="#4f46e5"
              strokeWidth="2.75"
              strokeLinecap="round"
            />
          )}

          {/* 2. Student Drawn 3-Point Quadratic Curve */}
          {hasAdjustedRuler && manualData?.toolMode === 'quadratic' && studentQuadraticPath && (
            <path
              d={studentQuadraticPath}
              fill="none"
              stroke="#7e22ce"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* 3. Student Freehand Pencil Strokes */}
          {manualData?.freehandPaths && manualData.freehandPaths.map((stroke, sIdx) => {
            const pathD = getSmoothPathData(stroke);
            if (!pathD) return null;
            return (
              <path
                key={`report-freehand-${sIdx}`}
                d={pathD}
                fill="none"
                stroke="#059669"
                strokeWidth="2.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}

          {/* X Axis Ticks & Labels */}
          {xGrid.majorTicks.map((val, idx) => {
            const pt = dataToScreen(val, 0);
            return (
              <g key={`x-tick-${idx}`}>
                <line
                  x1={pt.x}
                  y1={margin.top + plotHeight}
                  x2={pt.x}
                  y2={margin.top + plotHeight + 5}
                  stroke="#64748b"
                  strokeWidth="1.5"
                />
                <text
                  x={pt.x}
                  y={margin.top + plotHeight + 18}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#475569"
                  fontWeight="500"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Y Axis Ticks & Labels */}
          {yGrid.majorTicks.map((val, idx) => {
            const pt = dataToScreen(0, val);
            return (
              <g key={`y-tick-${idx}`}>
                <line
                  x1={margin.left - 5}
                  y1={pt.y}
                  x2={margin.left}
                  y2={pt.y}
                  stroke="#64748b"
                  strokeWidth="1.5"
                />
                <text
                  x={margin.left - 8}
                  y={pt.y + 3.5}
                  textAnchor="end"
                  fontSize="10"
                  fill="#475569"
                  fontWeight="500"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Axes Lines */}
          <line
            x1={margin.left}
            y1={margin.top}
            x2={margin.left}
            y2={margin.top + plotHeight}
            stroke="#334155"
            strokeWidth="1.75"
          />
          <line
            x1={margin.left}
            y1={margin.top + plotHeight}
            x2={margin.left + plotWidth}
            y2={margin.top + plotHeight}
            stroke="#334155"
            strokeWidth="1.75"
          />

          {/* X Axis Title */}
          <text
            x={margin.left + plotWidth / 2}
            y={svgHeight - 10}
            textAnchor="middle"
            fontSize="11"
            fill="#0f172a"
            fontWeight="bold"
          >
            {topic.xVarName} {topic.xUnit ? `(${topic.xUnit})` : ''} →
          </text>

          {/* Y Axis Title */}
          <text
            x={-(margin.top + plotHeight / 2)}
            y={16}
            transform="rotate(-90)"
            textAnchor="middle"
            fontSize="11"
            fill="#0f172a"
            fontWeight="bold"
          >
            {topic.yVarName} {topic.yUnit ? `(${topic.yUnit})` : ''} →
          </text>

          {/* Student Plotted Data Points */}
          {studentPoints.map((pt, idx) => {
            const screen = dataToScreen(Number(pt.x), Number(pt.y));
            return (
              <g key={pt.id || `sp_${idx}`}>
                {/* Outer Glow Halo */}
                <circle
                  cx={screen.x}
                  cy={screen.y}
                  r="6.5"
                  fill="#ffffff"
                  stroke="#2563eb"
                  strokeWidth="2"
                />
                {/* Center Core */}
                <circle
                  cx={screen.x}
                  cy={screen.y}
                  r="3.5"
                  fill="#2563eb"
                />
                {/* Coordinate Label */}
                <text
                  x={screen.x + 7}
                  y={screen.y - 5}
                  fontSize="9.5"
                  fill="#1e293b"
                  fontWeight="bold"
                  stroke="#ffffff"
                  strokeWidth="2"
                  paintOrder="stroke"
                >
                  #{idx + 1} ({pt.x}, {pt.y})
                </text>
              </g>
            );
          })}

          {/* Unplotted Warning Overlay if no points are plotted */}
          {!hasPlotted && (
            <g transform={`translate(${margin.left + plotWidth / 2}, ${margin.top + plotHeight / 2})`}>
              <rect
                x="-140"
                y="-20"
                width="280"
                height="40"
                rx="8"
                fill="#f8fafc"
                fillOpacity="0.95"
                stroke="#cbd5e1"
                strokeWidth="1.5"
              />
              <text
                x="0"
                y="5"
                textAnchor="middle"
                fontSize="11"
                fill="#64748b"
                fontWeight="600"
              >
                모눈종이에 아직 점이 작도되지 않았습니다
              </text>
            </g>
          )}

          {/* Graph Legend (Top Right inside canvas) */}
          <g transform={`translate(${margin.left + plotWidth - 190}, ${margin.top + 8})`}>
            <rect
              x="0"
              y="0"
              width="180"
              height="50"
              rx="6"
              fill="#ffffff"
              fillOpacity="0.94"
              stroke="#cbd5e1"
              strokeWidth="1"
            />
            {/* Student Plotted points legend */}
            <circle cx="14" cy="15" r="4" fill={hasPlotted ? '#2563eb' : '#94a3b8'} stroke="#ffffff" strokeWidth="1.5" />
            <text x="26" y="18" fontSize="9.5" fill="#334155" fontWeight="600">
              학생 작도 점 ({studentPoints.length}개)
            </text>

            {/* Student line/curve legend */}
            <line
              x1="8"
              y1="34"
              x2="20"
              y2="34"
              stroke={
                !hasAdjustedRuler && !hasFreehand
                  ? '#94a3b8'
                  : manualData?.toolMode === 'freehand'
                  ? '#059669'
                  : manualData?.toolMode === 'quadratic'
                  ? '#7e22ce'
                  : '#4f46e5'
              }
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <text
              x="26"
              y="37"
              fontSize="9.5"
              fill={
                !hasAdjustedRuler && !hasFreehand
                  ? '#64748b'
                  : manualData?.toolMode === 'freehand'
                  ? '#065f46'
                  : manualData?.toolMode === 'quadratic'
                  ? '#581c87'
                  : '#4338ca'
              }
              fontWeight="bold"
            >
              학생 작도식: {studentEquationText}
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
};
