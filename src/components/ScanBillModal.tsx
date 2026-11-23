import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  Camera,
  CheckCircle2,
  FileText,
  Loader2,
  RotateCcw,
  ScanLine,
  Upload,
  X,
} from 'lucide-react';
import { createWorker } from 'tesseract.js';
import { parseBillText, type ParsedBillFields } from '../utils/billParser';
import {
  OCR_TARGET_MAX_WIDTH,
  createSampleReceiptBlob,
  preprocessImageForOCR,
} from '../utils/imagePreprocess';

interface ScanBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveBill: (fields: ParsedBillFields, ensureBillColumns: boolean) => void;
}

const EMPTY_FIELDS: ParsedBillFields = {
  vendor: '',
  date: '',
  invoiceNumber: '',
  total: '',
  tax: '',
};

function formatStatusLabel(status: string): string {
  switch (status) {
    case 'loading tesseract core':
      return 'Loading OCR engine...';
    case 'initializing tesseract':
      return 'Initializing OCR...';
    case 'loading language traineddata':
      return 'Loading English language data...';
    case 'initializing api':
      return 'Preparing scanner...';
    case 'recognizing text':
      return 'Reading text from image...';
    default:
      return status ? `${status.charAt(0).toUpperCase()}${status.slice(1)}...` : 'Scanning...';
  }
}

export function ScanBillModal({ isOpen, onClose, onSaveBill }: ScanBillModalProps) {
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const activeRunIdRef = useRef(0);

  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusLabel, setStatusLabel] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [previewUrl, setPreviewUrl] = useState('');
  const [dimensionSummary, setDimensionSummary] = useState('');
  const [rawText, setRawText] = useState('');
  const [fields, setFields] = useState<ParsedBillFields>(EMPTY_FIELDS);
  const [hasResult, setHasResult] = useState(false);
  const [ensureBillColumns, setEnsureBillColumns] = useState(true);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      activeRunIdRef.current += 1;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const resetScanner = () => {
    activeRunIdRef.current += 1;
    setIsScanning(false);
    setProgress(0);
    setStatusLabel('');
    setErrorMsg('');
    setPreviewUrl('');
    setDimensionSummary('');
    setRawText('');
    setFields(EMPTY_FIELDS);
    setHasResult(false);
    setFormError('');
  };

  const runOcrOnBlob = async (fileBlob: Blob) => {
    const runId = ++activeRunIdRef.current;
    setIsScanning(true);
    setHasResult(false);
    setErrorMsg('');
    setFormError('');
    setProgress(5);
    setStatusLabel('Resizing & converting to grayscale...');

    let worker: Awaited<ReturnType<typeof createWorker>> | null = null;

    try {
      const processed = await preprocessImageForOCR(fileBlob, OCR_TARGET_MAX_WIDTH);
      if (activeRunIdRef.current !== runId) return;

      setPreviewUrl(processed.previewUrl);
      setDimensionSummary(
        `${processed.originalWidth}×${processed.originalHeight} → ${processed.processedWidth}×${processed.processedHeight} · Grayscale`
      );
      setProgress(15);
      setStatusLabel('Starting Tesseract OCR...');

      worker = await createWorker('eng', 1, {
        logger: (msg) => {
          if (activeRunIdRef.current !== runId) return;
          setStatusLabel(formatStatusLabel(msg.status));
          if (msg.status === 'recognizing text') {
            setProgress(Math.min(99, Math.max(25, Math.round(25 + msg.progress * 74))));
          } else if (typeof msg.progress === 'number') {
            setProgress((prev) => Math.max(prev, Math.min(24, Math.round(15 + msg.progress * 10))));
          }
        },
      });

      if (activeRunIdRef.current !== runId) {
        await worker.terminate();
        return;
      }

      const result = await worker.recognize(processed.blob);
      if (activeRunIdRef.current !== runId) return;

      const text = result.data.text ?? '';
      const detected = parseBillText(text);

      setRawText(text);
      setFields(detected);
      setProgress(100);
      setStatusLabel('Scan complete');
      setHasResult(true);
    } catch (err) {
      if (activeRunIdRef.current !== runId) return;
      const msg = err instanceof Error ? err.message : 'Unable to scan this image.';
      setErrorMsg(msg);
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch {
          // Ignore worker cleanup errors
        }
      }
      if (activeRunIdRef.current === runId) {
        setIsScanning(false);
      }
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) {
      void runOcrOnBlob(file);
    }
  };

  const handleSampleReceipt = async () => {
    try {
      const sampleBlob = await createSampleReceiptBlob();
      await runOcrOnBlob(sampleBlob);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create sample receipt.');
    }
  };

  const updateField = (key: keyof ParsedBillFields, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
    if (formError) setFormError('');
  };

  const handleSave = () => {
    const hasAnyValue = Object.values(fields).some((v) => v.trim().length > 0);
    if (!hasAnyValue) {
      setFormError('Enter at least a vendor name or total amount before saving.');
      return;
    }
    if (fields.total.trim() && !Number.isFinite(Number(fields.total.trim()))) {
      setFormError('Total amount must be a valid number.');
      return;
    }
    if (fields.tax.trim() && !Number.isFinite(Number(fields.tax.trim()))) {
      setFormError('Tax must be a valid number.');
      return;
    }

    onSaveBill(fields, ensureBillColumns);
    resetScanner();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/55 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scan-bill-title"
    >
      <div className="w-full max-w-3xl rounded-t-2xl sm:rounded-xl bg-white border border-slate-200 text-slate-900 shadow-xl max-h-[92dvh] flex flex-col overflow-hidden">
        {/* Sticky Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <ScanLine className="w-5 h-5 text-emerald-700 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <h2 id="scan-bill-title" className="text-base font-bold text-slate-900 truncate">
                Scan Bill or Receipt
              </h2>
              <p className="text-xs text-slate-500 truncate">
                Runs offline in your browser · Resizes to 1600px grayscale before OCR
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              resetScanner();
              onClose();
            }}
            aria-label="Close bill scanner"
            className="p-2 -mr-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Upload / Camera Inputs */}
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
            aria-label="Upload bill image"
            onChange={handleFileChange}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            aria-label="Take photo of bill with camera"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              disabled={isScanning}
              onClick={() => uploadInputRef.current?.click()}
              className="min-h-[48px] flex items-center justify-center gap-2.5 px-4 py-3 text-sm font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Upload className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
              <span>Upload Bill Image</span>
            </button>

            <button
              type="button"
              disabled={isScanning}
              onClick={() => cameraInputRef.current?.click()}
              className="min-h-[48px] flex items-center justify-center gap-2.5 px-4 py-3 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Camera className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Take Photo</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>Supports PNG, JPG, WEBP, and mobile camera captures.</span>
            <button
              type="button"
              disabled={isScanning}
              onClick={handleSampleReceipt}
              className="font-semibold text-emerald-700 hover:text-emerald-800 disabled:opacity-50 cursor-pointer"
            >
              Test with sample receipt
            </button>
          </div>

          {/* Progress Bar */}
          {isScanning && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 font-medium text-slate-800">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-700 shrink-0" aria-hidden="true" />
                  <span>{statusLabel}</span>
                </div>
                <span className="font-mono tabular-nums font-semibold text-slate-700">
                  {progress}%
                </span>
              </div>

              <div
                role="progressbar"
                aria-label="OCR scan progress"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden"
              >
                <div
                  className="h-full bg-emerald-700 transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800"
            >
              {errorMsg}
            </div>
          )}

          {/* Preprocessed Preview + Results */}
          {(previewUrl || hasResult) && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-2 border-t border-slate-200">
              {/* Left: Preprocessed Grayscale Image & Raw Text */}
              <div className="md:col-span-5 space-y-4">
                {previewUrl && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">Preprocessed Image</span>
                      <span className="font-mono text-[11px] text-slate-500">
                        {dimensionSummary}
                      </span>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-100 overflow-hidden max-h-56 flex items-center justify-center">
                      <img
                        src={previewUrl}
                        alt="Preprocessed grayscale bill"
                        className="max-h-56 w-auto object-contain"
                      />
                    </div>
                  </div>
                )}

                {hasResult && (
                  <div className="space-y-1.5">
                    <label
                      htmlFor="ocr-raw-text"
                      className="flex items-center gap-1.5 text-xs font-semibold text-slate-700"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                      <span>Raw OCR Text</span>
                    </label>
                    <textarea
                      id="ocr-raw-text"
                      readOnly
                      value={rawText || '(No text recognized)'}
                      rows={7}
                      className="w-full p-2.5 text-xs font-mono text-slate-700 bg-slate-50 border border-slate-200 rounded-lg resize-y"
                    />
                  </div>
                )}
              </div>

              {/* Right: Editable Detected Fields */}
              <div className="md:col-span-7 space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {hasResult && (
                      <CheckCircle2
                        className="w-4 h-4 text-emerald-700 shrink-0"
                        aria-hidden="true"
                      />
                    )}
                    <h3 className="text-sm font-semibold text-slate-900">
                      Detected Bill Details
                    </h3>
                  </div>
                  {hasResult && (
                    <button
                      type="button"
                      onClick={resetScanner}
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" aria-hidden="true" />
                      <span>Clear</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="bill-vendor"
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      Vendor Name
                    </label>
                    <input
                      id="bill-vendor"
                      type="text"
                      value={fields.vendor}
                      onChange={(e) => updateField('vendor', e.target.value)}
                      placeholder="e.g. Northstar Supply"
                      className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="bill-date"
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      Date
                    </label>
                    <input
                      id="bill-date"
                      type="date"
                      value={fields.date}
                      onChange={(e) => updateField('date', e.target.value)}
                      className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="bill-invoice"
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      Invoice / Bill Number
                    </label>
                    <input
                      id="bill-invoice"
                      type="text"
                      value={fields.invoiceNumber}
                      onChange={(e) => updateField('invoiceNumber', e.target.value)}
                      placeholder="e.g. INV-2026-8412"
                      className="w-full h-10 px-3 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="bill-total"
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      Total Amount
                    </label>
                    <input
                      id="bill-total"
                      type="text"
                      inputMode="decimal"
                      value={fields.total}
                      onChange={(e) => updateField('total', e.target.value)}
                      placeholder="0.00"
                      className="w-full h-10 px-3 text-sm font-mono tabular-nums text-right bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="bill-tax"
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      Tax
                    </label>
                    <input
                      id="bill-tax"
                      type="text"
                      inputMode="decimal"
                      value={fields.tax}
                      onChange={(e) => updateField('tax', e.target.value)}
                      placeholder="0.00"
                      className="w-full h-10 px-3 text-sm font-mono tabular-nums text-right bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                    />
                  </div>
                </div>

                <label className="flex items-start gap-2 pt-1 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ensureBillColumns}
                    onChange={(e) => setEnsureBillColumns(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
                  />
                  <span>
                    Add missing bill columns (Vendor, Date, Invoice #, Tax, Total) to sheet automatically
                  </span>
                </label>

                {formError && (
                  <p className="text-xs text-rose-600" role="alert">
                    {formError}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              resetScanner();
              onClose();
            }}
            className="min-h-[40px] px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!hasResult || isScanning}
            onClick={handleSave}
            className="min-h-[40px] px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-45 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
          >
            Save to Sheet
          </button>
        </div>
      </div>
    </div>
  );
}
