const BASE = import.meta.env.VITE_API_URL

export async function apiFetch(path, token, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
}

export const getSummary = (token, from, to) =>
  apiFetch(`/api/summary${from ? `?from=${from}&to=${to}` : ''}`, token)

export const getTrend = (token, months = 12) =>
  apiFetch(`/api/trend?months=${months}`, token)

export const getExpenses = (token, from, to) =>
  apiFetch(`/api/expenses${from ? `?start_date=${from}&end_date=${to}&limit=1000` : '?limit=1000'}`, token)

export const addExpense = (token, data) =>
  apiFetch('/api/expenses', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })

export const deleteExpense = (token, id) =>
  apiFetch(`/api/expenses/${id}`, token, { method: 'DELETE' })

export const getIncome = (token, from, to) =>
  apiFetch(`/api/income${from ? `?start_date=${from}&end_date=${to}&limit=1000` : '?limit=1000'}`, token)

export const addIncome = (token, data) =>
  apiFetch('/api/income', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })

export const deleteIncome = (token, id) =>
  apiFetch(`/api/income/${id}`, token, { method: 'DELETE' })

export const importFile = (token, formData) =>
  apiFetch('/api/import', token, { method: 'POST', body: formData })

export const getMe = (token) =>
  apiFetch('/api/users/me', token)

export const updateMe = (token, data) =>
  apiFetch('/api/users/me', token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })

export const manageHousehold = (token, data) =>
  apiFetch('/api/users/household', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })

export const getCategories = (token) =>
  apiFetch('/api/categories', token)

export const addCategory = (token, data) =>
  apiFetch('/api/categories', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })

export const deleteCategory = (token, data) =>
  apiFetch('/api/categories', token, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
