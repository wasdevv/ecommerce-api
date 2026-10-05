import { useCallback, useEffect, useState } from 'react'
import { api } from './api'

/** GET a path; refetches when path/query change. Returns { data, error, loading, reload, setData }. */
export function useFetch(path, query) {
  const key = path && JSON.stringify([path, query])
  const [state, setState] = useState({ data: null, error: null, loading: true })

  const load = useCallback(() => {
    if (!key) return
    const [p, q] = JSON.parse(key)
    setState((s) => ({ ...s, loading: true, error: null }))
    return api(p, { query: q })
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error) => setState({ data: null, error, loading: false }))
  }, [key])

  useEffect(() => { load() }, [load])

  return { ...state, reload: load, setData: (data) => setState((s) => ({ ...s, data })) }
}
