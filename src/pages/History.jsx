import { useNavigate } from 'react-router-dom'
import { useAllWeeks } from '../hooks/useOrders'
import { useProfile } from '../hooks/useProfile'
import { calcAlcance, formatWeekRange } from '../lib/bonos'
import NivelBadge from '../components/NivelBadge'

export default function History() {
  const navigate = useNavigate()
  const { profile } = useProfile()
  const { weeks, loading } = useAllWeeks()

  return (
    <div className="page">
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: '#fff' }}>Historial</h2>

      {loading && <p style={{ color: '#888' }}>Cargando...</p>}

      {!loading && weeks.length === 0 && (
        <p style={{ color: '#888', fontSize: 14 }}>No hay semanas registradas.</p>
      )}

      {weeks.map(week => {
        const alcancePct = calcAlcance(week.total_estrellas, week.meta_estrellas)
        return (
          <button
            key={week.semana_inicio}
            onClick={() => navigate(`/history/${week.semana_inicio}`)}
            style={{
              width: '100%',
              background: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: 16,
              marginBottom: 10,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>
                  {formatWeekRange(week.semana_inicio)}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#111' }}>
                  {week.total_estrellas} <span style={{ fontSize: 13, fontWeight: 400, color: '#888' }}>/ {week.meta_estrellas} ★</span>
                </div>
                <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
                  {alcancePct.toFixed(1)}% de alcance
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                <NivelBadge alcancePct={alcancePct} />
                <span style={{ fontSize: 13, color: '#aaa' }}>Ver →</span>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
