import React from 'react';
import {
  Plus,
  Trash2,
  ArrowUpDown,
  Sparkles,
  AlertCircle,
  HelpCircle,
  CheckCircle2
} from 'lucide-react';
import { DataPoint, TopicConfig } from '../types';

interface DataTableProps {
  topic: TopicConfig;
  groupName: string;
  points: DataPoint[];
  onChangePoints: (points: DataPoint[]) => void;
  onLoadSample: () => void;
}

export const DataTable: React.FC<DataTableProps> = ({
  topic,
  groupName,
  points,
  onChangePoints,
  onLoadSample
}) => {
  const handleAddRow = () => {
    const nextOrder = points.length > 0 ? Math.max(...points.map((p) => p.order)) + 1 : 1;
    const newPoint: DataPoint = {
      id: String(Date.now()),
      order: nextOrder,
      x: '',
      y: '',
      isOutlier: false,
      note: ''
    };
    onChangePoints([...points, newPoint]);
  };

  const handleDeleteRow = (id: string) => {
    const updated = points.filter((p) => p.id !== id);
    // Re-index order
    const reindexed = updated.map((p, idx) => ({ ...p, order: idx + 1 }));
    onChangePoints(reindexed);
  };

  const handleCellChange = (
    id: string,
    field: keyof DataPoint,
    value: string | number | boolean
  ) => {
    const updated = points.map((p) => {
      if (p.id !== id) return p;
      if (field === 'x' || field === 'y') {
        if (value === '') return { ...p, [field]: '' };
        const num = parseFloat(value as string);
        return { ...p, [field]: isNaN(num) ? '' : num };
      }
      return { ...p, [field]: value };
    });
    onChangePoints(updated);
  };

  const handleSortByX = () => {
    const sorted = [...points].sort((a, b) => {
      const numA = typeof a.x === 'number' ? a.x : Infinity;
      const numB = typeof b.x === 'number' ? b.x : Infinity;
      return numA - numB;
    });
    const reindexed = sorted.map((p, idx) => ({ ...p, order: idx + 1 }));
    onChangePoints(reindexed);
  };

  // Quick stats
  const validPoints = points.filter(
    (p) => !p.isOutlier && typeof p.x === 'number' && typeof p.y === 'number'
  );
  const count = validPoints.length;
  const avgX = count > 0 ? (validPoints.reduce((sum, p) => sum + (p.x as number), 0) / count).toFixed(2) : '-';
  const avgY = count > 0 ? (validPoints.reduce((sum, p) => sum + (p.y as number), 0) / count).toFixed(2) : '-';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col h-full overflow-hidden">
      {/* Table Header / Action Bar */}
      <div className="p-3.5 bg-slate-50/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <span>실험 데이터 입력표</span>
            <span className="text-xs px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-semibold">
              {groupName}
            </span>
          </h2>
          <span className="text-xs text-slate-500 hidden sm:inline">
            ({count}개 측정값 반영됨)
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            id="btn-sort-x"
            onClick={handleSortByX}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-md transition-colors shadow-2xs"
            title="독립변인(X) 값을 기준으로 오름차순 정렬합니다"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">X값 정렬</span>
          </button>

          <button
            type="button"
            id="btn-load-sample"
            onClick={onLoadSample}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors"
            title="예시 실험 데이터를 불러옵니다"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>예시값</span>
          </button>

          <button
            type="button"
            id="btn-add-row"
            onClick={handleAddRow}
            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>행 추가</span>
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden max-h-[460px]">
        <table className="w-full text-left text-sm border-collapse table-fixed">
          <colgroup>
            <col className="w-10" />
            <col />
            <col />
            <col className="w-12" />
            <col className="w-9" />
          </colgroup>
          <thead className="bg-slate-100/90 text-slate-700 text-xs font-semibold sticky top-0 z-10 border-b border-slate-200">
            <tr>
              <th className="py-2 px-1.5 text-center text-slate-500">차수</th>
              <th className="py-2 px-2">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="font-bold text-slate-800 text-xs truncate" title={`${topic.xVarName} (${topic.xUnit})`}>
                      {topic.xVarName}
                    </span>
                    <span className="text-[10px] font-normal text-blue-600 shrink-0">({topic.xUnit})</span>
                  </div>
                  <span className="text-[9px] px-1 py-0.5 bg-blue-100 rounded text-blue-700 font-bold self-start whitespace-nowrap">
                    독립 X
                  </span>
                </div>
              </th>
              <th className="py-2 px-2">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="font-bold text-slate-800 text-xs truncate" title={`${topic.yVarName} (${topic.yUnit})`}>
                      {topic.yVarName}
                    </span>
                    <span className="text-[10px] font-normal text-emerald-600 shrink-0">({topic.yUnit})</span>
                  </div>
                  <span className="text-[9px] px-1 py-0.5 bg-emerald-100 rounded text-emerald-700 font-bold self-start whitespace-nowrap">
                    종속 Y
                  </span>
                </div>
              </th>
              <th className="py-2 px-1 text-center" title="체크 시 추세선 계산에서 제외됩니다">
                <span className="text-[11px]">이상치</span>
              </th>
              <th className="py-2 px-1 text-center">
                <span className="text-[11px]">삭제</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {points.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-slate-400">
                  <AlertCircle className="w-7 h-7 mx-auto mb-2 text-slate-300" />
                  <p className="font-medium text-slate-600">측정 데이터가 없습니다.</p>
                  <p className="text-xs text-slate-400 mt-1">
                    상단의 <strong>[+ 행 추가]</strong> 또는 <strong>[예시값]</strong>을 클릭하여 데이터를 입력하세요.
                  </p>
                </td>
              </tr>
            ) : (
              points.map((pt, idx) => {
                const isExcl = pt.isOutlier;
                return (
                  <tr
                    key={pt.id}
                    className={`transition-colors hover:bg-slate-50/80 ${
                      isExcl ? 'bg-slate-50 opacity-60' : ''
                    }`}
                  >
                    {/* Order */}
                    <td className="py-2 px-1 text-center text-xs font-semibold text-slate-400">
                      {idx + 1}
                    </td>

                    {/* Independent Var X Input */}
                    <td className="py-1.5 px-1.5">
                      <div className="relative">
                        <input
                          id={`input-x-${idx}`}
                          type="number"
                          step="any"
                          value={pt.x === '' ? '' : pt.x}
                          onChange={(e) => handleCellChange(pt.id, 'x', e.target.value)}
                          placeholder="X 값"
                          className={`w-full px-2 py-1.5 text-xs sm:text-sm font-medium border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all ${
                            isExcl
                              ? 'border-slate-200 line-through text-slate-400 bg-slate-100'
                              : 'border-slate-300 bg-white text-slate-900 shadow-2xs'
                          }`}
                        />
                      </div>
                    </td>

                    {/* Dependent Var Y Input */}
                    <td className="py-1.5 px-1.5">
                      <div className="relative">
                        <input
                          id={`input-y-${idx}`}
                          type="number"
                          step="any"
                          value={pt.y === '' ? '' : pt.y}
                          onChange={(e) => handleCellChange(pt.id, 'y', e.target.value)}
                          placeholder="Y 값"
                          className={`w-full px-2 py-1.5 text-xs sm:text-sm font-medium border rounded-md focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all ${
                            isExcl
                              ? 'border-slate-200 line-through text-slate-400 bg-slate-100'
                              : 'border-slate-300 bg-white text-slate-900 shadow-2xs'
                          }`}
                        />
                      </div>
                    </td>

                    {/* Outlier checkbox */}
                    <td className="py-2 px-1 text-center">
                      <input
                        id={`check-outlier-${idx}`}
                        type="checkbox"
                        checked={pt.isOutlier}
                        onChange={(e) => handleCellChange(pt.id, 'isOutlier', e.target.checked)}
                        className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
                        title="체크 시 추세선 계산에서 제외됩니다"
                      />
                    </td>

                    {/* Delete button */}
                    <td className="py-2 px-1 text-center">
                      <button
                        type="button"
                        id={`btn-del-row-${idx}`}
                        onClick={() => handleDeleteRow(pt.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                        title="이 행 삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer: Quick Summary Stats */}
      <div className="bg-slate-50 border-t border-slate-200 px-3.5 py-2.5 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-700">
            유효 데이터: <span className="text-blue-600 font-bold">{count}</span>개
          </span>
          <span className="text-slate-400">|</span>
          <span>
            {topic.xVarName} 평균: <strong className="text-slate-800">{avgX} {topic.xUnit}</strong>
          </span>
          <span className="text-slate-400">|</span>
          <span>
            {topic.yVarName} 평균: <strong className="text-slate-800">{avgY} {topic.yUnit}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
