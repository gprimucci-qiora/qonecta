import { supabase } from './supabase'

// Fetches all rows from a Supabase query, bypassing the 1,000-row default limit.
// builder(from, to) must return a Supabase query with .range(from, to) applied.
export async function fetchAll(builder) {
  const PAGE = 1000
  let all = [], from = 0
  while (true) {
    const { data } = await builder(from, from + PAGE - 1)
    if (!data?.length) break
    all = all.concat(data)
    if (data.length < PAGE) break
    from += PAGE
  }
  return all
}

// Convenience: fetch all rows from a table with select + optional eq filter
export async function fetchAllFrom(table, select, filters = {}) {
  return fetchAll((from, to) => {
    let q = supabase.from(table).select(select).range(from, to)
    for (const [col, val] of Object.entries(filters)) q = q.eq(col, val)
    return q
  })
}
