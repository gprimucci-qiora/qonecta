export function calcAlcance(totalEstrellas, metaEstrellas) {
  if (!metaEstrellas) return 0
  return (totalEstrellas / metaEstrellas) * 100
}

export function getNivel(alcancePct) {
  if (alcancePct >= 100) return { tier: 4, label: '≥ 100%', color: '#3F873F' }
  if (alcancePct >= 90)  return { tier: 3, label: '90–99%', color: '#00B2E3' }
  if (alcancePct >= 80)  return { tier: 2, label: '80–89%', color: '#FFCD00' }
  return { tier: 1, label: '< 80%', color: '#FF5F00' }
}

export function getWeekStart(dateStr) {
  const d = dateStr ? new Date(dateStr + 'T12:00:00') : new Date()
  const day = d.getDay() // 0=Sun, 1=Mon...6=Sat
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

export function getWeekEnd(weekStart) {
  const d = new Date(weekStart + 'T12:00:00')
  d.setDate(d.getDate() + 6)
  return d.toISOString().split('T')[0]
}

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export function formatWeekRange(weekStart) {
  const start = new Date(weekStart + 'T12:00:00')
  const end = new Date(weekStart + 'T12:00:00')
  end.setDate(end.getDate() + 6)
  const sDay = start.getDate()
  const eDay = end.getDate()
  const sMon = MONTH_NAMES[start.getMonth()]
  const eMon = MONTH_NAMES[end.getMonth()]
  if (sMon === eMon) return `${sDay} – ${eDay} ${eMon}`
  return `${sDay} ${sMon} – ${eDay} ${eMon}`
}
