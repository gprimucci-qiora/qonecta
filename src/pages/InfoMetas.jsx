import { useNavigate } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import { useBonoBracket } from '../hooks/useOrders'

const SERVICIOS = [
  { tipo: 'Instalación Empresarial',    estrellas: 8 },
  { tipo: 'Instalación',                estrellas: 6 },
  { tipo: 'Cambio De Domicilio',        estrellas: 6 },
  { tipo: 'Soporte Empresarial',        estrellas: 5 },
  { tipo: 'Mantenimiento Mayor',        estrellas: 4 },
  { tipo: 'Soporte',                    estrellas: 3 },
  { tipo: 'Mantenimiento Menor',        estrellas: 3 },
  { tipo: 'Addons / Cambio de Equipo',  estrellas: 2 },
  { tipo: 'Factibilidad / Recolección', estrellas: 1 },
  { tipo: 'No Aplica',                  estrellas: 0 },
]

const NIVELES = [
  { rango: '≥ 100%', color: '#3F873F', descripcion: 'Meta cumplida — nivel máximo' },
  { rango: '90–99%', color: '#00B2E3', descripcion: 'Muy cerca — nivel alto' },
  { rango: '80–89%', color: '#FFCD00', descripcion: 'En camino — nivel medio' },
  { rango: '< 80%',  color: '#FF5F00', descripcion: 'Por debajo de la meta' },
]

const TIER_COLORS = { '80%': '#FFCD00', '90%': '#00B2E3', '100%': '#3F873F' }
const TIER_TEXT = { '80%': '#7A5C00', '90%': '#003F52', '100%': '#1A4720' }

function fmt(n) { return `$${Number(n).toLocaleString('es-MX')}` }

export default function InfoMetas() {
  const navigate = useNavigate()
  const { profile } = useProfile()
  const bracket = useBonoBracket(profile?.tipo_distrito)

  const tiers = bracket
    ? [
        { pct: '80%',  monto: bracket.monto_80  },
        { pct: '90%',  monto: bracket.monto_90  },
        { pct: '100%', monto: bracket.monto_100 },
      ]
    : null

  return (
    <div className="page">
      <button className="back-btn" onClick={() => navigate('/home')}>
        ← Inicio
      </button>

      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', marginBottom: 16 }}>
        Metas y Sistema de Bono
      </div>

      {/* Tu meta */}
      {profile && (
        <div className="card">
          <div className="card-title">Tu meta semanal</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text)' }}>
            {profile.meta_estrellas}{' '}
            <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--color-text-sec)' }}>estrellas</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-text-sec)', marginTop: 4 }}>
            Distrito Tipo {profile.tipo_distrito} · {profile.sucursal}
          </div>
        </div>
      )}

      {/* Bono por nivel */}
      {tiers && (
        <div className="card">
          <div className="card-title">Tu bono por nivel — Distrito Tipo {profile?.tipo_distrito}</div>

          {/* Tier rows */}
          {tiers.map((row, i) => (
            <div key={row.pct} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '11px 0',
              borderBottom: i < tiers.length - 1 ? '1px solid var(--color-sep)' : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  background: TIER_COLORS[row.pct],
                  color: '#fff',
                  borderRadius: 999,
                  padding: '3px 11px',
                  fontSize: 12, fontWeight: 700,
                  minWidth: 50, textAlign: 'center',
                }}>{row.pct}</span>
                <span style={{ fontSize: 14, color: 'var(--color-text-sec)' }}>Alcance semanal</span>
              </div>
              <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)' }}>
                {fmt(row.monto)}
              </span>
            </div>
          ))}

          {/* Additional rules */}
          {profile?.tipo_distrito === 'A' && (
            <div style={{
              marginTop: 14, padding: '12px 14px',
              background: '#EBF5FF', borderRadius: 10,
              borderLeft: '3px solid #00B2E3',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#003F52', marginBottom: 4 }}>
                + Bono de productividad (110%+)
              </div>
              <div style={{ fontSize: 13, color: '#1C1C1E', lineHeight: 1.5 }}>
                Si superas el <strong>110%</strong> de tu meta semanal, ganas <strong>$500</strong> adicionales a tu bono base.
              </div>
            </div>
          )}

          {profile?.tipo_distrito === 'B' && (
            <div style={{
              marginTop: 14, padding: '12px 14px',
              background: '#EBF5FF', borderRadius: 10,
              borderLeft: '3px solid #00B2E3',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#003F52', marginBottom: 4 }}>
                + Bono por estrellas extra (sobre el 100%)
              </div>
              <div style={{ fontSize: 13, color: '#1C1C1E', lineHeight: 1.55 }}>
                Por cada <strong>6 estrellas</strong> por encima de tu meta, sumas <strong>$100</strong> adicionales.<br />
                Máximo <strong>$500</strong> extra por semana.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Servicios */}
      <div className="card">
        <div className="card-title">Valor de cada servicio</div>
        {SERVICIOS.map((s, i) => (
          <div key={s.tipo} style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '9px 0',
            borderBottom: i < SERVICIOS.length - 1 ? '1px solid var(--color-sep)' : 'none',
            fontSize: 14,
          }}>
            <span style={{ color: 'var(--color-text)' }}>{s.tipo}</span>
            <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>{s.estrellas} ★</span>
          </div>
        ))}
      </div>

      {/* Niveles */}
      <div className="card">
        <div className="card-title">Niveles de cumplimiento</div>
        {NIVELES.map((n, i) => (
          <div key={n.rango} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 0',
            borderBottom: i < NIVELES.length - 1 ? '1px solid var(--color-sep)' : 'none',
          }}>
            <div style={{
              background: n.color,
              borderRadius: 100,
              padding: '3px 10px',
              fontSize: 12,
              fontWeight: 700,
              color: '#fff',
              flexShrink: 0,
              minWidth: 68,
              textAlign: 'center',
            }}>
              {n.rango}
            </div>
            <span style={{ fontSize: 14, color: 'var(--color-text)' }}>{n.descripcion}</span>
          </div>
        ))}
      </div>

      {/* Inasistencias */}
      <div className="card">
        <div className="card-title">Descuento por inasistencia</div>
        <p style={{ fontSize: 13, color: 'var(--color-text-sec)', lineHeight: 1.6, marginBottom: 12 }}>
          Aplica en algunos distritos. La semana va de lunes a domingo. Un día cuenta como trabajado si tienes al menos 1 orden completada.
        </p>
        {[
          { dias: '6 días trabajados', desc: 'Sin descuento' },
          { dias: '5 días trabajados', desc: '50% de descuento sobre tu bono' },
          { dias: '4 días o menos',    desc: 'Pierdes el bono completo' },
        ].map((row, i, arr) => (
          <div key={row.dias} style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '9px 0',
            borderBottom: i < arr.length - 1 ? '1px solid var(--color-sep)' : 'none',
            fontSize: 14,
          }}>
            <span style={{ color: 'var(--color-text)' }}>{row.dias}</span>
            <span style={{ fontWeight: 500, color: 'var(--color-text)', textAlign: 'right' }}>{row.desc}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
