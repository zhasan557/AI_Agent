'use client';

import { useState, useRef, useCallback, DragEvent } from 'react';
import {
  Upload,
  X,
  FileText,
  FileCode,
  FileJson,
  File,
  Image as ImageIcon,
  AlertCircle,
} from 'lucide-react';

// ===========================
// Supported file types
// ===========================
const SUPPORTED_EXTENSIONS: Record<string, string> = {
  // Text
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.csv': 'text/csv',
  '.tsv': 'text/tab-separated-values',
  '.log': 'text/plain',
  '.rtf': 'text/rtf',
  // Code
  '.js': 'text/javascript',
  '.jsx': 'text/javascript',
  '.ts': 'text/typescript',
  '.tsx': 'text/typescript',
  '.py': 'text/python',
  '.java': 'text/java',
  '.cpp': 'text/cpp',
  '.c': 'text/c',
  '.h': 'text/c',
  '.go': 'text/go',
  '.rs': 'text/rust',
  '.rb': 'text/ruby',
  '.php': 'text/php',
  '.swift': 'text/swift',
  '.kt': 'text/kotlin',
  '.dart': 'text/dart',
  '.r': 'text/r',
  '.sql': 'text/sql',
  '.sh': 'text/shell',
  '.bash': 'text/shell',
  '.zsh': 'text/shell',
  '.ps1': 'text/powershell',
  // Web
  '.html': 'text/html',
  '.htm': 'text/html',
  '.css': 'text/css',
  '.scss': 'text/scss',
  '.less': 'text/less',
  '.svg': 'text/svg',
  '.xml': 'text/xml',
  // Data
  '.json': 'application/json',
  '.yaml': 'text/yaml',
  '.yml': 'text/yaml',
  '.toml': 'text/toml',
  '.ini': 'text/ini',
  '.env': 'text/env',
  '.cfg': 'text/config',
  // Config
  '.gitignore': 'text/plain',
  '.dockerignore': 'text/plain',
  '.editorconfig': 'text/plain',
  '.eslintrc': 'application/json',
  '.prettierrc': 'application/json',
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILE_SIZE_FOR_FULL_READ = 1 * 1024 * 1024; // 1MB — above this, read partial
const MAX_LINES_LARGE_FILE = 2000; // For files >1MB, only read first N lines
const MAX_FILES = 5;

export interface AttachedFile {
  name: string;
  size: number;
  extension: string;
  content: string;
  language: string;
}

interface FileUploadProps {
  attachedFiles: AttachedFile[];
  onFilesChange: (files: AttachedFile[]) => void;
  disabled?: boolean;
}

export default function FileUpload({
  attachedFiles,
  onFilesChange,
  disabled,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileExtension = (name: string): string => {
    const lastDot = name.lastIndexOf('.');
    if (lastDot === -1) return '';
    return name.substring(lastDot).toLowerCase();
  };

  const getLanguage = (ext: string): string => {
    const langMap: Record<string, string> = {
      '.js': 'javascript', '.jsx': 'javascript',
      '.ts': 'typescript', '.tsx': 'typescript',
      '.py': 'python', '.java': 'java',
      '.cpp': 'cpp', '.c': 'c', '.h': 'c',
      '.go': 'go', '.rs': 'rust', '.rb': 'ruby',
      '.php': 'php', '.swift': 'swift', '.kt': 'kotlin',
      '.dart': 'dart', '.r': 'r',
      '.sql': 'sql', '.sh': 'bash', '.bash': 'bash',
      '.html': 'html', '.htm': 'html',
      '.css': 'css', '.scss': 'scss',
      '.json': 'json', '.yaml': 'yaml', '.yml': 'yaml',
      '.xml': 'xml', '.svg': 'xml',
      '.md': 'markdown', '.txt': 'text',
      '.csv': 'csv', '.toml': 'toml',
    };
    return langMap[ext] || 'text';
  };

  const processFile = useCallback(async (file: globalThis.File): Promise<AttachedFile | null> => {
    const ext = getFileExtension(file.name);

    // Check if supported
    if (ext && !SUPPORTED_EXTENSIONS[ext]) {
      setError(`Unsupported file type: ${ext}. Only text and code files are supported.`);
      return null;
    }

    // Check size
    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large: ${file.name} (${formatFileSize(file.size)}). Max: 10MB. For large CSVs, use the ML Training Playground at /train.`);
      return null;
    }

    // For large files, read only the first portion
    if (file.size > MAX_FILE_SIZE_FOR_FULL_READ) {
      return new Promise((resolve) => {
        // Read first 500KB to extract first N lines
        const slice = file.slice(0, 512 * 1024);
        const reader = new FileReader();
        reader.onload = (e) => {
          const partial = e.target?.result as string;
          const lines = partial.split('\n');
          const truncatedLines = lines.slice(0, MAX_LINES_LARGE_FILE);
          const content = truncatedLines.join('\n');
          const totalLinesEstimate = Math.round((file.size / (partial.length || 1)) * lines.length);
          resolve({
            name: file.name,
            size: file.size,
            extension: ext,
            content: content + `\n\n[... FILE TRUNCATED: showing first ${truncatedLines.length} of ~${totalLinesEstimate.toLocaleString()} estimated lines (${formatFileSize(file.size)} total) ...]`,
            language: getLanguage(ext),
          });
        };
        reader.onerror = () => { setError(`Failed to read: ${file.name}`); resolve(null); };
        reader.readAsText(slice);
      });
    }

    // Normal read for small files
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve({
          name: file.name,
          size: file.size,
          extension: ext,
          content,
          language: getLanguage(ext),
        });
      };
      reader.onerror = () => {
        setError(`Failed to read: ${file.name}`);
        resolve(null);
      };
      reader.readAsText(file);
    });
  }, []);

  const handleFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setError(null);

    const totalFiles = attachedFiles.length + fileList.length;
    if (totalFiles > MAX_FILES) {
      setError(`Maximum ${MAX_FILES} files allowed. Currently have ${attachedFiles.length}.`);
      return;
    }

    const newFiles: AttachedFile[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const processed = await processFile(fileList[i]);
      if (processed) {
        // Skip duplicates
        if (!attachedFiles.some((f) => f.name === processed.name)) {
          newFiles.push(processed);
        }
      }
    }

    if (newFiles.length > 0) {
      onFilesChange([...attachedFiles, ...newFiles]);
    }
  }, [attachedFiles, onFilesChange, processFile]);

  const removeFile = useCallback((name: string) => {
    onFilesChange(attachedFiles.filter((f) => f.name !== name));
  }, [attachedFiles, onFilesChange]);

  // Drag handlers
  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (!disabled) handleFiles(e.dataTransfer.files);
  };

  const handleClick = () => {
    if (!disabled) fileInputRef.current?.click();
  };

  return (
    <div>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={Object.keys(SUPPORTED_EXTENSIONS).join(',')}
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
        id="file-upload-input"
      />

      {/* Drop Zone (only shown when dragging or no files) */}
      {isDragging && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(4px)' }}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div
            className="flex flex-col items-center gap-4 p-12 rounded-2xl border-2 border-dashed animate-pulse-slow"
            style={{
              borderColor: '#6366f1',
              background: 'rgba(99, 102, 241, 0.08)',
            }}
          >
            <Upload size={48} className="text-brand-400" />
            <p className="text-lg font-semibold text-brand-300">Drop files here</p>
            <p className="text-sm text-surface-500">
              Text, code, JSON, CSV, and more — up to 10MB
            </p>
          </div>
        </div>
      )}

      {/* Attached Files Preview */}
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachedFiles.map((file) => (
            <FileChip key={file.name} file={file} onRemove={() => removeFile(file.name)} />
          ))}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div
          className="flex items-center gap-2 px-3 py-2 mb-2 rounded-lg text-xs animate-fade-in"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#fca5a5',
          }}
        >
          <AlertCircle size={12} />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-surface-500 hover:text-white"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Invisible drag catcher for the whole input area */}
      <div
        onDragEnter={handleDragEnter}
        className="absolute inset-0 pointer-events-none"
        style={{ pointerEvents: isDragging ? 'auto' : 'none' }}
      />
    </div>
  );
}

// ===========================
// File Chip Component
// ===========================
function FileChip({
  file,
  onRemove,
}: {
  file: AttachedFile;
  onRemove: () => void;
}) {
  const getIcon = (ext: string) => {
    if (['.json', '.yaml', '.yml', '.toml'].includes(ext)) return <FileJson size={12} />;
    if (['.js', '.ts', '.tsx', '.jsx', '.py', '.java', '.cpp', '.go', '.rs', '.rb'].includes(ext))
      return <FileCode size={12} />;
    if (['.md', '.txt', '.csv', '.log'].includes(ext)) return <FileText size={12} />;
    return <File size={12} />;
  };

  const getColor = (ext: string): string => {
    if (['.js', '.jsx'].includes(ext)) return '#eab308';
    if (['.ts', '.tsx'].includes(ext)) return '#3b82f6';
    if (['.py'].includes(ext)) return '#10b981';
    if (['.json'].includes(ext)) return '#f97316';
    if (['.html', '.htm'].includes(ext)) return '#ef4444';
    if (['.css', '.scss'].includes(ext)) return '#8b5cf6';
    if (['.md'].includes(ext)) return '#06b6d4';
    return '#64748b';
  };

  const color = getColor(file.extension);
  const lineCount = file.content.split('\n').length;

  return (
    <div
      className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg text-xs font-medium animate-fade-in group"
      style={{
        background: `rgba(${hexToRgb(color)}, 0.1)`,
        border: `1px solid rgba(${hexToRgb(color)}, 0.25)`,
        color,
      }}
    >
      {getIcon(file.extension)}
      <span className="max-w-[120px] truncate">{file.name}</span>
      <span
        className="text-[9px] opacity-60"
        title={`${lineCount} lines · ${formatFileSize(file.size)}`}
      >
        {lineCount}L
      </span>
      <button
        onClick={onRemove}
        className="p-0.5 rounded opacity-50 hover:opacity-100 transition-opacity"
        title="Remove file"
      >
        <X size={11} />
      </button>
    </div>
  );
}

// ===========================
// Utility: Format file content for LLM
// ===========================
export function formatFilesForPrompt(files: AttachedFile[]): string {
  if (files.length === 0) return '';

  let context = '\n\n📎 **ATTACHED FILES:**\n';

  files.forEach((file, i) => {
    const lineCount = file.content.split('\n').length;
    context += `\n--- File ${i + 1}: \`${file.name}\` (${file.language}, ${lineCount} lines, ${formatFileSize(file.size)}) ---\n`;
    context += '```' + file.language + '\n';

    // Trim very long files to avoid token overflow
    if (file.content.length > 50000) {
      const truncated = file.content.substring(0, 50000);
      context += truncated;
      context += `\n\n... [TRUNCATED — file has ${file.content.length.toLocaleString()} characters, showing first 50,000] ...\n`;
    } else {
      context += file.content;
    }

    context += '\n```\n';
  });

  context += '\n---\n';
  context += 'The user has attached the above file(s). Analyze them in the context of their message. ';
  context += 'Reference specific lines, functions, or sections when relevant.\n';

  return context;
}

// ===========================
// Helpers
// ===========================
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '99, 102, 241';
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}
