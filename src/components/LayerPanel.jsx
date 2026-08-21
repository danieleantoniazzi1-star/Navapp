import { useState, useEffect } from 'react'

export default function LayerPanel({
  layerState,
  setLayerState,
  aisEnabled,
  setAisEnabled,
  aisApiKey,
  setAisApiKey
}) {
  const [showKeyInput, setShowKeyInput] = useState(false)
  const [tempKey, setTempKey] = useState('')

  // Carica la chiave salvata in localStorage al primo avvio
  useEffect(() => {
    const savedKey = localStorage.getItem('navapp_ais_key')
    if (savedKey) {
      setAisApiKey(savedKey)
      setTempKey(savedKey)
    }
  }, [setAisApiKey])

  const toggle = (key) => setLayerState((s) => ({ ...s, [key]: !s[key] }))

  const handleAisToggle = () => {
    if (!aisEnabled && !aisApiKey) {
      // Se l'utente attiva l'AIS ma non c'è una chiave, mostra il campo di testo
      setShowKeyInput(true)
    } else {
      setAisEnabled(!aisEnabled)
    }
  }

  const handleSaveKey = () => {
    const trimmed = tempKey.trim()
    if (!trimmed) return
    localStorage.setItem('navapp_ais_key', trimmed)
    setAisApiKey(trimmed)
    setShowKeyInput(false)
    setAisEnabled(true)
  }

  const handleClearKey = () => {
    localStorage.removeItem('navapp_ais_key')
    setAisApiKey('')
    setTempKey('')
    setAisEnabled(false)
    setShowKeyInput(false)
  }

  return (
    <div className="panel layer-panel">
      <h3>Livelli mappa</h3>

      <div className="layer-row">
        <span>Satellite</span>
        <button
          className={`toggle ${layerState.satellite ? 'on' : ''}`}
          onClick={() => toggle('satellite')}
          aria-pressed={layerState.satellite}
          aria-label="Attiva/disattiva livello satellite"
        />
      </div>

      <div className="layer-row">
        <span>Base OSM</span>
        <button
          className={`toggle ${layerState.osmBase ? 'on' : ''}`}
          onClick={() => toggle('osmBase')}
          aria-pressed={layerState.osmBase}
          aria-label="Attiva/disattiva base OpenStreetMap"
        />
      </div>

      <div className="layer-row">
        <span>Carta nautica</span>
        <button
          className={`toggle ${layerState.seamark ? 'on' : ''}`}
          onClick={() => toggle('seamark')}
          aria-pressed={layerState.seamark}
          aria-label="Attiva/disattiva carta nautica OpenSeaMap"
        />
      </div>

      {/* ---------- AIS NAVI (LIVE) ---------- */}
      <div className="layer-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>AIS Navi (Live)</span>
          {aisApiKey && (
            <button
              onClick={() => setShowKeyInput(!showKeyInput)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-dim)',
                fontSize: '11px',
                padding: 0,
                cursor: 'pointer'
              }}
              title="Gestisci Chiave API AIS"
            >
              ⚙️
            </button>
          )}
        </div>
        <button
          className={`toggle ${aisEnabled ? 'on' : ''}`}
          onClick={handleAisToggle}
          aria-pressed={aisEnabled}
          aria-label="Attiva/disattiva traffico AIS navi"
        />
      </div>

      {/* ---------- MODALE/BOX INSERIMENTO CHIAVE API ---------- */}
      {showKeyInput && (
        <div
          style={{
            marginTop: '8px',
            marginBottom: '8px',
            padding: '10px',
            background: 'var(--bg-panel-raised)',
            borderRadius: '6px',
            border: '1px solid var(--line-grid)',
            fontSize: '11px'
          }}
        >
          <div style={{ marginBottom: '4px', color: 'var(--accent-amber)', fontWeight: '600' }}>
            Chiave API AISStream
          </div>
          <p style={{ margin: '0 0 8px 0', color: 'var(--text-dim)', fontSize: '10px', lineHeight: '1.3' }}>
            Registrati gratuitamente su <strong>aisstream.io</strong> per ottenere la tua chiave.
          </p>
          <input
            type="password"
            placeholder="Incolla API Key..."
            value={tempKey}
            onChange={(e) => setTempKey(e.target.value)}
            style={{
              width: '100%',
              padding: '6px',
              background: 'var(--bg-deep)',
              border: '1px solid var(--line-grid)',
              borderRadius: '4px',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              marginBottom: '8px'
            }}
          />
          <div style={{ display: 'flex', gap: '6px' }}>
            <button className="btn primary" onClick={handleSaveKey}>
              Salva e Attiva
            </button>
            {aisApiKey && (
              <button className="btn danger" onClick={handleClearKey}>
                Rimuovi
              </button>
            )}
          </div>
        </div>
      )}

      <div className="layer-row">
        <span>Opacità nautica</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={layerState.seamarkOpacity}
          onChange={(e) => setLayerState((s) => ({ ...s, seamarkOpacity: parseFloat(e.target.value) }))}
        />
      </div>
    </div>
  )
}