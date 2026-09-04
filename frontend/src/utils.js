export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatDate(dateString) {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('default', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function getFileTypeBadge(mimeType = '', filename = '') {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const mime = mimeType.toLowerCase();

  if (mime.includes('pdf') || ext === 'pdf') {
    return { label: 'PDF', bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' };
  }
  if (mime.includes('word') || mime.includes('document') || ext === 'docx' || ext === 'doc') {
    return { label: 'DOCX', bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' };
  }
  if (mime.includes('spreadsheet') || mime.includes('excel') || ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
    return { label: ext.toUpperCase() || 'SHEET', bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' };
  }
  if (mime.includes('presentation') || ext === 'pptx' || ext === 'ppt') {
    return { label: 'PPTX', bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' };
  }
  if (mime.includes('text') || ext === 'txt' || ext === 'md' || ext === 'json') {
    return { label: ext.toUpperCase() || 'TXT', bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30' };
  }
  if (mime.includes('image') || ['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
    return { label: ext.toUpperCase() || 'IMG', bg: 'bg-pink-500/15', text: 'text-pink-400', border: 'border-pink-500/30' };
  }
  return { label: ext.toUpperCase() || 'FILE', bg: 'bg-slate-500/15', text: 'text-slate-400', border: 'border-slate-500/30' };
}
