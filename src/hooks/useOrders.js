import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useProfile } from './useProfile'
import { getWeekStart } from '../lib/bonos'

function sumEstrellas(orders) {
  return orders.reduce((acc, o) => acc + Number(o.estrellas), 0)
}

export function useCurrentWeekOrders() {
  const { profile } = useProfile()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    supabase
      .from('orders')
      .select('*')
      .eq('usuario_ffm', profile.usuario_ffm)
      .eq('semana_inicio', getWeekStart())
      .order('fecha_termino', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(error)
        setOrders(data ?? [])
        setLoading(false)
      })
  }, [profile])

  return { orders, totalEstrellas: sumEstrellas(orders), loading }
}

export function useAllWeeks() {
  const { profile } = useProfile()
  const [weeks, setWeeks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    supabase
      .from('orders')
      .select('semana_inicio, estrellas, meta_estrellas')
      .eq('usuario_ffm', profile.usuario_ffm)
      .order('semana_inicio', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(error)
        const grouped = {}
        ;(data ?? []).forEach(o => {
          if (!grouped[o.semana_inicio]) {
            grouped[o.semana_inicio] = { semana_inicio: o.semana_inicio, total_estrellas: 0, meta_estrellas: Number(o.meta_estrellas) }
          }
          grouped[o.semana_inicio].total_estrellas += Number(o.estrellas)
        })
        setWeeks(Object.values(grouped))
        setLoading(false)
      })
  }, [profile])

  return { weeks, loading }
}

export function useWeekOrders(weekStart) {
  const { profile } = useProfile()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile || !weekStart) return
    supabase
      .from('orders')
      .select('*')
      .eq('usuario_ffm', profile.usuario_ffm)
      .eq('semana_inicio', weekStart)
      .order('fecha_termino', { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error(error)
        setOrders(data ?? [])
        setLoading(false)
      })
  }, [profile, weekStart])

  return { orders, totalEstrellas: sumEstrellas(orders), loading }
}

export function useBonoBracket(tipoDistrito) {
  const [bracket, setBracket] = useState(null)
  useEffect(() => {
    if (!tipoDistrito) return
    supabase
      .from('bono_brackets')
      .select('monto_80, monto_90, monto_100')
      .eq('tipo_distrito', tipoDistrito.toUpperCase())
      .single()
      .then(({ data }) => setBracket(data ?? null))
  }, [tipoDistrito])
  return bracket
}

export function useAnnouncement() {
  const [announcement, setAnnouncement] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('announcements')
      .select('id, titulo, mensaje, tipo')
      .eq('activo', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data, error }) => {
        if (error) console.error(error)
        setAnnouncement(data?.[0] ?? null)
        setLoading(false)
      })
  }, [])

  return { announcement, loading }
}
