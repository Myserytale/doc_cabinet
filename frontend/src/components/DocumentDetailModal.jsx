import React, { useState } from 'react';
import { X, Download, RefreshCw, Trash2, Copy, Check, FileText, HardDrive, Calendar, AlertTriangle, ShieldCheck } from 'lucide-react';
import { formatBytes, formatDate, getFileTypeBadge } from '../utils';

export function DocumentDetailModal({ doc, isOpen, onClose, onDownload, onReindex, onDelete }) {
  const [copied, setCopied] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!isOpen || !doc) return null;

  const badge = getFileTypeBadge(doc.mimeType, doc.originalFilename);

  function copyChecksum() {
    if (doc.checksum) {
      navigator.clipboard.writeText(doc.checksum);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleReindex() {
    setReindexing(true);
    try {
      await onReindex(doc.id);
    } finally {
      setReindexing(false);
    }
  }

  async function handleDelete() {
    if (confirm(`Are you sure you want to delete "${doc.title || doc.originalFilename}"?`)) {
      setDeleting(true);
      try {
        await onDelete(doc.id);
        onClose();
      } finally {
        setDeleting(false);
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-start gap-3">
            <span className={`px-2.5 py-1 rounded-md text-xs font-bold border shrink-0 mt-0.5 ${badge.bg} ${badge.text} ${badge.border}`}>
              {badge.label}
            </span>
            <div>
              <h3 className="font-bold text-white text-lg tracking-tight leading-snug">
                {doc.title || doc.originalFilename}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">{doc.originalFilename}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-sm">
          {/* Status banner */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400 font-medium">Processing Status</span>
            <div className="flex items-center gap-1.5">
              {doc.status === 'INDEXED' && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Indexed & Searchable
                </span>
              )}
              {doc.status === 'PROCESSING' && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Extracting Text...
                </span>
              )}
              {doc.status === 'PENDING' && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Queued
                </span>
              )}
              {doc.status === 'FAILED' && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Failed
                </span>
              )}
            </div>
          </div>

          {/* Failure Alert */}
          {doc.errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
              <span className="font-semibold block mb-0.5">Extraction Error:</span>
              <p className="font-mono break-all">{doc.errorMessage}</p>
            </div>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <HardDrive className="w-3.5 h-3.5" />
                <span>File Size</span>
              </div>
              <p className="font-semibold text-white">{formatBytes(doc.sizeBytes)}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <FileText className="w-3.5 h-3.5" />
                <span>MIME Type</span>
              </div>
              <p className="font-mono text-xs text-slate-200 truncate">{doc.mimeType}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Uploaded At</span>
              </div>
              <p className="text-xs text-slate-200">{formatDate(doc.createdAt)}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Last Updated</span>
              </div>
              <p className="text-xs text-slate-200">{formatDate(doc.updatedAt || doc.createdAt)}</p>
            </div>
          </div>

          {/* SHA-256 Checksum */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-400">SHA-256 Checksum</span>
              {doc.checksum && (
                <button
                  onClick={copyChecksum}
                  className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              )}
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 break-all select-all">
              {doc.checksum || 'Pending checksum calculation...'}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-slate-950/60">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Document</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReindex}
              disabled={reindexing}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${reindexing ? 'animate-spin text-indigo-400' : ''}`} />
              <span>Reindex</span>
            </button>

            <button
              onClick={() => onDownload(doc.id, doc.originalFilename)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition shadow-lg shadow-indigo-600/25"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
