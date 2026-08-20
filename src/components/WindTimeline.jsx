export default function WindTimeline({ enabled, onToggle, times, hourIndex, onHourChange, onRefresh }) {
  const loading = enabled && times.length === 0
  const selectedTime = times[hourIndex]

  const label = selectedTime
    ? new Date(selectedTime).toLocaleString('it-IT', {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })
    : null

  return (
    <div className="panel wind-timeline">
      <button
        className={`toggle ${enabled ? 'on' : ''}`}
        onClick={onToggle}
        aria-pressed={enabled}
        aria-label="Attiva/disattiva overlay vento"
      />
      <span className="wind-timeline-title">VENTO</span>

      {enabled && (
        loading ? (
          <span className="wind-timeline-label">Caricamento previsione…</span>
        ) : (
          <>
            <input
              className="wind-slider"
              type="range"
              min={0}
              max={Math.max(0, times.length - 1)}
              value={hourIndex}
              onChange={(e) => onHourChange(parseInt(e.target.value, 10))}
            />
            <span className="wind-timeline-label">
              {hourIndex === 0 ? 'Adesso' : `+${hourIndex}h`}{label ? ` · ${label}` : ''}
            </span>
            <button className="btn" onClick={onRefresh} style={{ flex: 'none', padding: '5px 10px' }}>
              Aggiorna area
            </button>
          </>
        )
      )}
    </div>
  )
}
