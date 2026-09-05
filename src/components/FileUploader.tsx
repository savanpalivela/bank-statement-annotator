import React, { useRef, useState } from 'react';
import { UploadCloud, ArrowRight, Files, XCircle, CheckCircle2 } from 'lucide-react';
import { parseMultipleExcelFiles } from '../utils/excelParser';
import type { MultiFileParseResult } from '../utils/excelParser';

interface FileUploaderProps {
  onMultiFilesParsed: (result: MultiFileParseResult) => void;
  onLoadSample: () => void;
  existingBaseColumns?: string[];
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onMultiFilesParsed,
  onLoadSample,
  existingBaseColumns,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rejectedInfo, setRejectedInfo] = useState<{ fileName: string; reason: string }[]>([]);
  const [acceptedInfo, setAcceptedInfo] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const validExts = ['.xlsx', '.xls'];
    const selectedFiles: File[] = [];

    Array.from(files).forEach((file) => {
      if (validExts.some((ext) => file.name.toLowerCase().endsWith(ext))) {
        selectedFiles.push(file);
      }
    });

    if (selectedFiles.length === 0) {
      setRejectedInfo([
        { fileName: 'Uploaded Files', reason: 'Invalid file format. Please upload .xlsx or .xls Excel files.' },
      ]);
      return;
    }

    setLoading(true);
    setRejectedInfo([]);
    setAcceptedInfo([]);

    try {
      const parseResult = await parseMultipleExcelFiles(selectedFiles, existingBaseColumns);

      setAcceptedInfo(parseResult.acceptedResults.map((r) => r.fileName));
      setRejectedInfo(parseResult.rejectedFiles);

      if (parseResult.acceptedResults.length > 0) {
        onMultiFilesParsed(parseResult);
      }
    } catch (err: any) {
      setRejectedInfo([{ fileName: 'Parsing Error', reason: err.message || 'Failed to process files.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="w-full space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 group ${
          isDragging
            ? 'border-indigo-400 bg-indigo-950/30 scale-[1.01]'
            : 'border-slate-700 hover:border-slate-500 bg-slate-800/40 hover:bg-slate-800/70'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept=".xlsx, .xls"
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center max-w-md mx-auto">
          <div
            className={`p-4 rounded-full mb-4 transition-transform group-hover:scale-110 duration-200 ${
              isDragging ? 'bg-indigo-600 text-white' : 'bg-slate-700/60 text-indigo-400 group-hover:bg-indigo-600/20'
            }`}
          >
            {loading ? (
              <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Files className="w-8 h-8" />
            )}
          </div>

          <h3 className="text-base font-semibold text-slate-100 mb-1">
            {loading ? 'Parsing Excel Statements...' : 'Drop your bank Excel sheet(s) here'}
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Upload single or <span className="text-indigo-300 font-medium">multiple files</span> of identical column format (.XLSX / .XLS)
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="text-xs bg-indigo-600/20 text-indigo-300 px-3 py-1 rounded-lg border border-indigo-500/30 font-medium flex items-center gap-1.5">
              <UploadCloud className="w-3.5 h-3.5" />
              Select File(s)
            </span>
            <span className="text-xs text-slate-500">or</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLoadSample();
              }}
              className="text-xs text-slate-400 hover:text-white underline flex items-center gap-1"
            >
              Load Demo Sample <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Notifications for Accepted & Rejected Files */}
      {acceptedInfo.length > 0 && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs space-y-1">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Accepted ({acceptedInfo.length} file{acceptedInfo.length > 1 ? 's' : ''}):</span>
          </div>
          <ul className="list-disc list-inside text-[11px] text-emerald-200/90 pl-1 space-y-0.5">
            {acceptedInfo.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      {rejectedInfo.length > 0 && (
        <div className="p-3.5 bg-rose-950/60 border border-rose-500/40 rounded-xl text-rose-300 text-xs space-y-2">
          <div className="flex items-center gap-2 font-semibold text-rose-200">
            <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>Rejected File(s) - Format Mismatch / Error:</span>
          </div>
          <div className="space-y-1.5 pl-1">
            {rejectedInfo.map((rej, idx) => (
              <div key={idx} className="bg-slate-900/80 p-2 rounded-lg border border-rose-900/50 text-[11px]">
                <strong className="text-rose-300 font-mono">{rej.fileName}:</strong>{' '}
                <span className="text-rose-200/80">{rej.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
