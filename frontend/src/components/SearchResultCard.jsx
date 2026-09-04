import React from 'react';
import { Download, Eye, Sparkles, FileText } from 'lucide-react';
import { formatBytes, formatDate, getFileTypeBadge } from '../utils';

export function SearchResultCard({ hit, onSelect, onDownload }) {
  const badge = getFileTypeBadge(hit.mimeType, hit.originalFilename);

  return (
    <div
      onClick={() => onSelect(hit)}
      className="group relative bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-xl p-4 transition duration-200 cursor-pointer shadow-sm hover:shadow-xl hover:shadow-indigo-500/5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className={`px-2 py-0.5 rounded text-[11px] font-bold border shrink-0 mt-0.5 tracking-wider ${badge.bg} ${badge.text} ${badge.border}`}>
            {badge.label}
          </span>
          <div className="min-w-0">
            <h4 className="font-semibold text-white text-sm group-hover:text-indigo-400 transition truncate">
              {hit.title || hit.originalFilename}
            </h4>
            <p className="text-xs text-slate-400 font-mono truncate">{hit.originalFilename}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hit.score && (
            <span className="flex items-center gap-1 text-[11px] font-mono text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              score: {hit.score.toFixed(2)}
            </span>
          )}

          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => onDownload(hit.id, hit.originalFilename)}
              title="Download file"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onSelect(hit)}
              title="View details"
              className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded transition"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Highlights / Snippets from Elasticsearch */}
      {hit.highlights && hit.highlights.length > 0 && (
        <div className="mt-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1.5 text-xs text-slate-300">
          {hit.highlights.map((snippet, idx) => (
            <div
              key={idx}
              className="line-clamp-2 text-slate-300 font-sans"
              dangerouslySetInnerHTML={{ __html: `...${snippet}...` }}
            />
          ))}
        </div>
      )}

      {/* Footer Info */}
      <div className="mt-3 pt-2 border-t border-slate-800/40 flex items-center justify-between text-[11px] text-slate-400">
        <span>{formatBytes(hit.sizeBytes)}</span>
        <span>{formatDate(hit.createdAt)}</span>
      </div>
    </div>
  );
}
