import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Upload,
  FileText,
  CheckCircle2,
  HardDrive,
  RefreshCw,
  X,
  Sparkles,
  Inbox,
  AlertCircle,
  Folder,
  FolderOpen,
  Tag,
  Plus,
  Trash2,
  Check,
  CheckSquare,
  Square,
  ChevronRight,
  Layers
} from 'lucide-react';
import { api, getStoredUsername, clearAuthSession } from './api';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { UploadModal } from './components/UploadModal';
import { DocumentDetailModal } from './components/DocumentDetailModal';
import { DocumentCard } from './components/DocumentCard';
import { SearchResultCard } from './components/SearchResultCard';
import { formatBytes } from './utils';

const COLOR_PRESETS = ['#6366f1', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4', '#ef4444'];

function getEffectivePathPrefix(folder, subpath) {
  if (!folder) return null;
  if (folder.pathPrefix === '__WEB_UPLOADS__') return '__WEB_UPLOADS__';
  if (!subpath) return folder.pathPrefix;
  const cleanBase = folder.pathPrefix.replace(/\/+$/, '');
  const cleanSub = subpath.replace(/^\/+|\/+$/g, '');
  return `${cleanBase}/${cleanSub}`;
}

export default function App() {
  const [username, setUsername] = useState(getStoredUsername());
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [selectedSubpath, setSelectedSubpath] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Multi-selection
  const [selectedDocIds, setSelectedDocIds] = useState(new Set());
  const [isBulkOperating, setIsBulkOperating] = useState(false);
  const [bulkCategoryTarget, setBulkCategoryTarget] = useState('');

  // Category creation
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#6366f1');
  const [isSubmittingCat, setIsSubmittingCat] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);

  // Load all data
  const loadData = useCallback(async (silent = false) => {
    if (!username) return;
    if (!silent) setRefreshing(true);
    try {
      const effectivePrefix = getEffectivePathPrefix(selectedFolder, selectedSubpath);
      const [docs, cats, flds] = await Promise.all([
        api.listDocuments(selectedCategory, effectivePrefix),
        api.getCategories(),
        api.getFolders()
      ]);
      setDocuments(docs || []);
      setCategories(cats || []);
      setFolders(flds || []);
      setError(null);
    } catch (err) {
      if (err.message && err.message.includes('Session expired')) {
        setUsername(null);
      } else {
        setError(err.message || 'Failed to load data');
      }
    } finally {
      if (!silent) setRefreshing(false);
      setLoading(false);
    }
  }, [username, selectedCategory, selectedFolder, selectedSubpath]);

  // Initial load
  useEffect(() => {
    if (username) {
      setLoading(true);
      loadData();
    }
  }, [username, loadData]);

  // Reset selection on filter change
  useEffect(() => {
    setSelectedDocIds(new Set());
  }, [selectedCategory, selectedFolder, selectedSubpath]);

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
      loadData(true);
    }, 2500);

    return () => clearInterval(interval);
  }, [documents, username, loadData]);

  // Compute immediate subfolders for current folder view
  const currentBasePrefix = getEffectivePathPrefix(selectedFolder, selectedSubpath);
  const subfolders = useMemo(() => {
    if (!selectedFolder || selectedFolder.pathPrefix === '__WEB_UPLOADS__' || !currentBasePrefix) {
      return [];
    }
    const prefixWithSlash = currentBasePrefix.endsWith('/') ? currentBasePrefix : currentBasePrefix + '/';
    const folderCounts = new Map();

    for (const doc of documents) {
      if (doc.sourcePath && doc.sourcePath.startsWith(prefixWithSlash)) {
        const remainder = doc.sourcePath.substring(prefixWithSlash.length);
        const slashIdx = remainder.indexOf('/');
        if (slashIdx > 0) {
          const subName = remainder.substring(0, slashIdx);
          folderCounts.set(subName, (folderCounts.get(subName) || 0) + 1);
        }
      }
    }

    return Array.from(folderCounts.entries()).map(([name, count]) => ({
      name,
      count,
      fullSubpath: selectedSubpath ? `${selectedSubpath}/${name}` : name
    }));
  }, [selectedFolder, selectedSubpath, currentBasePrefix, documents]);

  // Search
  async function handleSearch(query) {
    const q = query !== undefined ? query : searchQuery;
    if (!q || !q.trim()) {
      setSearchResults(null);
      return;
    }

    setIsSearching(true);
    try {
      const result = await api.searchDocuments(q.trim(), selectedCategory);
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

  // Selection handlers
  function handleToggleSelect(id) {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSelectAll() {
    const displayedDocs = searchResults ? searchResults.items : documents;
    if (displayedDocs.length > 0 && displayedDocs.every((d) => selectedDocIds.has(d.id))) {
      setSelectedDocIds(new Set());
    } else {
      setSelectedDocIds(new Set(displayedDocs.map((d) => d.id)));
    }
  }

  function handleClearSelection() {
    setSelectedDocIds(new Set());
  }

  // Bulk actions
  async function handleBulkCategory(catId) {
    if (selectedDocIds.size === 0) return;
    setIsBulkOperating(true);
    try {
      await api.bulkSetCategory(Array.from(selectedDocIds), catId === 'NONE' ? null : catId);
      setSelectedDocIds(new Set());
      setBulkCategoryTarget('');
      await loadData(true);
    } catch (err) {
      setError('Bulk category update failed: ' + err.message);
    } finally {
      setIsBulkOperating(false);
    }
  }

  async function handleBulkDelete() {
    if (selectedDocIds.size === 0) return;
    if (!confirm(`Permanently delete ${selectedDocIds.size} selected document(s)?`)) return;
    setIsBulkOperating(true);
    try {
      await api.bulkDelete(Array.from(selectedDocIds));
      setSelectedDocIds(new Set());
      await loadData(true);
    } catch (err) {
      setError('Bulk delete failed: ' + err.message);
    } finally {
      setIsBulkOperating(false);
    }
  }

  // Single document category update
  async function handleUpdateCategory(docId, catId) {
    try {
      const updated = await api.updateDocumentCategory(docId, catId);
      setDocuments((prev) => prev.map((d) => (d.id === docId ? { ...d, ...updated } : d)));
      if (selectedDoc && selectedDoc.id === docId) {
        setSelectedDoc((prev) => ({ ...prev, ...updated }));
      }
      const updatedCats = await api.getCategories();
      setCategories(updatedCats);
    } catch (err) {
      setError('Category update failed: ' + err.message);
    }
  }

  // Category management
  async function handleCreateCategory(e) {
    e.preventDefault();
    if (!newCategoryName.trim() || isSubmittingCat) return;
    setIsSubmittingCat(true);
    try {
      const created = await api.createCategory(newCategoryName.trim(), newCategoryColor);
      setCategories((prev) => [...prev, created]);
      setNewCategoryName('');
      setIsAddingCategory(false);
    } catch (err) {
      setError('Failed to create category: ' + err.message);
    } finally {
      setIsSubmittingCat(false);
    }
  }

  async function handleDeleteCategory(catId) {
    try {
      await api.deleteCategory(catId);
      if (selectedCategory === catId) {
        setSelectedCategory(null);
      }
      await loadData(true);
    } catch (err) {
      setError('Failed to delete category: ' + err.message);
    }
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
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      setSelectedDocIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      if (searchResults) {
        setSearchResults((prev) => ({
          ...prev,
          items: prev.items.filter((i) => i.id !== id),
          totalHits: Math.max(0, prev.totalHits - 1),
        }));
      }
      const [updatedCats, updatedFlds] = await Promise.all([
        api.getCategories(),
        api.getFolders()
      ]);
      setCategories(updatedCats);
      setFolders(updatedFlds);
    } catch (err) {
      setError('Delete failed: ' + err.message);
    }
  }

  async function handleReindex(id) {
    try {
      await api.reindexDocument(id);
      loadData(true);
    } catch (err) {
      setError('Reindex failed: ' + err.message);
    }
  }

  function handleLogout() {
    api.logout();
    setUsername(null);
    setDocuments([]);
    setSearchResults(null);
    setSelectedCategory(null);
    setSelectedFolder(null);
    setSelectedSubpath(null);
    setSelectedDocIds(new Set());
  }

  // Summary statistics
  const totalDocs = documents.length;
  const indexedDocs = documents.filter((d) => d.status === 'INDEXED').length;
  const processingDocs = documents.filter(
    (d) => d.status === 'PROCESSING' || d.status === 'PENDING'
  ).length;
  const totalStorage = documents.reduce((sum, d) => sum + (d.sizeBytes || 0), 0);

  const selectedCategoryObj = categories.find((c) => c.id === selectedCategory);
  const isAllSelected = documents.length > 0 && documents.every((d) => selectedDocIds.has(d.id));

  // Breadcrumb path segments
  const subpathSegments = selectedSubpath ? selectedSubpath.split('/').filter(Boolean) : [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white font-sans">
      {/* Navigation */}
      <Navbar
        username={username}
        onOpenUpload={() => setIsUploadOpen(true)}
        onLogout={handleLogout}
        onRefresh={() => loadData()}
        isRefreshing={refreshing}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!username ? (
          <AuthModal onAuthSuccess={() => setUsername(getStoredUsername())} />
        ) : (
          <div className="space-y-6">
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
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-900/30 via-slate-900 to-purple-900/20 border border-slate-800 p-6 shadow-xl">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  Elasticsearch 8 & Apache Tika Powered
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Instant Full-Text Search
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Search across extracted document content, titles, and filenames with highlighted snippets.
                </p>
              </div>

              {/* Search Bar Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSearch();
                }}
                className="mt-4 flex items-center gap-2 max-w-2xl"
              >
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      selectedCategoryObj
                        ? `Search within ${selectedCategoryObj.name}...`
                        : "Search inside PDF, DOCX, TXT content, titles..."
                    }
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span>Total Documents</span>
                  <FileText className="w-4 h-4 text-indigo-400" />
                </div>
                <p className="text-xl font-bold text-white">{totalDocs}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span>Indexed for Search</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-xl font-bold text-emerald-400">{indexedDocs}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span>In Processing</span>
                  <RefreshCw className={`w-4 h-4 text-amber-400 ${processingDocs > 0 ? 'animate-spin' : ''}`} />
                </div>
                <p className="text-xl font-bold text-amber-400">{processingDocs}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span>Storage Used</span>
                  <HardDrive className="w-4 h-4 text-purple-400" />
                </div>
                <p className="text-xl font-bold text-white">{formatBytes(totalStorage)}</p>
              </div>
            </div>

            {/* Layout: Sidebar + Document Workspace */}
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Left Sidebar */}
              <aside className="w-full md:w-64 shrink-0 bg-slate-900/70 border border-slate-800/80 rounded-2xl p-4 space-y-6 select-none">
                {/* All Documents */}
                <div>
                  <button
                    onClick={() => {
                      setSelectedFolder(null);
                      setSelectedSubpath(null);
                      setSelectedCategory(null);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                      selectedFolder === null && selectedCategory === null
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      <span>All Documents</span>
                    </div>
                    <span className="text-[11px] bg-slate-800 px-2 py-0.5 rounded-md text-slate-400 font-mono">
                      {totalDocs}
                    </span>
                  </button>
                </div>

                {/* Folders Section */}
                <div>
                  <div className="flex items-center justify-between px-2 mb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Folder className="w-3.5 h-3.5 text-slate-500" />
                      Folders
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {folders.length}
                    </span>
                  </div>

                  <div className="space-y-1">
                    {folders.length === 0 ? (
                      <p className="px-2 py-1 text-xs text-slate-500 italic">No folders yet</p>
                    ) : (
                      folders.map((folder) => {
                        const isFolderSelected = selectedFolder?.pathPrefix === folder.pathPrefix;
                        return (
                          <button
                            key={folder.pathPrefix}
                            onClick={() => {
                              if (isFolderSelected) {
                                setSelectedFolder(null);
                                setSelectedSubpath(null);
                              } else {
                                setSelectedFolder(folder);
                                setSelectedSubpath(null);
                              }
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                              isFolderSelected
                                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {isFolderSelected ? (
                                <FolderOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                              ) : (
                                <Folder className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              )}
                              <span className="truncate">{folder.name}</span>
                            </div>
                            <span className="text-[10px] bg-slate-800/80 px-1.5 py-0.5 rounded text-slate-400 font-mono ml-2 shrink-0">
                              {folder.documentCount ?? folder.count ?? 0}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Categories Section */}
                <div>
                  <div className="flex items-center justify-between px-2 mb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-slate-500" />
                      Categories
                    </span>
                    <button
                      onClick={() => setIsAddingCategory(!isAddingCategory)}
                      title="Add Category"
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Inline Category Form */}
                  {isAddingCategory && (
                    <form onSubmit={handleCreateCategory} className="p-2.5 mb-2 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                      <input
                        type="text"
                        placeholder="Category name..."
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        autoFocus
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          {COLOR_PRESETS.slice(0, 6).map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setNewCategoryColor(c)}
                              className={`w-3.5 h-3.5 rounded-full transition-transform ${
                                newCategoryColor === c
                                  ? 'scale-125 ring-2 ring-white ring-offset-1 ring-offset-slate-950'
                                  : 'opacity-70 hover:opacity-100'
                              }`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingCategory(false);
                              setNewCategoryName('');
                            }}
                            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="submit"
                            disabled={!newCategoryName.trim() || isSubmittingCat}
                            className="p-1 text-indigo-400 hover:text-indigo-300 rounded hover:bg-indigo-950/40 disabled:opacity-40"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </form>
                  )}

                  <div className="space-y-1">
                    {categories.length === 0 ? (
                      <p className="px-2 py-1 text-xs text-slate-500 italic">No categories yet</p>
                    ) : (
                      categories.map((cat) => {
                        const isCatSelected = selectedCategory === cat.id;
                        return (
                          <div
                            key={cat.id}
                            className={`group w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                              isCatSelected
                                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                            }`}
                          >
                            <button
                              onClick={() => setSelectedCategory(isCatSelected ? null : cat.id)}
                              className="flex-1 flex items-center gap-2 truncate text-left"
                            >
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: cat.color || '#6366f1' }}
                              />
                              <span className="truncate">{cat.name}</span>
                            </button>
                            <div className="flex items-center gap-1 ml-2 shrink-0">
                              <span className="text-[10px] bg-slate-800/80 px-1.5 py-0.5 rounded text-slate-400 font-mono">
                                {cat.documentCount || 0}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`Delete category "${cat.name}"? Documents will become uncategorized.`)) {
                                    handleDeleteCategory(cat.id);
                                  }
                                }}
                                title="Delete category"
                                className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-rose-400 transition-opacity"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </aside>

              {/* Document Workspace Area */}
              <div className="flex-1 min-w-0 space-y-4">
                {/* Search Results Mode */}
                {searchResults ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-white tracking-tight">Search Results</h2>
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
                          No documents matched your query. Try different keywords or clearing active filters.
                        </p>
                        <button
                          onClick={clearSearch}
                          className="mt-4 px-4 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition"
                        >
                          Clear Search
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                  /* Standard Documents Grid Mode */
                  <div className="space-y-4">
                    {/* Header: Title / Breadcrumbs + Upload button */}
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      {/* Breadcrumbs */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 flex-wrap">
                        <button
                          onClick={() => {
                            setSelectedFolder(null);
                            setSelectedSubpath(null);
                          }}
                          className={`hover:text-white transition ${
                            !selectedFolder ? 'font-semibold text-white' : ''
                          }`}
                        >
                          All Documents
                        </button>

                        {selectedFolder && (
                          <>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                            <button
                              onClick={() => setSelectedSubpath(null)}
                              className={`hover:text-white transition ${
                                !selectedSubpath ? 'font-semibold text-white' : ''
                              }`}
                            >
                              {selectedFolder.name}
                            </button>
                          </>
                        )}

                        {subpathSegments.map((segment, idx) => {
                          const partialPath = subpathSegments.slice(0, idx + 1).join('/');
                          const isLast = idx === subpathSegments.length - 1;
                          return (
                            <React.Fragment key={partialPath}>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                              <button
                                onClick={() => setSelectedSubpath(partialPath)}
                                className={`hover:text-white transition ${
                                  isLast ? 'font-semibold text-white' : ''
                                }`}
                              >
                                {segment}
                              </button>
                            </React.Fragment>
                          );
                        })}

                        {/* Active Category Filter Pill */}
                        {selectedCategoryObj && (
                          <div
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] ml-2"
                            style={{
                              backgroundColor: `${selectedCategoryObj.color || '#6366f1'}20`,
                              color: selectedCategoryObj.color || '#a5b4fc',
                              border: `1px solid ${selectedCategoryObj.color || '#6366f1'}40`
                            }}
                          >
                            <span>Category: {selectedCategoryObj.name}</span>
                            <button
                              onClick={() => setSelectedCategory(null)}
                              className="hover:opacity-100 opacity-70 p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Right Action: Upload Button */}
                      <button
                        onClick={() => setIsUploadOpen(true)}
                        className="text-xs px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center gap-1.5 transition shadow-lg shadow-indigo-600/20 shrink-0"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Document</span>
                      </button>
                    </div>

                    {/* Subfolders Grid (when inside a folder with subdirectories) */}
                    {subfolders.length > 0 && (
                      <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-2">
                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          Subfolders
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {subfolders.map((sub) => (
                            <button
                              key={sub.fullSubpath}
                              onClick={() => setSelectedSubpath(sub.fullSubpath)}
                              className="flex items-center justify-between p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs transition text-left group"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Folder className="w-4 h-4 text-indigo-400 shrink-0 group-hover:text-indigo-300" />
                                <span className="text-white truncate font-medium">{sub.name}</span>
                              </div>
                              <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-mono ml-1 shrink-0">
                                {sub.count}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Bulk Selection Toolbar */}
                    <div className="px-4 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between text-xs flex-wrap gap-2 select-none">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleSelectAll}
                          className="flex items-center gap-1.5 text-slate-300 hover:text-white transition"
                        >
                          {isAllSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-500" />
                          )}
                          <span>{isAllSelected ? 'Deselect All' : 'Select All'}</span>
                        </button>

                        {selectedDocIds.size > 0 && (
                          <span className="font-mono text-indigo-400 font-medium">
                            {selectedDocIds.size} of {documents.length} selected
                          </span>
                        )}
                      </div>

                      {selectedDocIds.size > 0 && (
                        <div className="flex items-center gap-2">
                          {/* Bulk Category Dropdown */}
                          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
                            <Tag className="w-3.5 h-3.5 text-slate-400" />
                            <select
                              value={bulkCategoryTarget}
                              disabled={isBulkOperating}
                              onChange={(e) => handleBulkCategory(e.target.value)}
                              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer disabled:opacity-50"
                            >
                              <option value="" disabled>
                                Assign Category...
                              </option>
                              <option value="NONE">(Clear Category)</option>
                              {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Bulk Delete Button */}
                          <button
                            onClick={handleBulkDelete}
                            disabled={isBulkOperating}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-900/50 transition disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>

                          {/* Clear Selection */}
                          <button
                            onClick={handleClearSelection}
                            disabled={isBulkOperating}
                            title="Clear selection"
                            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>

                          {isBulkOperating && (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Documents List / Cards */}
                    {loading ? (
                      <div className="text-center py-20">
                        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-3" />
                        <p className="text-xs text-slate-400">Loading documents...</p>
                      </div>
                    ) : documents.length === 0 ? (
                      <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800">
                        <Inbox className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <h3 className="font-semibold text-white text-base">No documents in this view</h3>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                          {selectedFolder || selectedCategory
                            ? 'No documents matched the active folder or category filter.'
                            : 'Upload your first document or sync a folder from the desktop daemon.'}
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {documents.map((doc) => (
                          <DocumentCard
                            key={doc.id}
                            doc={doc}
                            isSelected={selectedDocIds.has(doc.id)}
                            onToggleSelect={handleToggleSelect}
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
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={() => {
          loadData(true);
        }}
      />

      <DocumentDetailModal
        doc={selectedDoc}
        categories={categories}
        isOpen={Boolean(selectedDoc)}
        onClose={() => setSelectedDoc(null)}
        onDownload={handleDownload}
        onReindex={handleReindex}
        onDelete={handleDelete}
        onUpdateCategory={handleUpdateCategory}
      />
    </div>
  );
}
