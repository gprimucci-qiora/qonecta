import { useNavigate, useParams } from 'react-router-dom'
import { useWeekOrders } from '../hooks/useOrders'
import { calcAlcance, formatWeekRange } from '../lib/bonos'
import NivelBadge from '../components/NivelBadge'
import OrderItem from '../components/OrderItem'

export default function WeekDetail() {
  const { weekStart } = useParams()
  const navigate = useNavigate()
  const { orders, totalEstrellas, loading } = useWeekOrders(weekStart)

  const meta = orders[0]?.meta_estrellas ?? 0
  const alcancePct = calcAlcance(totalEstrellas, meta)

  return (
    <div className="page">
      <button className="back-btn" onClick={() => navigate('/history')}>
        ← Historia
      </button>

      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
        {formatWeekRange(weekStart)}
      </h2>

      {/* Resumen de semana */}
      {!loading && (
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>
                {totalEstrellas} <span style={{ fontSize: 14, fontWeight: 400, color: '#888' }}>/ {meta} ★</span>
              </div>
              <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
                {alcancePct.toFixed(1)}% de alcance — {orders.length} órdenes
              </div>
            </div>
            <NivelBadge alcancePct={alcancePct} />
          </div>
        </div>
      )}

      {/* Lista de órdenes */}
      <div className="card" style={{ marginTop: 4 }}>
        <div className="card-title">Órdenes de la semana</div>
        {loading && <p style={{ color: '#888', fontSize: 14 }}>Cargando...</p>}
        {!loading && orders.length === 0 && (
          <p style={{ color: '#888', fontSize: 14, padding: '12px 0' }}>Sin órdenes registradas.</p>
        )}
        {orders.map(o => <OrderItem key={o.id} order={o} />)}
      </div>
    </div>
  )
}
