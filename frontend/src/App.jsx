import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Upload,
  FileText,
  CheckCircle2,
  HardDrive,
  RefreshCw,
  X,
  Layers,
  Sparkles,
  Inbox,
  AlertCircle
} from 'lucide-react';
import { api, getStoredUsername, clearAuthSession } from './api';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { UploadModal } from './components/UploadModal';
import { DocumentDetailModal } from './components/DocumentDetailModal';
import { DocumentCard } from './components/DocumentCard';
import { SearchResultCard } from './components/SearchResultCard';
import { formatBytes } from './utils';

export default function App() {
  const [username, setUsername] = useState(getStoredUsername());
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);

  // Load documents
  const loadDocuments = useCallback(async (silent = false) => {
    if (!username) return;
    if (!silent) setRefreshing(true);
    try {
      const data = await api.listDocuments();
      setDocuments(data);
      setError(null);
    } catch (err) {
      if (err.message.includes('Session expired')) {
        setUsername(null);
      } else {
        setError(err.message);
      }
    } finally {
      if (!silent) setRefreshing(false);
      setLoading(false);
    }
  }, [username]);

  // Initial load
  useEffect(() => {
    if (username) {
      setLoading(true);
      loadDocuments();
    }
  }, [username, loadDocuments]);

  // Unauthorized listener
  useEffect(() => {
    function handleUnauthorized() {
      setUsername(null);
      setDocuments([]);
      setSearchResults(null);
    }
    window.addEventListener('docvault:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('docvault:unauthorized', handleUnauthorized);
  }, []);

  // Auto-polling when documents are in PENDING or PROCESSING status
  useEffect(() => {
    if (!username) return;
    const hasPendingOrProcessing = documents.some(
      (d) => d.status === 'PENDING' || d.status === 'PROCESSING'
    );

    if (!hasPendingOrProcessing) return;

    const interval = setInterval(() => {
      loadDocuments(true);
    }, 2500);

    return () => clearInterval(interval);
  }, [documents, username, loadDocuments]);

  // Execute Search
  async function handleSearch(query) {
    const q = query !== undefined ? query : searchQuery;
    if (!q || !q.trim()) {
      setSearchResults(null);
      return;
    }

    setIsSearching(true);
    try {
      const result = await api.searchDocuments(q.trim());
      setSearchResults(result);
      setError(null);
    } catch (err) {
      setError(err.message || 'Search failed');
    } finally {
      setIsSearching(false);
    }
  }

  function clearSearch() {
    setSearchQuery('');
    setSearchResults(null);
  }

  // Document actions
  async function handleDownload(id, filename) {
    try {
      await api.downloadDocument(id, filename);
    } catch (err) {
      setError('Download failed: ' + err.message);
    }
  }

  async function handleDelete(id) {
    try {
      await api.deleteDocument(id);
      // Remove locally
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      if (searchResults) {
        setSearchResults((prev) => ({
          ...prev,
          items: prev.items.filter((i) => i.id !== id),
          totalHits: Math.max(0, prev.totalHits - 1),
        }));
      }
    } catch (err) {
      setError('Delete failed: ' + err.message);
    }
  }

  async function handleReindex(id) {
    try {
      await api.reindexDocument(id);
      loadDocuments(true);
    } catch (err) {
      setError('Reindex failed: ' + err.message);
    }
  }

  function handleLogout() {
    api.logout();
    setUsername(null);
    setDocuments([]);
    setSearchResults(null);
  }

  // Summary statistics
  const totalDocs = documents.length;
  const indexedDocs = documents.filter((d) => d.status === 'INDEXED').length;
  const processingDocs = documents.filter(
    (d) => d.status === 'PROCESSING' || d.status === 'PENDING'
  ).length;
  const totalStorage = documents.reduce((sum, d) => sum + (d.sizeBytes || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Navigation */}
      <Navbar
        username={username}
        onOpenUpload={() => setIsUploadOpen(true)}
        onLogout={handleLogout}
        onRefresh={() => loadDocuments()}
        isRefreshing={refreshing}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!username ? (
          <AuthModal onAuthSuccess={() => setUsername(getStoredUsername())} />
        ) : (
          <div className="space-y-8">
            {/* Error Banner */}
            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="p-1 text-slate-400 hover:text-white rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Hero & Search Banner */}
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-900/30 via-slate-900 to-purple-900/20 border border-slate-800 p-6 sm:p-8 shadow-2xl">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold mb-3">
                  <Sparkles className="w-3.5 h-3.5" />
                  Elasticsearch 8 & Apache Tika Powered
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Instant Full-Text Search
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  Search across extracted document content, titles, and filenames with highlighted snippets.
                </p>
              </div>

              {/* Search Bar Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSearch();
                }}
                className="mt-6 flex items-center gap-2 max-w-2xl"
              >
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search inside PDF, DOCX, TXT content, titles..."
                    className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition shadow-inner"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-white rounded transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isSearching}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition shadow-lg shadow-indigo-600/25 active:scale-95 disabled:opacity-50 shrink-0 flex items-center gap-2"
                >
                  {isSearching ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  <span>Search</span>
                </button>
              </form>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span>Total Documents</span>
                  <FileText className="w-4 h-4 text-indigo-400" />
                </div>
                <p className="text-xl font-bold text-white">{totalDocs}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span>Indexed for Search</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-xl font-bold text-emerald-400">{indexedDocs}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span>In Processing</span>
                  <RefreshCw className={`w-4 h-4 text-amber-400 ${processingDocs > 0 ? 'animate-spin' : ''}`} />
                </div>
                <p className="text-xl font-bold text-amber-400">{processingDocs}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span>Storage Used</span>
                  <HardDrive className="w-4 h-4 text-purple-400" />
                </div>
                <p className="text-xl font-bold text-white">{formatBytes(totalStorage)}</p>
              </div>
            </div>

            {/* Content Section: Search Results OR Document Grid */}
            {searchResults ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white tracking-tight">Search Results</h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
                      {searchResults.totalHits} match{searchResults.totalHits === 1 ? '' : 'es'}
                    </span>
                  </div>
                  <button
                    onClick={clearSearch}
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition"
                  >
                    Clear Search & View All
                  </button>
                </div>

                {searchResults.items.length === 0 ? (
                  <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800">
                    <Inbox className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <h3 className="font-semibold text-white text-base">No matches found</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      No documents matched your query. Try searching for different keywords or checking for spelling.
                    </p>
                    <button
                      onClick={clearSearch}
                      className="mt-4 px-4 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition"
                    >
                      Clear Search
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {searchResults.items.map((hit) => (
                      <SearchResultCard
                        key={hit.id}
                        hit={hit}
                        onSelect={(h) => {
                          const original = documents.find((d) => d.id === h.id) || h;
                          setSelectedDoc(original);
                        }}
                        onDownload={handleDownload}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white tracking-tight">Your Documents</h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                      {totalDocs}
                    </span>
                  </div>
                  <button
                    onClick={() => setIsUploadOpen(true)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Document</span>
                  </button>
                </div>

                {loading ? (
                  <div className="text-center py-20">
                    <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-3" />
                    <p className="text-xs text-slate-400">Loading your documents...</p>
                  </div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800">
                    <Inbox className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <h3 className="font-semibold text-white text-base">No documents yet</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Upload your first document (PDF, Word, Excel, Text) to have its text automatically extracted and indexed for full-text search.
                    </p>
                    <button
                      onClick={() => setIsUploadOpen(true)}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition shadow-lg shadow-indigo-600/25"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Document</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {documents.map((doc) => (
                      <DocumentCard
                        key={doc.id}
                        doc={doc}
                        onSelect={(d) => setSelectedDoc(d)}
                        onDownload={handleDownload}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={() => {
          loadDocuments(true);
        }}
      />

      <DocumentDetailModal
        doc={selectedDoc}
        isOpen={Boolean(selectedDoc)}
        onClose={() => setSelectedDoc(null)}
        onDownload={handleDownload}
        onReindex={handleReindex}
        onDelete={handleDelete}
      />
    </div>
  );
}
