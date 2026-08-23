import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  PenTool,
  RotateCcw,
  Eye,
  EyeOff,
  CheckCircle2,
  Sparkles,
  Sliders,
  Trash2,
  Award,
  Spline,
  Eraser,
  Compass
} from 'lucide-react';
import { DataPoint, TopicConfig, ManualPlotPoint, StudentManualGraphData } from '../types';
import { filterValidPoints, computeTrendline } from '../utils/mathAnalysis';

interface ManualGraphCanvasProps {
  topic: TopicConfig;
  groupName: string;
  points: DataPoint[];
  manualGraphData?: StudentManualGraphData;
  onChangeManualGraphData?: (data: StudentManualGraphData) => void;
  allowAutoAnalysis?: boolean;
  onSwitchToAuto?: () => void;
}

type DrawTool = 'plot' | 'line' | 'quadratic' | 'freehand';

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
    // Exclude major ticks from minor ticks array to avoid double rendering
    const isMajor = majorTicks.some((mj) => Math.abs(mj - val) < minorStep * 0.1);
    if (!isMajor) {
      minorTicks.push(Number(val.toFixed(precision + 1)));
    }
  }

  return { majorStep: step, minorStep, domainMax, majorTicks, minorTicks };
}

export const ManualGraphCanvas: React.FC<ManualGraphCanvasProps> = ({
  topic,
  groupName,
  points,
  manualGraphData,
  onChangeManualGraphData,
  allowAutoAnalysis = true,
  onSwitchToAuto
}) => {
  const validPoints = useMemo(() => filterValidPoints(points), [points]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 380 });

  // Determine if this topic is inherently curved (e.g. quadratic or inverse)
  const isCurvedTopic = topic.defaultTrendline === 'quadratic' || topic.defaultTrendline === 'inverse';

  // Tool Mode: 'plot' (1. 점 찍기), 'line' (직선 자), 'quadratic' (3점 곡선 자), 'freehand' (자유 곡선 펜)
  const [toolMode, setToolMode] = useState<DrawTool>(() => manualGraphData?.toolMode || 'plot');

  // Student plotted points (Step 1)
  const [studentPoints, setStudentPoints] = useState<ManualPlotPoint[]>(() => manualGraphData?.studentPoints || []);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);

  // Student Straight Line Control Points (in Data Coordinates)
  const [lineOriginFixed, setLineOriginFixed] = useState(
    () => manualGraphData?.lineOriginFixed ?? (topic.defaultTrendline === 'proportional')
  );
  const [linePoint1, setLinePoint1] = useState<{ x: number; y: number }>(
    () => manualGraphData?.linePoint1 || { x: 0, y: 0 }
  );
  const [linePoint2, setLinePoint2] = useState<{ x: number; y: number }>(
    () => manualGraphData?.linePoint2 || { x: 3, y: 5 }
  );

  // Student Quadratic / 3-Point Curve Controls
  const [curveP1, setCurveP1] = useState<{ x: number; y: number }>(
    () => manualGraphData?.curveP1 || { x: 0, y: 0 }
  );
  const [curveP2, setCurveP2] = useState<{ x: number; y: number }>(
    () => manualGraphData?.curveP2 || { x: 2, y: 4 }
  );
  const [curveP3, setCurveP3] = useState<{ x: number; y: number }>(
    () => manualGraphData?.curveP3 || { x: 4, y: 0 }
  );

  // Student Freehand Drawing Path (Screen Coordinate points)
  const [freehandPaths, setFreehandPaths] = useState<Array<Array<{ x: number; y: number }>>>(
    () => manualGraphData?.freehandPaths || []
  );
  const [isFreehandDrawing, setIsFreehandDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Array<{ x: number; y: number }>>([]);

  // Track if student actually adjusted the ruler / line
  const [hasAdjustedRuler, setHasAdjustedRuler] = useState(
    () => manualGraphData?.hasAdjustedRuler ?? false
  );

  // Sync external manualGraphData updates (e.g. when group changes)
  useEffect(() => {
    if (manualGraphData) {
      if (manualGraphData.studentPoints) setStudentPoints(manualGraphData.studentPoints);
      if (manualGraphData.toolMode) setToolMode(manualGraphData.toolMode);
      if (typeof manualGraphData.lineOriginFixed === 'boolean') setLineOriginFixed(manualGraphData.lineOriginFixed);
      if (manualGraphData.linePoint1) setLinePoint1(manualGraphData.linePoint1);
      if (manualGraphData.linePoint2) setLinePoint2(manualGraphData.linePoint2);
      if (manualGraphData.curveP1) setCurveP1(manualGraphData.curveP1);
      if (manualGraphData.curveP2) setCurveP2(manualGraphData.curveP2);
      if (manualGraphData.curveP3) setCurveP3(manualGraphData.curveP3);
      if (manualGraphData.freehandPaths) setFreehandPaths(manualGraphData.freehandPaths);
      if (typeof manualGraphData.hasAdjustedRuler === 'boolean') setHasAdjustedRuler(manualGraphData.hasAdjustedRuler);
    }
  }, [groupName, topic.topicId]);

  // Toggles for hints & auto comparison
  const [showTargetHint, setShowTargetHint] = useState(false);
  const [showAutoTrendHint, setShowAutoTrendHint] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(true);

  // Dragging state for handles
  const [draggingTarget, setDraggingTarget] = useState<
    | { type: 'point'; id: string }
    | { type: 'lineP1' }
    | { type: 'lineP2' }
    | { type: 'curveP1' }
    | { type: 'curveP2' }
    | { type: 'curveP3' }
    | null
  >(null);

  // Hover coordinate preview
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);
  const [flashNotice, setFlashNotice] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setFlashNotice(msg);
    setTimeout(() => {
      setFlashNotice((prev) => (prev === msg ? null : prev));
    }, 2000);
  };

  // Measure container dimensions with ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width } = entry.contentRect;
        const newW = Math.max(320, width);
        const newH = Math.max(340, Math.min(460, newW * 0.58));
        setDimensions({ width: newW, height: newH });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Compute precise mathematical axis grids for X and Y
  const xGrid = useMemo(() => {
    let maxX = 4;
    if (validPoints.length > 0) {
      const xVals = validPoints.map((p) => p.x);
      maxX = Math.max(1, Math.max(...xVals) * 1.2);
    }
    return calcAxisGrid(maxX, 5);
  }, [validPoints]);

  const yGrid = useMemo(() => {
    let maxY = 8;
    if (validPoints.length > 0) {
      const yVals = validPoints.map((p) => p.y);
      maxY = Math.max(1, Math.max(...yVals) * 1.2);
    }
    return calcAxisGrid(maxY, 5);
  }, [validPoints]);

  // Compute coordinate space bounds (Min/Max) matching exact grid steps
  const bounds = useMemo(() => {
    return {
      minX: 0,
      maxX: xGrid.domainMax,
      minY: 0,
      maxY: yGrid.domainMax
    };
  }, [xGrid, yGrid]);

  // Margins for axes
  const margin = { top: 25, right: 30, bottom: 45, left: 55 };
  const plotWidth = Math.max(100, dimensions.width - margin.left - margin.right);
  const plotHeight = Math.max(100, dimensions.height - margin.top - margin.bottom);

  // Coordinate Conversion Helpers
  const dataToScreen = useCallback(
    (dx: number, dy: number) => {
      const sx = margin.left + ((dx - bounds.minX) / (bounds.maxX - bounds.minX)) * plotWidth;
      const sy = margin.top + (1 - (dy - bounds.minY) / (bounds.maxY - bounds.minY)) * plotHeight;
      return { x: sx, y: sy };
    },
    [bounds, margin, plotWidth, plotHeight]
  );

  const screenToData = useCallback(
    (sx: number, sy: number, ignoreSnap = false) => {
      const clampedSx = Math.max(margin.left, Math.min(margin.left + plotWidth, sx));
      const clampedSy = Math.max(margin.top, Math.min(margin.top + plotHeight, sy));

      let dx = bounds.minX + ((clampedSx - margin.left) / plotWidth) * (bounds.maxX - bounds.minX);
      let dy = bounds.minY + (1 - (clampedSy - margin.top) / plotHeight) * (bounds.maxY - bounds.minY);

      if (snapToGrid && !ignoreSnap) {
        const xStep = xGrid.minorStep;
        const yStep = yGrid.minorStep;
        dx = Math.round(dx / xStep) * xStep;
        dy = Math.round(dy / yStep) * yStep;
        return {
          x: Number(dx.toFixed(2)),
          y: Number(dy.toFixed(2))
        };
      }
      return {
        x: Number(dx.toFixed(4)),
        y: Number(dy.toFixed(4))
      };
    },
    [bounds, margin, plotWidth, plotHeight, snapToGrid, xGrid.minorStep, yGrid.minorStep]
  );

  // Initialize Line & Curve Points on bounds change or topic change
  useEffect(() => {
    setLinePoint1({ x: 0, y: 0 });
    setLinePoint2({ x: bounds.maxX * 0.75, y: bounds.maxY * 0.75 });

    // Initialize 3 curve points
    setCurveP1({ x: bounds.maxX * 0.1, y: bounds.maxY * 0.15 });
    setCurveP2({ x: bounds.maxX * 0.5, y: bounds.maxY * 0.8 });
    setCurveP3({ x: bounds.maxX * 0.9, y: bounds.maxY * 0.15 });
  }, [bounds]);

  // Compute student straight line equation
  const studentLineEquation = useMemo(() => {
    const p1 = lineOriginFixed ? { x: 0, y: 0 } : linePoint1;
    const p2 = linePoint2;
    const dx = p2.x - p1.x;
    if (Math.abs(dx) < 0.0001) return { slope: 0, intercept: p1.y, eqString: `x = ${p1.x.toFixed(2)}` };

    const slope = (p2.y - p1.y) / dx;
    const intercept = p1.y - slope * p1.x;

    let eqString = '';
    if (lineOriginFixed || Math.abs(intercept) < 0.01) {
      eqString = `y = ${slope.toFixed(3)}x`;
    } else {
      const sign = intercept >= 0 ? '+' : '-';
      eqString = `y = ${slope.toFixed(3)}x ${sign} ${Math.abs(intercept).toFixed(2)}`;
    }

    return { slope, intercept, eqString };
  }, [lineOriginFixed, linePoint1, linePoint2]);

  // Compute 3-point Quadratic Parabola: y = a*x^2 + b*x + c
  const studentQuadraticCurve = useMemo(() => {
    const { x: x1, y: y1 } = curveP1;
    const { x: x2, y: y2 } = curveP2;
    const { x: x3, y: y3 } = curveP3;

    const denom = (x1 - x2) * (x1 - x3) * (x2 - x3);
    if (Math.abs(denom) < 0.0001) {
      return { a: 0, b: 0, c: 0, eqString: '일직선 배치' };
    }

    const a = (x3 * (y2 - y1) + x2 * (y1 - y3) + x1 * (y3 - y2)) / denom;
    const b = (x3 * x3 * (y1 - y2) + x2 * x2 * (y3 - y1) + x1 * x1 * (y2 - y3)) / denom;
    const c = (x2 * x3 * (x2 - x3) * y1 + x3 * x1 * (x3 - x1) * y2 + x1 * x2 * (x1 - x2) * y3) / denom;

    const eqString = `y = ${a.toFixed(3)}x² ${b >= 0 ? '+' : '-'} ${Math.abs(b).toFixed(2)}x ${c >= 0 ? '+' : '-'} ${Math.abs(c).toFixed(2)}`;
    return { a, b, c, eqString };
  }, [curveP1, curveP2, curveP3]);

  // Computer calculated trendline for comparison
  const autoTrend = useMemo(() => {
    return computeTrendline(topic.defaultTrendline || 'linear', points);
  }, [topic, points]);

  // Robust helper to check if a specific valid data point is matched by any student plotted point
  const isPointMatched = useCallback(
    (vp: { x: number; y: number }, spList: ManualPlotPoint[]) => {
      const vpScreen = dataToScreen(vp.x, vp.y);
      // Increased generous tolerance: at least 6% of range, 1.2 minor steps, or 0.2 units
      const toleranceX = Math.max(bounds.maxX * 0.06, xGrid.minorStep * 1.2, 0.2);
      const toleranceY = Math.max(bounds.maxY * 0.06, yGrid.minorStep * 1.2, 0.2);

      return spList.some((sp) => {
        const spScreen = dataToScreen(sp.x, sp.y);
        const screenDist = Math.hypot(spScreen.x - vpScreen.x, spScreen.y - vpScreen.y);
        const dataXDiff = Math.abs(sp.x - vp.x);
        const dataYDiff = Math.abs(sp.y - vp.y);

        // Matched if placed within 22px on screen (touches target circle) OR within calibrated data tolerance
        return screenDist <= 22 || (dataXDiff <= toleranceX && dataYDiff <= toleranceY);
      });
    },
    [dataToScreen, bounds.maxX, bounds.maxY, xGrid.minorStep, yGrid.minorStep]
  );

  // Check matching status between student points and actual data points
  const matchStatus = useMemo(() => {
    if (validPoints.length === 0) return { matchedCount: 0, total: 0, percent: 0 };
    let matched = 0;
    validPoints.forEach((vp) => {
      if (isPointMatched(vp, studentPoints)) {
        matched++;
      }
    });

    const percent = Math.round((matched / validPoints.length) * 100);
    return { matchedCount: matched, total: validPoints.length, percent };
  }, [validPoints, studentPoints, isPointMatched]);

  // Sync to parent component (App / ChartPanel) whenever student drawing state updates
  useEffect(() => {
    if (onChangeManualGraphData) {
      const hasDrawn = studentPoints.length > 0 || freehandPaths.length > 0 || (hasAdjustedRuler && (toolMode === 'line' || toolMode === 'quadratic'));
      onChangeManualGraphData({
        studentPoints,
        toolMode,
        lineOriginFixed,
        linePoint1,
        linePoint2,
        curveP1,
        curveP2,
        curveP3,
        freehandPaths,
        studentLineEquation,
        studentQuadraticCurve,
        matchStatus,
        hasDrawn,
        hasAdjustedRuler,
        hasPlotted: studentPoints.length > 0
      });
    }
  }, [
    studentPoints,
    toolMode,
    lineOriginFixed,
    linePoint1,
    linePoint2,
    curveP1,
    curveP2,
    curveP3,
    freehandPaths,
    studentLineEquation,
    studentQuadraticCurve,
    matchStatus,
    hasAdjustedRuler,
    onChangeManualGraphData
  ]);

  // Mouse / Pointer handlers on Canvas
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const svgRect = e.currentTarget.getBoundingClientRect();
    const sx = e.clientX - svgRect.left;
    const sy = e.clientY - svgRect.top;

    if (
      sx < margin.left ||
      sx > margin.left + plotWidth ||
      sy < margin.top ||
      sy > margin.top + plotHeight
    ) {
      return;
    }

    // Freehand Drawing Mode
    if (toolMode === 'freehand') {
      setIsFreehandDrawing(true);
      const dataCoord = screenToData(sx, sy, true);
      setCurrentStroke([dataCoord]);
      return;
    }

    // Quadratic 3-Point Curve Mode
    if (toolMode === 'quadratic') {
      setHasAdjustedRuler(true);
      const s1 = dataToScreen(curveP1.x, curveP1.y);
      const s2 = dataToScreen(curveP2.x, curveP2.y);
      const s3 = dataToScreen(curveP3.x, curveP3.y);

      if (Math.hypot(sx - s1.x, sy - s1.y) < 18) {
        setDraggingTarget({ type: 'curveP1' });
        return;
      }
      if (Math.hypot(sx - s2.x, sy - s2.y) < 18) {
        setDraggingTarget({ type: 'curveP2' });
        return;
      }
      if (Math.hypot(sx - s3.x, sy - s3.y) < 18) {
        setDraggingTarget({ type: 'curveP3' });
        return;
      }
      // Clicked near canvas in quadratic mode: move nearest point
      const d1 = Math.hypot(sx - s1.x, sy - s1.y);
      const d2 = Math.hypot(sx - s2.x, sy - s2.y);
      const d3 = Math.hypot(sx - s3.x, sy - s3.y);
      const dataCoord = screenToData(sx, sy);
      if (d1 <= d2 && d1 <= d3) {
        setCurveP1(dataCoord);
        setDraggingTarget({ type: 'curveP1' });
      } else if (d2 <= d1 && d2 <= d3) {
        setCurveP2(dataCoord);
        setDraggingTarget({ type: 'curveP2' });
      } else {
        setCurveP3(dataCoord);
        setDraggingTarget({ type: 'curveP3' });
      }
      return;
    }

    // Straight Line Mode
    if (toolMode === 'line') {
      setHasAdjustedRuler(true);
      const p1Screen = dataToScreen(lineOriginFixed ? 0 : linePoint1.x, lineOriginFixed ? 0 : linePoint1.y);
      const p2Screen = dataToScreen(linePoint2.x, linePoint2.y);
      const dist1 = Math.hypot(sx - p1Screen.x, sy - p1Screen.y);
      const dist2 = Math.hypot(sx - p2Screen.x, sy - p2Screen.y);

      if (dist2 < 20) {
        setDraggingTarget({ type: 'lineP2' });
        return;
      }
      if (!lineOriginFixed && dist1 < 20) {
        setDraggingTarget({ type: 'lineP1' });
        return;
      }
      // If clicked near line, move P2
      setDraggingTarget({ type: 'lineP2' });
      const coord = screenToData(sx, sy);
      setLinePoint2(coord);
      return;
    }

    // Plot Point Mode
    const clickedPoint = studentPoints.find((p) => {
      const pScreen = dataToScreen(p.x, p.y);
      return Math.hypot(sx - pScreen.x, sy - pScreen.y) < 14;
    });

    if (clickedPoint) {
      setSelectedPointId(clickedPoint.id);
      setDraggingTarget({ type: 'point', id: clickedPoint.id });
    } else {
      const coord = screenToData(sx, sy);
      const newPt: ManualPlotPoint = {
        id: `sp_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        x: coord.x,
        y: coord.y
      };
      setStudentPoints((prev) => [...prev, newPt]);
      setSelectedPointId(newPt.id);
      setDraggingTarget({ type: 'point', id: newPt.id });
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const svgRect = e.currentTarget.getBoundingClientRect();
    const sx = e.clientX - svgRect.left;
    const sy = e.clientY - svgRect.top;

    if (
      sx >= margin.left &&
      sx <= margin.left + plotWidth &&
      sy >= margin.top &&
      sy <= margin.top + plotHeight
    ) {
      setHoverCoord(screenToData(sx, sy));
    } else {
      setHoverCoord(null);
    }

    // Freehand stroke recording
    if (toolMode === 'freehand' && isFreehandDrawing) {
      const dataCoord = screenToData(sx, sy, true);
      setCurrentStroke((prev) => [...prev, dataCoord]);
      return;
    }

    if (!draggingTarget) return;

    const dataCoord = screenToData(sx, sy);

    if (draggingTarget.type === 'point') {
      setStudentPoints((prev) =>
        prev.map((p) => (p.id === draggingTarget.id ? { ...p, x: dataCoord.x, y: dataCoord.y } : p))
      );
    } else if (draggingTarget.type === 'lineP1') {
      if (!lineOriginFixed) {
        setLinePoint1(dataCoord);
      }
    } else if (draggingTarget.type === 'lineP2') {
      setLinePoint2(dataCoord);
    } else if (draggingTarget.type === 'curveP1') {
      setCurveP1(dataCoord);
    } else if (draggingTarget.type === 'curveP2') {
      setCurveP2(dataCoord);
    } else if (draggingTarget.type === 'curveP3') {
      setCurveP3(dataCoord);
    }
  };

  const handlePointerUp = () => {
    if (toolMode === 'freehand' && isFreehandDrawing) {
      if (currentStroke.length > 1) {
        setFreehandPaths((prev) => [...prev, currentStroke]);
      }
      setCurrentStroke([]);
      setIsFreehandDrawing(false);
    }
    setDraggingTarget(null);
  };

  // Convert points array (in data coordinates) to smooth SVG path string (in screen coordinates)
  const getSmoothPathData = (pts: Array<{ x: number; y: number }>) => {
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
  };

  // Reset student straight line to default
  const handleResetLine = () => {
    setHasAdjustedRuler(false);
    setLineOriginFixed(topic.defaultTrendline === 'proportional');
    setLinePoint1({ x: 0, y: 0 });
    setLinePoint2({ x: bounds.maxX * 0.75, y: bounds.maxY * 0.75 });
    setShowAutoTrendHint(false);
    showNotice('📏 직선 자가 초기 위치로 리셋되었습니다.');
  };

  // Reset student quadratic curve to default
  const handleResetCurve = () => {
    setHasAdjustedRuler(false);
    setCurveP1({ x: bounds.maxX * 0.1, y: bounds.maxY * 0.15 });
    setCurveP2({ x: bounds.maxX * 0.5, y: bounds.maxY * 0.8 });
    setCurveP3({ x: bounds.maxX * 0.9, y: bounds.maxY * 0.15 });
    setShowAutoTrendHint(false);
    showNotice('📐 2차 곡선 조절점이 초기 위치로 리셋되었습니다.');
  };

  // Reset everything on canvas immediately
  const handleResetAll = () => {
    setHasAdjustedRuler(false);
    setStudentPoints([]);
    setSelectedPointId(null);
    setLineOriginFixed(topic.defaultTrendline === 'proportional');
    setLinePoint1({ x: 0, y: 0 });
    setLinePoint2({ x: bounds.maxX * 0.75, y: bounds.maxY * 0.75 });
    setCurveP1({ x: bounds.maxX * 0.1, y: bounds.maxY * 0.15 });
    setCurveP2({ x: bounds.maxX * 0.5, y: bounds.maxY * 0.8 });
    setCurveP3({ x: bounds.maxX * 0.9, y: bounds.maxY * 0.15 });
    setFreehandPaths([]);
    setCurrentStroke([]);
    setShowAutoTrendHint(false);
    setShowTargetHint(false);
    showNotice('🔄 그래프의 모든 점과 선이 초기화되었습니다.');
  };

  // Clear freehand drawings
  const handleClearFreehand = () => {
    setFreehandPaths([]);
    setCurrentStroke([]);
    showNotice('✏️ 직접 그린 곡선이 모두 지워졌습니다.');
  };

  // Clear all student plotted points
  const handleClearPoints = () => {
    setStudentPoints([]);
    setSelectedPointId(null);
    showNotice('📍 찍은 점들이 모두 초기화되었습니다.');
  };

  // Delete selected point
  const handleDeleteSelectedPoint = () => {
    if (!selectedPointId) return;
    setStudentPoints((prev) => prev.filter((p) => p.id !== selectedPointId));
    setSelectedPointId(null);
  };

  // Auto plot all points from data table
  const handleAutoPlotFromTable = () => {
    if (validPoints.length === 0) return;
    const newStudentPts: ManualPlotPoint[] = validPoints.map((vp, idx) => ({
      id: `sp_auto_${idx}_${Date.now()}`,
      x: vp.x,
      y: vp.y,
      matchedDataId: vp.id
    }));
    setStudentPoints(newStudentPts);
  };

  return (
    <div className="flex flex-col h-full bg-white select-none">
      {/* Interactive Toolbar */}
      <div className="p-2.5 sm:p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Step 1 (Plot points button) + Step 2 (Drawing Mode Dropdown Selector) */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Step 1: Plot Points Toggle Button */}
          <button
            type="button"
            id="btn-mode-plot"
            onClick={() => setToolMode('plot')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs ${
              toolMode === 'plot'
                ? 'bg-blue-600 text-white ring-2 ring-blue-400/40'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>1. 점 찍기 ({studentPoints.length}개)</span>
          </button>

          {/* Step 2: Drawing Method Dropdown */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-300 px-2.5 py-1 rounded-lg shadow-2xs">
            <label htmlFor="select-graph-draw-mode" className="text-xs font-bold text-slate-700 flex items-center gap-1 whitespace-nowrap">
              <span>2. 그래프 그리기 방식:</span>
            </label>
            <select
              id="select-graph-draw-mode"
              value={toolMode === 'plot' ? '' : toolMode}
              onChange={(e) => {
                const val = e.target.value as DrawTool;
                if (val) setToolMode(val);
              }}
              className="text-xs font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
            >
              <option value="" disabled>선택하세요 (직선/곡선/자유펜)</option>
              <option value="line">📏 직선 자 (추세선 맞춤 y=ax+b)</option>
              <option value="quadratic">
                📐 3점 곡선 자 (2차 포물선 y=ax²+bx+c) {isCurvedTopic ? '★추천' : ''}
              </option>
              <option value="freehand">✏️ 자유 곡선 펜 (점 이어 그리기)</option>
            </select>
          </div>
        </div>

        {/* Right: Contextual Controls & Dedicated Reset Actions */}
        <div className="flex items-center flex-wrap gap-1.5 text-xs">
          {toolMode === 'plot' && (
            <>
              <button
                type="button"
                id="btn-hint-toggle"
                onClick={() => setShowTargetHint(!showTargetHint)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-colors ${
                  showTargetHint
                    ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
                title="좌측 표의 실제 측정값 위치를 흐린 원 힌트로 표시합니다."
              >
                {showTargetHint ? <Eye className="w-3.5 h-3.5 text-amber-600" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>측정값 힌트</span>
              </button>

              {selectedPointId && (
                <button
                  type="button"
                  id="btn-del-point"
                  onClick={handleDeleteSelectedPoint}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>선택 점 삭제</span>
                </button>
              )}

              <button
                type="button"
                id="btn-clear-points"
                onClick={handleClearPoints}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 font-medium transition-colors"
                title="내가 찍은 모든 점을 초기화합니다."
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                <span>점 초기화</span>
              </button>
            </>
          )}

          {toolMode === 'line' && (
            <>
              <button
                type="button"
                id="btn-toggle-origin-lock"
                onClick={() => setLineOriginFixed(!lineOriginFixed)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-colors ${
                  lineOriginFixed
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-800 font-bold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
                title="선이 항상 원점(0,0)을 통과하도록 고정합니다."
              >
                <span>{lineOriginFixed ? '🔒 원점 고정 (y=ax)' : '🔓 자유 이동 (y=ax+b)'}</span>
              </button>

              <button
                type="button"
                id="btn-reset-line"
                onClick={handleResetLine}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 font-medium transition-colors"
                title="직선 조절 핸들 위치를 초기 위치로 되돌립니다."
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                <span>직선 초기화</span>
              </button>

              {allowAutoAnalysis && (
                <button
                  type="button"
                  id="btn-show-auto-trend"
                  onClick={() => setShowAutoTrendHint(!showAutoTrendHint)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-colors ${
                    showAutoTrendHint
                      ? 'bg-purple-100 border-purple-300 text-purple-900 font-bold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                  title="컴퓨터가 수학적으로 계산한 최적 추세선과 겹쳐 비교합니다."
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>컴퓨터 최적선 비교</span>
                </button>
              )}
            </>
          )}

          {toolMode === 'quadratic' && (
            <>
              <button
                type="button"
                id="btn-reset-curve"
                onClick={handleResetCurve}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 font-medium transition-colors"
                title="곡선 조절 핸들 3개를 초기 위치로 되돌립니다."
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                <span>곡선 초기화</span>
              </button>

              {allowAutoAnalysis && (
                <button
                  type="button"
                  id="btn-show-auto-curve"
                  onClick={() => setShowAutoTrendHint(!showAutoTrendHint)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-colors ${
                    showAutoTrendHint
                      ? 'bg-purple-100 border-purple-300 text-purple-900 font-bold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                  title="컴퓨터가 계산한 최적 2차 곡선과 겹쳐 비교합니다."
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>컴퓨터 곡선 비교</span>
                </button>
              )}
            </>
          )}

          {toolMode === 'freehand' && (
            <>
              <button
                type="button"
                id="btn-clear-freehand"
                onClick={handleClearFreehand}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium"
              >
                <Eraser className="w-3.5 h-3.5 text-rose-500" />
                <span>그린 곡선 지우기</span>
              </button>
              <button
                type="button"
                id="btn-show-auto-freehand"
                onClick={() => setShowAutoTrendHint(!showAutoTrendHint)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-colors ${
                  showAutoTrendHint
                    ? 'bg-purple-100 border-purple-300 text-purple-900 font-bold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>컴퓨터 곡선 비교</span>
              </button>
            </>
          )}

          {/* Global Reset Button (All Points + Lines) */}
          <button
            type="button"
            id="btn-reset-all-canvas"
            onClick={handleResetAll}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 font-medium transition-colors ml-1"
            title="그래프 위의 모든 점과 그린 선 전체를 초기화합니다."
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
            <span>전체 초기화</span>
          </button>
        </div>
      </div>

      {/* Target Points Check Status Bar */}
      <div className="bg-slate-100/80 px-3.5 py-1.5 border-b border-slate-200 flex flex-wrap items-center justify-between text-xs gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-slate-600">찍어야 할 측정점:</span>
          {validPoints.length === 0 ? (
            <span className="text-slate-400">좌측 표에 데이터를 먼저 입력해주세요</span>
          ) : (
            validPoints.map((vp, idx) => {
              const isPlotted = isPointMatched(vp, studentPoints);
              return (
                <span
                  key={vp.id}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[11px] font-bold transition-all ${
                    isPlotted
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  {isPlotted && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                  <span>{idx + 1}차 ({vp.x}, {vp.y})</span>
                </span>
              );
            })
          )}
        </div>

        {/* Hover Coordinate or Mode Guidance or Flash Notice */}
        <div className="flex items-center gap-2">
          {flashNotice ? (
            <span className="font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-300 text-xs shadow-2xs animate-fade-in">
              {flashNotice}
            </span>
          ) : hoverCoord ? (
            <span className="font-mono text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-300 text-[11px]">
              커서 위치: ({hoverCoord.x}, {hoverCoord.y})
            </span>
          ) : (
            <span className="text-slate-500 text-[11px]">
              {toolMode === 'plot' && '모눈을 클릭하여 측정점들을 찍으세요.'}
              {toolMode === 'line' && '조절 핸들을 드래그하여 직선 추세선을 맞추세요.'}
              {toolMode === 'quadratic' && '3개의 곡선 조절점을 드래그하여 2차 포물선을 맞추세요.'}
              {toolMode === 'freehand' && '마우스/터치로 점들을 이어 자연스러운 곡선을 그리세요.'}
            </span>
          )}
        </div>
      </div>

      {/* SVG Coordinate Canvas */}
      <div ref={containerRef} className="flex-1 min-h-[300px] p-2 relative bg-white flex items-center justify-center">
        <svg
          width={dimensions.width}
          height={dimensions.height}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="cursor-crosshair overflow-visible touch-none shadow-2xs rounded-lg border border-slate-200 bg-[#f8fbff]"
        >
          {/* Plot Background Area */}
          <rect
            x={margin.left}
            y={margin.top}
            width={plotWidth}
            height={plotHeight}
            fill="#ffffff"
          />

          {/* 1. Minor Sub-Grid Lines (보조 모눈 실선: 매우 얇고 정밀함) */}
          {xGrid.minorTicks.map((xVal, idx) => {
            const screen = dataToScreen(xVal, 0);
            return (
              <line
                key={`x-minor-${idx}`}
                x1={screen.x}
                y1={margin.top}
                x2={screen.x}
                y2={margin.top + plotHeight}
                stroke="#eef2f7"
                strokeWidth={0.8}
              />
            );
          })}

          {yGrid.minorTicks.map((yVal, idx) => {
            const screen = dataToScreen(0, yVal);
            return (
              <line
                key={`y-minor-${idx}`}
                x1={margin.left}
                y1={screen.y}
                x2={margin.left + plotWidth}
                y2={screen.y}
                stroke="#eef2f7"
                strokeWidth={0.8}
              />
            );
          })}

          {/* 2. Major Grid Lines & Numbers (주 모눈선: 눈금 수치와 100% 일치) */}
          {xGrid.majorTicks.map((xVal, idx) => {
            const screen = dataToScreen(xVal, 0);
            return (
              <g key={`x-grid-${idx}`}>
                <line
                  x1={screen.x}
                  y1={margin.top}
                  x2={screen.x}
                  y2={margin.top + plotHeight}
                  stroke={xVal === 0 ? '#334155' : '#cbd5e1'}
                  strokeWidth={xVal === 0 ? 1.5 : 1}
                  strokeDasharray={xVal === 0 ? 'none' : '3 3'}
                />
                <text
                  x={screen.x}
                  y={margin.top + plotHeight + 16}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#475569"
                  fontWeight={500}
                >
                  {xVal}
                </text>
              </g>
            );
          })}

          {yGrid.majorTicks.map((yVal, idx) => {
            const screen = dataToScreen(0, yVal);
            return (
              <g key={`y-grid-${idx}`}>
                <line
                  x1={margin.left}
                  y1={screen.y}
                  x2={margin.left + plotWidth}
                  y2={screen.y}
                  stroke={yVal === 0 ? '#334155' : '#cbd5e1'}
                  strokeWidth={yVal === 0 ? 1.5 : 1}
                  strokeDasharray={yVal === 0 ? 'none' : '3 3'}
                />
                <text
                  x={margin.left - 8}
                  y={screen.y + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="#475569"
                  fontWeight={500}
                >
                  {yVal}
                </text>
              </g>
            );
          })}

          {/* X and Y Axes */}
          <line
            x1={margin.left}
            y1={margin.top + plotHeight}
            x2={margin.left + plotWidth}
            y2={margin.top + plotHeight}
            stroke="#334155"
            strokeWidth={2}
          />
          <line
            x1={margin.left}
            y1={margin.top}
            x2={margin.left}
            y2={margin.top + plotHeight}
            stroke="#334155"
            strokeWidth={2}
          />

          {/* Axis Labels */}
          <text
            x={margin.left + plotWidth / 2}
            y={margin.top + plotHeight + 35}
            textAnchor="middle"
            fontSize="12"
            fontWeight="bold"
            fill="#1e293b"
          >
            {topic.xVarName} ({topic.xUnit})
          </text>
          <text
            x={margin.left - 38}
            y={margin.top + plotHeight / 2}
            textAnchor="middle"
            fontSize="12"
            fontWeight="bold"
            fill="#1e293b"
            transform={`rotate(-90 ${margin.left - 38} ${margin.top + plotHeight / 2})`}
          >
            {topic.yVarName} ({topic.yUnit})
          </text>

          {/* Target Hints */}
          {showTargetHint &&
            validPoints.map((vp, idx) => {
              const screen = dataToScreen(vp.x, vp.y);
              const matched = isPointMatched(vp, studentPoints);
              return (
                <g key={`target-${vp.id}`}>
                  <circle
                    cx={screen.x}
                    cy={screen.y}
                    r={13}
                    fill={matched ? 'rgba(16, 185, 129, 0.2)' : 'none'}
                    stroke={matched ? '#10b981' : '#f59e0b'}
                    strokeWidth={matched ? 2.5 : 2}
                    strokeDasharray={matched ? undefined : '3,3'}
                    className={matched ? '' : 'animate-pulse'}
                  />
                  {matched ? (
                    <g transform={`translate(${screen.x + 14}, ${screen.y - 4})`}>
                      <rect
                        x={-3}
                        y={-11}
                        width={78}
                        height={16}
                        rx={4}
                        fill="#ecfdf5"
                        stroke="#10b981"
                        strokeWidth={1}
                      />
                      <text
                        x={3}
                        y={1}
                        fontSize="10"
                        fill="#047857"
                        fontWeight="bold"
                      >
                        ✓ 목표 #{idx + 1} 일치
                      </text>
                    </g>
                  ) : (
                    <text
                      x={screen.x + 14}
                      y={screen.y - 4}
                      fontSize="10"
                      fill="#b45309"
                      fontWeight="bold"
                    >
                      목표 #{idx + 1} ({vp.x}, {vp.y})
                    </text>
                  )}
                </g>
              );
            })}

          {/* Computer Auto Trendline (Hint Overlay) */}
          {showAutoTrendHint && (
            <g>
              {(() => {
                // Sample 50 points across domain for accurate curve rendering
                const steps = 50;
                const pathPts: Array<{ x: number; y: number }> = [];
                for (let i = 0; i <= steps; i++) {
                  const dataX = (bounds.maxX / steps) * i;
                  const dataY = autoTrend.predict(dataX);
                  if (dataY !== null && !isNaN(dataY) && dataY >= 0 && dataY <= bounds.maxY * 1.5) {
                    pathPts.push({ x: dataX, y: dataY });
                  }
                }
                return (
                  <path
                    d={getSmoothPathData(pathPts)}
                    fill="none"
                    stroke="#a855f7"
                    strokeWidth={2.5}
                    strokeDasharray="5,4"
                  />
                );
              })()}
              <text
                x={margin.left + plotWidth - 10}
                y={margin.top + 20}
                textAnchor="end"
                fontSize="11"
                fill="#7e22ce"
                fontWeight="bold"
              >
                컴퓨터 계산선: {autoTrend.equation} (R²={autoTrend.r2.toFixed(3)})
              </text>
            </g>
          )}

          {/* 1. Student Straight Line (Line Mode) */}
          {toolMode === 'line' && (
            <g>
              {(() => {
                const p1 = lineOriginFixed ? { x: 0, y: 0 } : linePoint1;
                const slope = studentLineEquation.slope;
                const intercept = studentLineEquation.intercept;
                const sStart = dataToScreen(0, intercept);
                const sEnd = dataToScreen(bounds.maxX, slope * bounds.maxX + intercept);

                return (
                  <line
                    x1={sStart.x}
                    y1={sStart.y}
                    x2={sEnd.x}
                    y2={sEnd.y}
                    stroke="#4f46e5"
                    strokeWidth={3}
                  />
                );
              })()}

              {/* Control Handle 1 (P1) */}
              {!lineOriginFixed && (
                <g transform={`translate(${dataToScreen(linePoint1.x, linePoint1.y).x}, ${dataToScreen(linePoint1.x, linePoint1.y).y})`}>
                  <circle r={9} fill="#4f46e5" stroke="#ffffff" strokeWidth={2} className="cursor-grab active:cursor-grabbing shadow" />
                  <text y={-14} textAnchor="middle" fontSize="10" fill="#4f46e5" fontWeight="bold">절편점 A</text>
                </g>
              )}

              {/* Control Handle 2 (P2 - Stable without bounce) */}
              <g transform={`translate(${dataToScreen(linePoint2.x, linePoint2.y).x}, ${dataToScreen(linePoint2.x, linePoint2.y).y})`}>
                <circle
                  r={10}
                  fill="#6366f1"
                  stroke="#ffffff"
                  strokeWidth={2.5}
                  className="cursor-grab active:cursor-grabbing shadow hover:scale-110 transition-transform"
                />
                <circle r={3.5} fill="#ffffff" />
                <text y={-14} textAnchor="middle" fontSize="11" fill="#4338ca" fontWeight="bold">
                  기울기 조절 핸들
                </text>
              </g>
            </g>
          )}

          {/* 2. Student 3-Point Quadratic Parabola (Quadratic Mode) */}
          {toolMode === 'quadratic' && (
            <g>
              {/* Sample quadratic curve */}
              {(() => {
                const steps = 60;
                const pts: Array<{ x: number; y: number }> = [];
                const { a, b, c } = studentQuadraticCurve;
                for (let i = 0; i <= steps; i++) {
                  const dataX = (bounds.maxX / steps) * i;
                  const dataY = a * dataX * dataX + b * dataX + c;
                  pts.push({ x: dataX, y: dataY });
                }
                return (
                  <path
                    d={getSmoothPathData(pts)}
                    fill="none"
                    stroke="#9333ea"
                    strokeWidth={3}
                  />
                );
              })()}

              {/* Curve Handle 1 (Start) */}
              <g transform={`translate(${dataToScreen(curveP1.x, curveP1.y).x}, ${dataToScreen(curveP1.x, curveP1.y).y})`}>
                <circle r={9} fill="#7e22ce" stroke="#ffffff" strokeWidth={2} className="cursor-grab active:cursor-grabbing shadow hover:scale-110 transition-transform" />
                <text y={-13} textAnchor="middle" fontSize="10" fill="#7e22ce" fontWeight="bold">곡선시작 P1</text>
              </g>

              {/* Curve Handle 2 (Peak / Vertex) */}
              <g transform={`translate(${dataToScreen(curveP2.x, curveP2.y).x}, ${dataToScreen(curveP2.x, curveP2.y).y})`}>
                <circle r={11} fill="#a855f7" stroke="#ffffff" strokeWidth={2.5} className="cursor-grab active:cursor-grabbing shadow-md hover:scale-110 transition-transform" />
                <circle r={3.5} fill="#ffffff" />
                <text y={-15} textAnchor="middle" fontSize="11" fill="#6b21a8" fontWeight="bold">꼭짓점/정점 P2</text>
              </g>

              {/* Curve Handle 3 (End) */}
              <g transform={`translate(${dataToScreen(curveP3.x, curveP3.y).x}, ${dataToScreen(curveP3.x, curveP3.y).y})`}>
                <circle r={9} fill="#7e22ce" stroke="#ffffff" strokeWidth={2} className="cursor-grab active:cursor-grabbing shadow hover:scale-110 transition-transform" />
                <text y={-13} textAnchor="middle" fontSize="10" fill="#7e22ce" fontWeight="bold">곡선끝 P3</text>
              </g>
            </g>
          )}

          {/* 3. Student Freehand Paths */}
          {freehandPaths.map((stroke, sIdx) => (
            <path
              key={`stroke-${sIdx}`}
              d={getSmoothPathData(stroke)}
              fill="none"
              stroke="#059669"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* Current active stroke */}
          {currentStroke.length > 1 && (
            <path
              d={getSmoothPathData(currentStroke)}
              fill="none"
              stroke="#10b981"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Student Plotted Points */}
          {studentPoints.map((sp) => {
            const screen = dataToScreen(sp.x, sp.y);
            const isSelected = selectedPointId === sp.id;

            return (
              <g key={sp.id} transform={`translate(${screen.x}, ${screen.y})`}>
                {isSelected && (
                  <circle r={14} fill="#3b82f6" fillOpacity={0.25} stroke="#2563eb" strokeWidth={1.5} />
                )}
                <circle
                  r={7}
                  fill={isSelected ? '#1d4ed8' : '#2563eb'}
                  stroke="#ffffff"
                  strokeWidth={2}
                  className="cursor-pointer transition-transform hover:scale-125 shadow"
                />
                <text
                  x={10}
                  y={-8}
                  fontSize="10"
                  fontWeight="bold"
                  fill="#1e40af"
                  className="pointer-events-none"
                >
                  ({sp.x}, {sp.y})
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Bottom Result & Comparison Footer */}
      <div className="bg-slate-50 border-t border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="space-y-1">
          {toolMode === 'line' && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-800">내가 맞춘 직선 관계식:</span>
              <code className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 font-mono font-bold text-xs border border-indigo-200">
                {studentLineEquation.eqString}
              </code>
              <span className="text-slate-500">
                (기울기: <strong className="text-indigo-700">{studentLineEquation.slope.toFixed(3)}</strong>)
              </span>
            </div>
          )}

          {toolMode === 'quadratic' && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-800">내가 맞춘 2차 곡선식:</span>
              <code className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 font-mono font-bold text-xs border border-purple-200">
                {studentQuadraticCurve.eqString}
              </code>
            </div>
          )}

          {toolMode === 'freehand' && (
            <div className="flex items-center gap-2 text-emerald-800">
              <Spline className="w-3.5 h-3.5" />
              <span>점들을 연결하는 자유 곡선 드로잉 완료 ({freehandPaths.length}개 선)</span>
            </div>
          )}

          {toolMode === 'plot' && (
            <div className="flex items-center gap-2 text-[11px] text-slate-600">
              <span>점 찍기 완성도:</span>
              <span className="font-bold text-emerald-700">
                {matchStatus.matchedCount} / {matchStatus.total}개 일치 ({matchStatus.percent}%)
              </span>
              {matchStatus.percent === 100 && (
                <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                  <Award className="w-3.5 h-3.5" /> 모든 측정점을 정확히 찍었습니다!
                </span>
              )}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2">
          {studentPoints.length === 0 && validPoints.length > 0 && (
            <button
              type="button"
              onClick={handleAutoPlotFromTable}
              className="px-2.5 py-1 text-xs bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-medium transition-colors"
            >
              표 데이터로 점 자동 배치
            </button>
          )}

          {allowAutoAnalysis && onSwitchToAuto && (
            <button
              type="button"
              onClick={onSwitchToAuto}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-2xs transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>컴퓨터 자동 분석 결과 보기 ➔</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
