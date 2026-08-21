export default function WaveTimeline({ enabled, onToggle, times, hourIndex, onHourChange, onRefresh, error }) {
  const loading = enabled && times.length === 0 && !error
  const selectedTime = times[hourIndex]

  const label = selectedTime
    ? new Date(selectedTime).toLocaleString('it-IT', {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })
    : null

  return (
    <div className="panel wind-timeline" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
        <button
          className={`toggle ${enabled ? 'on' : ''}`}
          onClick={onToggle}
          aria-pressed={enabled}
          aria-label="Attiva/disattiva overlay onde"
        />
        <span className="wind-timeline-title">ONDE</span>

        {enabled && error && (
          <>
            <span className="wind-timeline-label" style={{ color: 'var(--accent-red)' }}>{error}</span>
            <button className="btn" onClick={onRefresh} style={{ flex: 'none', padding: '5px 10px' }}>
              Riprova
            </button>
          </>
        )}

        {enabled && !error && (
          loading ? (
            <span className="wind-timeline-label">Caricamento onde…</span>
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

      {/* SCALA COLORI ONDE */}
      {enabled && !error && !loading && times.length > 0 && (
        <div
          className="wave-color-scale"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '8px',
            paddingTop: '6px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: '10px',
            color: '#8fa4b8',
            fontFamily: "'IBM Plex Mono', monospace"
          }}
        >
          <span>0m</span>
          <div
            style={{
              flex: 1,
              height: '5px',
              background: 'linear-gradient(to right, #3fe0d0 0%, #ffb703 50%, #ff5d5d 100%)',
              borderRadius: '3px'
            }}
          />
          <span>1.5m</span>
          <span>3.0m+</span>
        </div>
      )}
    </div>
  )
}