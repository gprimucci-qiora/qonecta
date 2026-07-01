import { useNavigate } from 'react-router-dom'
import { useAllWeeks } from '../hooks/useOrders'
import { calcAlcance, formatWeekRange } from '../lib/bonos'
import NivelBadge from '../components/NivelBadge'

export default function History() {
  const navigate = useNavigate()
  const { weeks, loading } = useAllWeeks()

  return (
    <div className="page">
      <div style={{ padding: '16px 0 8px' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)' }}>Historial</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-sec)', marginTop: 2 }}>Tus semanas anteriores</div>
      </div>

      {loading && <p style={{ color: 'var(--color-text-sec)', fontSize: 14 }}>Cargando...</p>}

      {!loading && weeks.length === 0 && (
        <p style={{ color: 'var(--color-text-sec)', fontSize: 14 }}>No hay semanas registradas.</p>
      )}

      {weeks.map(week => {
        const alcancePct = calcAlcance(week.total_estrellas, week.meta_estrellas)
        return (
          <button
            key={week.semana_inicio}
            onClick={() => navigate(`/history/${week.semana_inicio}`)}
            style={{
              width: '100%',
              background: 'var(--color-card)',
              border: 'none',
              borderRadius: 'var(--radius)',
              padding: 16,
              marginBottom: 10,
              cursor: 'pointer',
              textAlign: 'left',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--color-text-sec)', marginBottom: 4 }}>
                  {formatWeekRange(week.semana_inicio)}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)' }}>
                  {week.total_estrellas}{' '}
                  <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--color-text-sec)' }}>
                    / {week.meta_estrellas} ★
                  </span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-text-sec)', marginTop: 2 }}>
                  {alcancePct.toFixed(1)}% de alcance
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                <NivelBadge alcancePct={alcancePct} />
                <span style={{ fontSize: 13, color: 'var(--color-text-sec)' }}>Ver →</span>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
