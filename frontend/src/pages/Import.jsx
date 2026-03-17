import { useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { importFile } from '../api.js'

export default function Import() {
  const { getAccessTokenSilently } = useAuth0()
  const [file, setFile] = useState(null)
  const [type, setType] = useState('expense')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  const handleImport = async () => {
    if (!file) return
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const token = await getAccessTokenSilently()
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', type)
      const res = await importFile(token, fd)
      setResult(res)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const onDrop = e => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) setFile(f)
    else setError('Please upload an Excel file (.xlsx or .xls)')
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-bold text-gray-800">Import from Excel</h1>

      <div className="bg-white rounded-xl p-6 shadow-sm space-y-5">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">Import as</label>
          <div className="flex gap-3">
            {['expense','income'].map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-5 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                  type === t ? (t === 'expense' ? 'bg-red-500 text-white' : 'bg-green-600 text-white') : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t === 'expense' ? '💸 Expenses' : '💰 Income'}
              </button>
            ))}
          </div>
        </div>

        <div
          onDrop={onDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
            dragOver ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="text-4xl mb-3">📂</div>
          <p className="text-gray-600 mb-3">Drag & drop your Excel file here, or</p>
          <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Browse file
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={e => setFile(e.target.files[0])} />
          </label>
          {file && <p className="mt-3 text-sm text-green-600 font-medium">✓ {file.name}</p>}
        </div>

        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 space-y-1">
          <p className="font-medium text-gray-700">Expected columns:</p>
          <p>• <strong>Date</strong> — Transaction date (any recognizable date format)</p>
          <p>• <strong>Amount</strong> — Numeric value ($ signs and commas are handled)</p>
          <p>• <strong>Description / Vendor / Source</strong> — What the transaction is for</p>
          <p>• <strong>Category / Type</strong> — Optional category label</p>
          <p className="text-gray-400 pt-1">The importer auto-detects columns by name. First row must be headers.</p>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm">{error}</div>}

        {result && (
          <div className="bg-green-50 border border-green-200 p-4 rounded-xl space-y-1">
            <p className="font-semibold text-green-700">Import complete</p>
            <p className="text-sm text-green-600">✓ {result.imported} rows imported from sheet "{result.sheet}"</p>
            {result.skipped > 0 && <p className="text-sm text-gray-500">— {result.skipped} rows skipped (empty, invalid, or zero amount)</p>}
            {result.errors?.length > 0 && (
              <details className="mt-2">
                <summary className="text-sm text-red-500 cursor-pointer">Show {result.errors.length} row errors</summary>
                <div className="mt-1 text-xs text-red-400 space-y-0.5">{result.errors.map((e, i) => <p key={i}>{e}</p>)}</div>
              </details>
            )}
          </div>
        )}

        <button
          onClick={handleImport}
          disabled={!file || loading}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? 'Importing...' : `Import as ${type === 'expense' ? 'Expenses' : 'Income'}`}
        </button>
      </div>
    </div>
  )
}
