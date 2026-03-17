import { useState, useRef } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { Upload, FileSpreadsheet, X, CheckCircle } from 'lucide-react'
import { importFile } from '../api.js'

export default function Import() {
  const { getAccessTokenSilently } = useAuth0()
  const [file, setFile]       = useState(null)
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef()

  const handleFileChange = e => {
    const f = e.target.files[0]
    if (f) { setFile(f); setResult(null); setError(null) }
  }

  const onDrop = e => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xlsm') || f.name.endsWith('.xls'))) {
      setFile(f); setResult(null); setError(null)
    } else {
      setError('Please upload an Excel file (.xlsx, .xlsm, or .xls)')
    }
  }

  const handleImport = async () => {
    if (!file) return
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const token = await getAccessTokenSilently()
      const fd = new FormData()
      fd.append('file', file)
      const res = await importFile(token, fd)
      setResult(res)
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const reset = () => {
    setFile(null); setResult(null); setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Import from Excel</h1>

      <div className="card space-y-5">
        <div>
          <h2 className="font-semibold text-gray-900 mb-1">Upload File</h2>
          <p className="text-sm text-gray-500">
            Supports <code className="bg-gray-100 px-1 rounded">.xlsx</code>,{' '}
            <code className="bg-gray-100 px-1 rounded">.xlsm</code>, and{' '}
            <code className="bg-gray-100 px-1 rounded">.xls</code> files.
            The importer auto-detects columns by name — first row must be headers.
          </p>
        </div>

        <div
          onDrop={onDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
          }`}
        >
          <input ref={fileRef} type="file" accept=".xlsx,.xlsm,.xls" onChange={handleFileChange}
            className="hidden" id="file-input" />
          <label htmlFor="file-input" className="cursor-pointer block space-y-3">
            <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center mx-auto">
              <Upload className="w-7 h-7 text-blue-500" />
            </div>
            <div>
              <p className="text-gray-700 font-medium">Click or drag to upload</p>
              <p className="text-sm text-gray-400">.xlsx, .xlsm, or .xls</p>
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
          {result ? (
            <button className="btn-primary" onClick={reset}>
              <Upload className="w-4 h-4" /> Import Another File
            </button>
          ) : (
            <button className="btn-primary" onClick={handleImport} disabled={!file || loading}>
              <Upload className="w-4 h-4" />
              {loading ? 'Importing...' : 'Import'}
            </button>
          )}
        </div>
      </div>

      {result && (
        <div className="card bg-green-50 border-green-200 space-y-4">
          <div className="flex items-center gap-2 text-green-700 font-semibold">
            <CheckCircle className="w-5 h-5" />
            Import Complete
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Rows Imported</p>
              <p className="text-2xl font-bold text-green-700">{result.imported}</p>
            </div>
            <div>
              <p className="text-gray-500">Rows Skipped</p>
              <p className="text-2xl font-bold text-gray-500">{result.skipped}</p>
            </div>
          </div>
          {result.sheet && <p className="text-xs text-gray-500">Sheet: <strong>{result.sheet}</strong></p>}
          {result.errors?.length > 0 && (
            <details className="text-sm">
              <summary className="text-red-500 cursor-pointer">Show {result.errors.length} row errors</summary>
              <div className="mt-2 text-xs text-red-400 space-y-0.5">
                {result.errors.map((e, i) => <p key={i}>{e}</p>)}
              </div>
            </details>
          )}
        </div>
      )}

      <div className="card space-y-3 text-sm text-gray-600">
        <h3 className="font-semibold text-gray-900">Expected Excel Format</h3>
        <p className="text-gray-500">The importer auto-detects columns by header name. Supported column names:</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <p className="font-medium text-gray-700 mb-1">Required</p>
            <ul className="space-y-0.5 text-gray-500">
              <li><code className="bg-gray-100 px-1 rounded">Date</code> — transaction date</li>
              <li><code className="bg-gray-100 px-1 rounded">Amount</code> — numeric value</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-gray-700 mb-1">Optional</p>
            <ul className="space-y-0.5 text-gray-500">
              <li><code className="bg-gray-100 px-1 rounded">Description / Vendor / Source</code></li>
              <li><code className="bg-gray-100 px-1 rounded">Category / Type</code></li>
              <li><code className="bg-gray-100 px-1 rounded">Notes</code></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
