export default function ForecastPanel({
  mode,             // 'off' | 'wind' | 'wave'
  onModeChange,     // (newMode) => void
  times,            // orari della modalità attiva
  hourIndex,        // indice orario selezionato
  onHourChange,     // cambio slider
  onRefresh,        // aggiornamento area
  loading,
  error
}) {
  const selectedTime = times?.[hourIndex]
  const label = selectedTime
    ? new Date(selectedTime).toLocaleString('it-IT', {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })
    : null

  return (
    <div className="panel wind-timeline" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
      {/* Barra di controllo principale */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', flexWrap: 'wrap' }}>
        <span className="wind-timeline-title" style={{ marginRight: '4px' }}>PREVISIONI</span>

        {/* Pulsanti selettore modalità */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            className={`btn ${mode === 'off' ? 'primary' : ''}`}
            onClick={() => onModeChange('off')}
            style={{ padding: '4px 8px', fontSize: '11px' }}
          >
            OFF
          </button>
          <button
            className={`btn ${mode === 'wind' ? 'primary' : ''}`}
            onClick={() => onModeChange('wind')}
            style={{ padding: '4px 8px', fontSize: '11px' }}
          >
            VENTO
          </button>
          <button
            className={`btn ${mode === 'wave' ? 'primary' : ''}`}
            onClick={() => onModeChange('wave')}
            style={{ padding: '4px 8px', fontSize: '11px' }}
          >
            ONDE
          </button>
        </div>

        {mode !== 'off' && error && (
          <>
            <span className="wind-timeline-label" style={{ color: 'var(--accent-red)' }}>{error}</span>
            <button className="btn" onClick={onRefresh} style={{ flex: 'none', padding: '4px 8px', fontSize: '11px' }}>
              Riprova
            </button>
          </>
        )}

        {mode !== 'off' && !error && (
          loading ? (
            <span className="wind-timeline-label" style={{ marginLeft: 'auto' }}>
              Caricamento {mode === 'wind' ? 'vento' : 'onde'}…
            </span>
          ) : (
            <>
              <input
                className="wind-slider"
                type="range"
                min={0}
                max={Math.max(0, (times?.length || 1) - 1)}
                value={hourIndex}
                onChange={(e) => onHourChange(parseInt(e.target.value, 10))}
                style={{ flex: 1, minWidth: '100px' }}
              />
              <span className="wind-timeline-label">
                {hourIndex === 0 ? 'Adesso' : `+${hourIndex}h`}{label ? ` · ${label}` : ''}
              </span>
              <button className="btn" onClick={onRefresh} style={{ flex: 'none', padding: '4px 8px', fontSize: '11px' }}>
                Aggiorna area
              </button>
            </>
          )
        )}
      </div>

      {/* SCALA COLORI CON TACCHE E INDICATORI */}
      {mode !== 'off' && !error && !loading && times?.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            marginTop: '8px',
            paddingTop: '6px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          {/* BARRA GRADIENTE CON TACCHE VERTICALI */}
          <div style={{ position: 'relative', width: '100%', height: '8px', display: 'flex', alignItems: 'center' }}>
            <div
              style={{
                width: '100%',
                height: '5px',
                background: 'linear-gradient(to right, #3fe0d0 0%, #ffb703 50%, #ff5d5d 100%)',
                borderRadius: '3px'
              }}
            />
            {/* Tacca Minimo (0%) */}
            <div style={{ position: 'absolute', left: '0%', width: '2px', height: '9px', background: '#ffffff', opacity: 0.8 }} />
            {/* Tacca Medio (50%) */}
            <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', width: '2px', height: '9px', background: '#ffffff', opacity: 0.8 }} />
            {/* Tacca Massimo (100%) */}
            <div style={{ position: 'absolute', right: '0%', width: '2px', height: '9px', background: '#ffffff', opacity: 0.8 }} />
          </div>

          {/* VALORI MIN / MED / MAX GRIGLIA DEDICATA */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              width: '100%',
              fontSize: '10px',
              color: '#8fa4b8',
              fontFamily: "'IBM Plex Mono', monospace"
            }}
          >
            <span style={{ textAlign: 'left' }}>{mode === 'wind' ? '0 kn' : '0m'}</span>
            <span style={{ textAlign: 'center' }}>{mode === 'wind' ? '15 kn' : '1.5m'}</span>
            <span style={{ textAlign: 'right' }}>{mode === 'wind' ? '30+ kn' : '3.0m+'}</span>
          </div>
        </div>
      )}
    </div>
  )
}