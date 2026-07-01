const TIPO_COLOR = {
  'Instalación': '#00B2E3',
  'Cambio De Domicilio': '#00B2E3',
  'Empresarial': '#655DC6',
  'Soporte': '#3F873F',
  'Mantenimiento Mayor': '#FF5F00',
  'Mantenimiento Menor': '#FF5F00',
  'Addons': '#FFCD00',
  'Cambio De Equipo': '#FFCD00',
  'Addon Wifi Extender': '#FFCD00',
  'Factibilidad': '#DADADA',
  'Recolección Pi': '#DADADA',
  'Recolección Empresarial': '#DADADA',
  'Hallazgo Empresarial': '#655DC6',
}

const MONTH_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`
}

export default function OrderItem({ order }) {
  const color = TIPO_COLOR[order.tipo_servicio] ?? '#888'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f3f3f3' }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {order.tipo_servicio}
        </div>
        <div style={{ fontSize: 12, color: '#888', marginTop: 1 }}>
          {formatDate(order.fecha_termino)}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>{order.estrellas}</span>
        <span style={{ fontSize: 13, color: '#888' }}>★</span>
      </div>
    </div>
  )
}
