import React from 'react';
import { Download, Trash2, Eye, ShieldCheck, RefreshCw, AlertTriangle, Clock, Folder, CheckSquare, Square } from 'lucide-react';
import { formatBytes, formatDate, getFileTypeBadge } from '../utils';

export function DocumentCard({ doc, isSelected = false, onToggleSelect, onSelect, onDownload, onDelete }) {
  const badge = getFileTypeBadge(doc.mimeType, doc.originalFilename);

  const getFolderDisplay = (path) => {
    if (!path) return null;
    const parts = path.split('/').filter(Boolean);
    if (parts.length >= 2) {
      return parts[parts.length - 2];
    }
    return parts[0] || path;
  };

  const folderName = getFolderDisplay(doc.sourcePath);

  return (
    <div
      onClick={() => onSelect(doc)}
      className={`group relative rounded-xl p-4 transition duration-150 cursor-pointer shadow-sm hover:shadow-xl flex flex-col justify-between border ${
        isSelected
          ? 'bg-indigo-950/30 border-indigo-500/80 shadow-indigo-950/40'
          : 'bg-slate-900/80 hover:bg-slate-900 border-slate-800/80 hover:border-slate-700'
      }`}
    >
      <div>
        {/* Top bar: Checkbox, Badge & Status */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            {onToggleSelect && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect(doc.id);
                }}
                className="text-slate-400 hover:text-white"
              >
                {isSelected ? (
                  <CheckSquare className="w-4 h-4 text-indigo-400" />
                ) : (
                  <Square className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
                )}
              </div>
            )}
            <span className={`px-2 py-0.5 rounded text-[11px] font-bold border tracking-wider ${badge.bg} ${badge.text} ${badge.border}`}>
              {badge.label}
            </span>
          </div>

          <div>
            {doc.status === 'INDEXED' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-3 h-3" />
                Indexed
              </span>
            )}
            {doc.status === 'PROCESSING' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Processing
              </span>
            )}
            {doc.status === 'PENDING' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Clock className="w-3 h-3" />
                Pending
              </span>
            )}
            {doc.status === 'FAILED' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20" title={doc.errorMessage}>
                <AlertTriangle className="w-3 h-3" />
                Failed
              </span>
            )}
          </div>
        </div>

        {/* Title and Original Filename */}
        <h4 className="font-semibold text-white text-sm tracking-tight group-hover:text-indigo-300 transition truncate" title={doc.title || doc.originalFilename}>
          {doc.title || doc.originalFilename}
        </h4>
        <p className="text-xs text-slate-400 truncate mt-0.5 font-mono">
          {doc.originalFilename}
        </p>

        {/* Category & Folder Badges */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
          {doc.categoryName && (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium"
              style={{
                backgroundColor: `${doc.categoryColor || '#6366f1'}20`,
                color: doc.categoryColor || '#a5b4fc',
                border: `1px solid ${doc.categoryColor || '#6366f1'}40`
              }}
            >
              {doc.categoryName}
            </span>
          )}

          {folderName && (
            <span
              title={doc.sourcePath}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-slate-950 text-slate-400 border border-slate-800 font-mono truncate max-w-[160px]"
            >
              <Folder className="w-3 h-3 shrink-0 text-slate-500" />
              <span className="truncate">{folderName}</span>
            </span>
          )}
        </div>
      </div>

      {/* Footer Info & Quick Actions */}
      <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span>{formatBytes(doc.sizeBytes)}</span>
          <span>•</span>
          <span>{formatDate(doc.createdAt)}</span>
        </div>

        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onDownload(doc.id, doc.originalFilename)}
            title="Download original file"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onSelect(doc)}
            title="View details"
            className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded transition"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(doc.id)}
            title="Delete document"
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
