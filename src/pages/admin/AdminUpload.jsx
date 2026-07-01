import { useState, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'

function getWeekStartFromDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const diff = d.getDay() === 0 ? -6 : 1 - d.getDay()
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

function excelSerialToDate(serial) {
  const utc_days = Math.floor(serial - 25569)
  const utc_value = utc_days * 86400
  const d = new Date(utc_value * 1000)
  return d.toISOString().split('T')[0]
}

function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
        const rows = []
        for (let i = 1; i < raw.length; i++) {
          const r = raw[i]
          const ffm = String(r[8] ?? '').trim().toUpperCase()
          if (!ffm || !r[0]) continue
          const fechaStr = typeof r[0] === 'number'
            ? excelSerialToDate(r[0])
            : String(r[0]).trim()
          rows.push({
            usuario_ffm:     ffm,
            fecha_termino:   fechaStr,
            semana_inicio:   getWeekStartFromDate(fechaStr),
            sucursal:        String(r[1] ?? '').trim(),
            tipo_cuadrilla:  String(r[2] ?? '').trim(),
            tipo_servicio:   String(r[3] ?? '').trim(),
            estrellas:       parseInt(r[5] ?? 0, 10) || 0,
            nombre:          String(r[6] ?? '').trim(),
            numero_empleado: String(r[7] ?? '').trim(),
            meta_estrellas:  parseInt(r[11] ?? 0, 10) || 0,
            tipo_distrito:   String(r[12] ?? '').trim(),
          })
        }
        resolve(rows)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

export default function AdminUpload() {
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState(null)
  const [rows, setRows] = useState(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const processFile = useCallback(async (f) => {
    setFile(f)
    setResult(null)
    setError(null)
    try {
      const parsed = await parseExcel(f)
      setRows(parsed)
    } catch (e) {
      setError('Error leyendo el archivo: ' + e.message)
    }
  }, [])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) processFile(f)
  }, [processFile])

  const onFileInput = (e) => {
    const f = e.target.files[0]
    if (f) processFile(f)
  }

  async function handleImport() {
    if (!rows) return
    setImporting(true)
    setError(null)
    try {
      // Build profiles map
      const profilesMap = {}
      rows.forEach(r => {
        profilesMap[r.usuario_ffm] = {
          usuario_ffm:     r.usuario_ffm,
          nombre:          r.nombre,
          numero_empleado: r.numero_empleado,
          sucursal:        r.sucursal,
          tipo_cuadrilla:  r.tipo_cuadrilla,
          meta_estrellas:  r.meta_estrellas,
          tipo_distrito:   r.tipo_distrito,
        }
      })
      const profiles = Object.values(profilesMap)

      // Get existing auth UUIDs from profiles table (already seeded)
      const { data: existingProfiles } = await supabase
        .from('profiles')
        .select('id, usuario_ffm')
        .in('usuario_ffm', profiles.map(p => p.usuario_ffm))

      const ffmToId = {}
      ;(existingProfiles ?? []).forEach(p => { ffmToId[p.usuario_ffm] = p.id })

      // Upsert only profiles that already have an auth user
      const profilesWithId = profiles
        .filter(p => ffmToId[p.usuario_ffm])
        .map(p => ({ ...p, id: ffmToId[p.usuario_ffm] }))

      const newTechs = profiles.filter(p => !ffmToId[p.usuario_ffm])

      if (profilesWithId.length > 0) {
        for (let i = 0; i < profilesWithId.length; i += 100) {
          await supabase.from('profiles').upsert(profilesWithId.slice(i, i + 100), { onConflict: 'usuario_ffm' })
        }
      }

      // Delete orders for those dates, reinsert
      const fechas = [...new Set(rows.map(r => r.fecha_termino))]
      await supabase.from('orders').delete().in('fecha_termino', fechas)

      const orders = rows
        .filter(r => ffmToId[r.usuario_ffm])
        .map(r => ({
          usuario_ffm:    r.usuario_ffm,
          fecha_termino:  r.fecha_termino,
          semana_inicio:  r.semana_inicio,
          tipo_servicio:  r.tipo_servicio,
          estrellas:      r.estrellas,
          sucursal:       r.sucursal,
          tipo_cuadrilla: r.tipo_cuadrilla,
          meta_estrellas: r.meta_estrellas,
          tipo_distrito:  r.tipo_distrito,
        }))

      for (let i = 0; i < orders.length; i += 200) {
        await supabase.from('orders').insert(orders.slice(i, i + 200))
      }

      setResult({
        perfiles: profilesWithId.length,
        ordenes: orders.length,
        nuevos: newTechs.length,
        fechas: `${fechas.sort()[0]} → ${fechas.sort().slice(-1)[0]}`,
      })
      setRows(null)
      setFile(null)
    } catch (e) {
      setError('Error importando: ' + e.message)
    }
    setImporting(false)
  }

  // Preview stats
  const preview = rows ? (() => {
    const ffms = new Set(rows.map(r => r.usuario_ffm))
    const fechas = [...new Set(rows.map(r => r.fecha_termino))].sort()
    return { tecnicos: ffms.size, ordenes: rows.length, fechas: `${fechas[0]} → ${fechas.slice(-1)[0]}` }
  })() : null

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Subir Excel</h1>

      {/* Drop zone */}
      {!rows && !result && (
        <div className="admin-card">
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            style={{
              border: `2px dashed ${dragging ? '#00B2E3' : '#E5E5EA'}`,
              borderRadius: 12,
              padding: '48px 24px',
              textAlign: 'center',
              background: dragging ? '#EBF5FF' : '#FAFAFA',
              transition: 'all 0.15s',
              cursor: 'pointer',
            }}
            onClick={() => document.getElementById('file-input').click()}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#1C1C1E', marginBottom: 6 }}>
              Arrastra el archivo Excel aquí
            </div>
            <div style={{ fontSize: 13, color: '#8E8E93', marginBottom: 16 }}>
              o haz clic para seleccionar — BASE BONO DIARIO (.xls / .xlsx)
            </div>
            <input
              id="file-input"
              type="file"
              accept=".xls,.xlsx"
              style={{ display: 'none' }}
              onChange={onFileInput}
            />
            <div style={{
              display: 'inline-block', padding: '8px 20px', background: '#1C1C1E',
              color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600,
            }}>
              Seleccionar archivo
            </div>
          </div>
          {error && <p style={{ color: '#FF3B30', marginTop: 12, fontSize: 14 }}>{error}</p>}
        </div>
      )}

      {/* Preview */}
      {rows && preview && (
        <div className="admin-card">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
            Vista previa — {file?.name}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Técnicos', value: preview.tecnicos },
              { label: 'Órdenes', value: preview.ordenes },
              { label: 'Fechas', value: preview.fechas },
            ].map(k => (
              <div key={k.label} style={{ textAlign: 'center', padding: 16, background: '#F8F8F8', borderRadius: 8 }}>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{k.value}</div>
                <div style={{ fontSize: 13, color: '#8E8E93', marginTop: 4 }}>{k.label}</div>
              </div>
            ))}
          </div>
          {error && <p style={{ color: '#FF3B30', marginBottom: 12, fontSize: 14 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={handleImport}
              disabled={importing}
              style={{
                padding: '10px 28px', background: '#1C1C1E', color: '#fff',
                border: 'none', borderRadius: 8, fontFamily: 'inherit',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                opacity: importing ? 0.6 : 1,
              }}
            >
              {importing ? 'Importando...' : 'Confirmar importación'}
            </button>
            <button
              onClick={() => { setRows(null); setFile(null); setError(null) }}
              disabled={importing}
              style={{
                padding: '10px 20px', background: 'none', border: '1px solid #E5E5EA',
                borderRadius: 8, fontFamily: 'inherit', fontSize: 14, cursor: 'pointer', color: '#8E8E93',
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Success */}
      {result && (
        <div className="admin-card" style={{ borderLeft: '4px solid #3F873F' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#3F873F', marginBottom: 12 }}>
            ✓ Importación completada
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, fontSize: 14 }}>
            <div><span style={{ color: '#8E8E93' }}>Perfiles actualizados:</span> <strong>{result.perfiles}</strong></div>
            <div><span style={{ color: '#8E8E93' }}>Órdenes insertadas:</span> <strong>{result.ordenes}</strong></div>
            <div><span style={{ color: '#8E8E93' }}>Fechas:</span> <strong>{result.fechas}</strong></div>
            {result.nuevos > 0 && (
              <div style={{ color: '#FF9F0A' }}>
                ⚠ {result.nuevos} técnicos nuevos sin cuenta Auth — usa el script Python para crearlas
              </div>
            )}
          </div>
          <button
            onClick={() => setResult(null)}
            style={{
              marginTop: 16, padding: '8px 20px', background: 'none',
              border: '1px solid #E5E5EA', borderRadius: 8, fontFamily: 'inherit',
              fontSize: 13, cursor: 'pointer', color: '#8E8E93',
            }}
          >
            Subir otro archivo
          </button>
        </div>
      )}

      {/* Instructions */}
      <div className="admin-card" style={{ marginTop: 8, background: '#F8F8F8', border: 'none', boxShadow: 'none' }}>
        <div style={{ fontSize: 13, color: '#8E8E93', lineHeight: 1.7 }}>
          <strong style={{ color: '#1C1C1E' }}>Notas:</strong><br />
          • Acepta el archivo "BASE BONO DIARIO" tal como se descarga de SIVA<br />
          • Reemplaza las órdenes de las fechas del archivo (no afecta otras semanas)<br />
          • Para técnicos nuevos que no existen en la app, usa el script Python para crear sus cuentas
        </div>
      </div>
    </div>
  )
}
