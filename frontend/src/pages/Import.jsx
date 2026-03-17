import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, X, CheckCircle } from 'lucide-react';
import { previewImport, confirmImport } from '../api';

function PreviewTable({ title, rows, type }) {
  if (!rows || rows.length === 0) return null;
  const isExp = type === 'expense';
  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-gray-900">
        {title} <span className="text-gray-400 font-normal text-sm">({rows.length} rows)</span>
      </h3>
      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="table-th">Date</th>
              <th className="table-th">{isExp ? 'Vendor' : 'Source'}</th>
              <th className="table-th text-right">Amount</th>
              <th className="table-th">Category</th>
              <th className="table-th">Notes</th>
              <th className="table-th">Hidden</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.slice(0, 50).map((r, i) => (
              <tr key={i} className={r.hidden ? 'opacity-50' : ''}>
                <td className="table-td">{r.date}</td>
                <td className="table-td font-medium">{isExp ? r.vendor : r.source}</td>
                <td className="table-td text-right">${Number(r.amount).toFixed(2)}</td>
                <td className="table-td">
                  <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">{r.category}</span>
                </td>
                <td className="table-td text-gray-500 max-w-[160px] truncate">{r.notes}</td>
                <td className="table-td">{r.hidden ? '✓' : ''}</td>
              </tr>
            ))}
            {rows.length > 50 && (
              <tr>
                <td colSpan={6} className="table-td text-center text-gray-400 italic">
                  … and {rows.length - 50} more rows
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Import() {
  const [file, setFile]       = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [step, setStep]       = useState('upload');
  const fileRef               = useRef();

  function handleFileChange(e) {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(null);
    setResult(null);
    setError('');
    setStep('upload');
  }

  async function handlePreview() {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const data = await previewImport(fd);
      setPreview(data);
      setStep('preview');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to parse file');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const data = await confirmImport(fd);
      setResult(data);
      setStep('done');
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      setError(err.response?.data?.error || 'Import failed');
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError('');
    setStep('upload');
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900">Import from Excel</h1>

      <div className="card space-y-5">
        <div>
          <h2 className="font-semibold text-gray-900 mb-1">Upload File</h2>
          <p className="text-sm text-gray-500">
            Supports <code className="bg-gray-100 px-1 rounded">.xlsx</code> and{' '}
            <code className="bg-gray-100 px-1 rounded">.xlsm</code> files with{' '}
            <strong>Expenses</strong> and/or <strong>Income</strong> sheets.
          </p>
        </div>

        <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-blue-400 transition-colors">
          <input ref={fileRef} type="file" accept=".xlsx,.xlsm" onChange={handleFileChange}
            className="hidden" id="file-input" />
          <label htmlFor="file-input" className="cursor-pointer block space-y-3">
            <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center mx-auto">
              <Upload className="w-7 h-7 text-blue-500" />
            </div>
            <div>
              <p className="text-gray-700 font-medium">Click to select file</p>
              <p className="text-sm text-gray-400">.xlsx or .xlsm up to 20 MB</p>
            </div>
          </label>
        </div>

        {file && (
          <div className="flex items-center gap-3 bg-blue-50 rounded-xl px-4 py-3">
            <FileSpreadsheet className="w-6 h-6 text-blue-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-blue-900 truncate">{file.name}</p>
              <p className="text-xs text-blue-500">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button onClick={reset} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}

        <div className="flex gap-3">
          {step === 'upload' && (
            <button className="btn-primary" onClick={handlePreview} disabled={!file || loading}>
              <Upload className="w-4 h-4" />
              {loading ? 'Parsing…' : 'Preview Import'}
            </button>
          )}
          {step === 'preview' && (
            <>
              <button className="btn-secondary" onClick={reset}>Start Over</button>
              <button className="btn-primary" onClick={handleConfirm} disabled={loading}>
                {loading ? 'Importing…' : `Confirm Import (${(preview?.totalExpenses || 0) + (preview?.totalIncome || 0)} rows)`}
              </button>
            </>
          )}
          {step === 'done' && (
            <button className="btn-primary" onClick={reset}>
              <Upload className="w-4 h-4" />
              Import Another File
            </button>
          )}
        </div>
      </div>

      {/* Import result */}
      {result && step === 'done' && (
        <div className="card border-green-200 bg-green-50 space-y-4">
          <div className="flex items-center gap-2 text-green-700 font-semibold">
            <CheckCircle className="w-5 h-5" />
            Import Completed
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Expenses Imported</p>
              <p className="text-2xl font-bold text-green-700">{result.importedExpenses}</p>
            </div>
            <div>
              <p className="text-gray-500">Expenses Skipped</p>
              <p className="text-2xl font-bold text-gray-500">{result.skippedExpenses}</p>
            </div>
            <div>
              <p className="text-gray-500">Income Imported</p>
              <p className="text-2xl font-bold text-green-700">{result.importedIncome}</p>
            </div>
            <div>
              <p className="text-gray-500">Income Skipped</p>
              <p className="text-2xl font-bold text-gray-500">{result.skippedIncome}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500">Skipped rows already exist in the database (matched on date + vendor/source + amount).</p>
        </div>
      )}

      {/* Preview tables */}
      {preview && step === 'preview' && (
        <div className="space-y-6">
          <div className="card bg-blue-50 border-blue-100 text-sm text-blue-800">
            <strong>{preview.totalExpenses + preview.totalIncome} rows</strong> found:
            {' '}{preview.totalExpenses} expenses, {preview.totalIncome} income entries.
            {' '}Review below, then confirm to import.
          </div>
          <PreviewTable title="Expenses" rows={preview.expenses} type="expense" />
          <PreviewTable title="Income"   rows={preview.income}   type="income" />
        </div>
      )}

      {/* Format reference */}
      <div className="card space-y-3 text-sm text-gray-600">
        <h3 className="font-semibold text-gray-900">Expected Excel Format</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <p className="font-medium text-gray-700 mb-1">Expenses sheet</p>
            <ul className="space-y-0.5 text-gray-500">
              <li><code className="bg-gray-100 px-1 rounded">B</code> — Date (MM-DD-YYYY)</li>
              <li><code className="bg-gray-100 px-1 rounded">C</code> — Vendor</li>
              <li><code className="bg-gray-100 px-1 rounded">D</code> — Amount (or =formula)</li>
              <li><code className="bg-gray-100 px-1 rounded">E</code> — Category</li>
              <li><code className="bg-gray-100 px-1 rounded">F</code> — Hidden (Y = exclude)</li>
              <li><code className="bg-gray-100 px-1 rounded">G</code> — Notes</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-gray-700 mb-1">Income sheet</p>
            <ul className="space-y-0.5 text-gray-500">
              <li><code className="bg-gray-100 px-1 rounded">B</code> — Date</li>
              <li><code className="bg-gray-100 px-1 rounded">C</code> — Source</li>
              <li><code className="bg-gray-100 px-1 rounded">D</code> — Amount</li>
              <li><code className="bg-gray-100 px-1 rounded">E</code> — Category</li>
              <li><code className="bg-gray-100 px-1 rounded">F</code> — Hidden (Y = exclude)</li>
              <li><code className="bg-gray-100 px-1 rounded">G</code> — Notes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
