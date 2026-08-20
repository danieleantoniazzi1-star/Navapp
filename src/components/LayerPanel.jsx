export default function LayerPanel({ layerState, setLayerState }) {
  const toggle = (key) => setLayerState((s) => ({ ...s, [key]: !s[key] }))

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
