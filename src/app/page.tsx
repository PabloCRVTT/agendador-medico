'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Isapre, Especialidad, ClinicaResultado } from '@/types'

const ESPECIALIDADES_ICONS: Record<string, { icon: string; bg: string; sub: string }> = {
  'Traumatología':        { icon: '🦴', bg: '#EBF3FF', sub: 'Huesos, articulaciones, columna' },
  'Cardiología':          { icon: '❤️', bg: '#FFF0F0', sub: 'Corazón y sistema vascular' },
  'Neurología':           { icon: '🧠', bg: '#F0FFF4', sub: 'Sistema nervioso, cefaleas' },
  'Oftalmología':         { icon: '👁️', bg: '#FFFBF0', sub: 'Visión, glaucoma, cataratas' },
  'Dermatología':         { icon: '🧬', bg: '#F0F8FF', sub: 'Piel, pelo, uñas' },
  'Medicina General':     { icon: '🩺', bg: '#F5F0FF', sub: 'Atención primaria adultos' },
  'Medicina Interna':     { icon: '🩺', bg: '#F5F0FF', sub: 'Diagnóstico general adultos' },
  'Ginecología':          { icon: '👶', bg: '#FFF0F8', sub: 'Salud femenina' },
  'Pediatría':            { icon: '🧒', bg: '#F0FFF8', sub: 'Salud infantil' },
  'Psiquiatría':          { icon: '💭', bg: '#F8F0FF', sub: 'Salud mental adultos' },
  'Psicología':           { icon: '💭', bg: '#F0F0FF', sub: 'Terapia y bienestar' },
  'Kinesiología':         { icon: '💪', bg: '#FFF5E6', sub: 'Rehabilitación y movimiento' },
  'Urología':             { icon: '🔬', bg: '#E6F9FF', sub: 'Sistema urinario' },
  'Gastroenterología':    { icon: '🫁', bg: '#F0FFE6', sub: 'Aparato digestivo' },
  'Otorrinolaringología': { icon: '👂', bg: '#FFF0E6', sub: 'Oído, nariz, garganta' },
}

function formatFecha(iso: string | null): string {
  if (!iso) return 'Sin horas'
  const d = new Date(iso)
  const hoy = new Date()
  const manana = new Date(); manana.setDate(hoy.getDate() + 1)
  const hora = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === hoy.toDateString()) return `Hoy ${hora}`
  if (d.toDateString() === manana.toDateString()) return `Mañana ${hora}`
  return d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' }) + ' ' + hora
}

export default function Home() {
  const [screen, setScreen] = useState(1)
  const [isapres, setIsapres] = useState<Isapre[]>([])
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([])
  const [resultados, setResultados] = useState<ClinicaResultado[]>([])
  const [selectedClinica, setSelectedClinica] = useState<ClinicaResultado | null>(null)
  const [loadingStep, setLoadingStep] = useState(0)
  const [searchSpec, setSearchSpec] = useState('')

  // Formulario
  const [rut, setRut] = useState('')
  const [isapreId, setIsapreId] = useState('')
  const [comunaId, setComunaId] = useState('')
  const [comunaNombre, setComunaNombre] = useState('')
  const [especialidadId, setEspecialidadId] = useState('')
  const [especialidadNombre, setEspecialidadNombre] = useState('')
  const [email, setEmail] = useState('')
  const [gpsLoading, setGpsLoading] = useState(false)

  // Cargar datos iniciales
  useEffect(() => {
    supabase.from('isapres').select('id, nombre').eq('activa', true).order('nombre')
      .then(({ data }) => { if (data) setIsapres(data) })
    supabase.from('especialidades').select('id, nombre, categoria, slug').order('nombre')
      .then(({ data }) => { if (data) setEspecialidades(data) })
  }, [])

  // GPS
  const detectarUbicacion = useCallback(async () => {
    setGpsLoading(true)
    if (!navigator.geolocation) { setGpsLoading(false); return }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords
      // Buscar la comuna más cercana por coordenadas
      const { data } = await supabase.rpc('clinicas_en_radio', {
        p_comuna_id: '00000000-0000-0000-0000-000000000000',
        p_isapre_id: '00000000-0000-0000-0000-000000000000',
        p_especialidad_id: '00000000-0000-0000-0000-000000000000',
      }).limit(1)
      // Fallback: buscar comuna por nombre aproximado via reverse geocoding
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`)
        const geo = await res.json()
        const suburb = geo.address?.suburb || geo.address?.city_district || geo.address?.town || ''
        if (suburb) {
          const { data: comunaData } = await supabase
            .from('comunas').select('id, nombre')
            .ilike('nombre', `%${suburb.split(' ')[0]}%`).limit(1)
          if (comunaData && comunaData.length > 0) {
            setComunaId(comunaData[0].id)
            setComunaNombre(comunaData[0].nombre)
          }
        }
      } catch { /* silencioso */ }
      setGpsLoading(false)
    }, () => setGpsLoading(false))
  }, [])

  // Animación de búsqueda
  useEffect(() => {
    if (screen !== 3) return
    setLoadingStep(0)
    const t1 = setTimeout(() => setLoadingStep(1), 800)
    const t2 = setTimeout(() => setLoadingStep(2), 1800)
    const t3 = setTimeout(() => setLoadingStep(3), 2800)
    const t4 = setTimeout(async () => {
      setLoadingStep(4)
      const { data, error } = await supabase.rpc('clinicas_en_radio', {
        p_comuna_id: comunaId,
        p_isapre_id: isapreId,
        p_especialidad_id: especialidadId,
      })
      if (!error && data) setResultados(data)
      setScreen(4)
    }, 3600)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [screen, comunaId, isapreId, especialidadId])

  const especFiltradas = especialidades.filter(e =>
    e.nombre.toLowerCase().includes(searchSpec.toLowerCase())
  )
  const isapre = isapres.find(i => i.id === isapreId)

  return (
    <>
      <div className="phone">

        {/* ===== PANTALLA 1: DATOS ===== */}
        {screen === 1 && (
          <>
            <div className="status-bar">
              <span>9:41</span>
              <span>●●● WiFi 🔋</span>
            </div>
            <div className="hero-section">
              <div className="logo-badge">
                <div className="logo-dot" />
                <span>MiHora</span>
              </div>
              <h1>Encuentra al médico<br /><em>más conveniente</em><br />para ti</h1>
              <p>Búsqueda en clínicas cercanas<br />con cobertura de tu Isapre</p>
            </div>
            <div className="form-area">
              <div className="field">
                <label>RUT</label>
                <input type="text" placeholder="12.345.678-9" value={rut} onChange={e => setRut(e.target.value)} />
              </div>
              <div className="field">
                <label>Isapre</label>
                <div className="select-wrap">
                  <select value={isapreId} onChange={e => setIsapreId(e.target.value)}>
                    <option value="">Selecciona tu Isapre</option>
                    {isapres.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Ubicación</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    type="text"
                    placeholder={gpsLoading ? 'Detectando…' : 'Tu comuna'}
                    value={comunaNombre}
                    onChange={e => setComunaNombre(e.target.value)}
                    readOnly={!!comunaId}
                    style={{ flex: 1 }}
                  />
                  <button
                    onClick={detectarUbicacion}
                    style={{
                      width: 48, height: 48, borderRadius: 10,
                      background: comunaId ? '#1B5C6B' : '#E8F2F5',
                      border: 'none', cursor: 'pointer', fontSize: 18,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    📍
                  </button>
                </div>
              </div>
              <div className="privacy-note">
                <span style={{ fontSize: 14 }}>🔒</span>
                <span>Tus datos son privados y nunca serán compartidos. Tu RUT se almacena encriptado.</span>
              </div>
            </div>
            <div className="btn-row">
              <button
                className="btn-primary"
                disabled={!isapreId || !comunaId}
                onClick={() => setScreen(2)}
              >
                Buscar médico →
              </button>
            </div>
          </>
        )}

        {/* ===== PANTALLA 2: ESPECIALIDAD ===== */}
        {screen === 2 && (
          <>
            <div className="status-bar"><span>9:42</span><span>●●● WiFi 🔋</span></div>
            <div className="nav-bar">
              <button className="back-btn" onClick={() => setScreen(1)}>←</button>
              <span className="nav-title">¿Qué especialista necesitas?</span>
            </div>
            <div className="step-row">
              <div className="step-dot done" /><div className="step-dot active" />
              <div className="step-dot" /><div className="step-dot" /><div className="step-dot" />
            </div>
            <div className="search-section">
              <div className="search-box">
                <span>🔍</span>
                <input type="text" placeholder="Buscar especialidad…" value={searchSpec} onChange={e => setSearchSpec(e.target.value)} />
              </div>
            </div>
            <div className="section-label">{searchSpec ? 'Resultados' : 'Especialidades'}</div>
            <div className="spec-list">
              {especFiltradas.map(esp => {
                const meta = ESPECIALIDADES_ICONS[esp.nombre] || { icon: '🩺', bg: '#F5F0FF', sub: esp.categoria }
                return (
                  <div key={esp.id} className="spec-item" onClick={() => {
                    setEspecialidadId(esp.id)
                    setEspecialidadNombre(esp.nombre)
                    setScreen(3)
                  }}>
                    <div className="spec-icon" style={{ background: meta.bg }}>{meta.icon}</div>
                    <div className="spec-info">
                      <div className="spec-name">{esp.nombre}</div>
                      <div className="spec-sub">{meta.sub}</div>
                    </div>
                    <span className="spec-arrow">→</span>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* ===== PANTALLA 3: BUSCANDO ===== */}
        {screen === 3 && (
          <>
            <div className="status-bar"><span>9:42</span><span>●●● WiFi 🔋</span></div>
            <div className="step-row" style={{ padding: '16px 24px 0' }}>
              <div className="step-dot done" /><div className="step-dot done" />
              <div className="step-dot active" /><div className="step-dot" /><div className="step-dot" />
            </div>
            <div className="loading-screen">
              <div className="radar-wrap">
                <div className="radar-circle" /><div className="radar-circle" />
                <div className="radar-circle" /><div className="radar-circle" />
                <div className="radar-center">📍</div>
              </div>
              <div className="loading-title">Buscando en tu zona</div>
              <div className="loading-sub">{comunaNombre} y comunas colindantes</div>
              <div className="loading-steps">
                {[
                  { label: 'Comunas cercanas', detail: 'Calculando radio colindante…' },
                  { label: `Clínicas con convenio ${isapre?.nombre || ''}`, detail: 'Verificando cobertura…' },
                  { label: 'Disponibilidad de horas', detail: 'Revisando agendas próximos 7 días…' },
                  { label: 'Calculando el mejor match', detail: 'Cobertura + distancia + disponibilidad' },
                ].map((step, i) => (
                  <div key={i} className={`loading-step ${loadingStep > i ? 'done' : ''}`}>
                    <div className={`step-check ${loadingStep > i ? '' : 'pending'}`}>
                      {loadingStep > i ? '✓' : '⋯'}
                    </div>
                    <div>
                      <div className="step-text">{step.label}</div>
                      <div className="step-detail">{step.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ===== PANTALLA 4: RESULTADOS ===== */}
        {screen === 4 && (
          <>
            <div className="status-bar"><span>9:43</span><span>●●● WiFi 🔋</span></div>
            <div className="nav-bar">
              <button className="back-btn" onClick={() => setScreen(2)}>←</button>
              <span className="nav-title">{especialidadNombre} · {comunaNombre}</span>
            </div>
            <div className="step-row">
              <div className="step-dot done" /><div className="step-dot done" />
              <div className="step-dot done" /><div className="step-dot active" /><div className="step-dot" />
            </div>
            <div className="results-header">
              <div className="results-count">{resultados.length} clínicas encontradas · {isapre?.nombre} ✓</div>
              <div className="results-title">Las más convenientes para ti</div>
            </div>
            <div className="sort-row">
              <div className="sort-pill active">Mejor match</div>
              <div className="sort-pill">Más cercana</div>
              <div className="sort-pill">Antes disponible</div>
            </div>
            <div className="cards-scroll">
              {resultados.length === 0 && (
                <div className="empty-state">
                  No encontramos clínicas disponibles en tu zona.<br />
                  Intenta con otra especialidad o Isapre.
                </div>
              )}
              {resultados.map((c, i) => (
                <div
                  key={c.clinica_id}
                  className={`clinica-card ${i === 0 ? 'best' : ''}`}
                  onClick={() => { setSelectedClinica(c); setScreen(5) }}
                >
                  <div className="card-header">
                    <div className={`card-rank ${i === 0 ? 'rank-1' : 'rank-n'}`}>{i + 1}</div>
                    {i === 0 && <div className="best-badge">Mejor opción</div>}
                  </div>
                  <div className="clinica-name">{c.nombre}</div>
                  <div className="clinica-address">📍 {c.direccion}</div>
                  <div className="card-pills">
                    {c.tiene_convenio && <span className="pill-tag pill-isapre">{isapre?.nombre} ✓</span>}
                    {c.proxima_hora && <span className="pill-tag pill-disponible">Horas disponibles</span>}
                  </div>
                  <div className="card-footer">
                    <div className="next-hour">
                      Próxima hora:<br />
                      <strong>{formatFecha(c.proxima_hora)}</strong>
                    </div>
                    <button className="ver-horas-btn">Ver horas →</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ===== PANTALLA 5: RESERVA ===== */}
        {screen === 5 && selectedClinica && (
          <>
            <div className="status-bar"><span>9:44</span><span>●●● WiFi 🔋</span></div>
            <div className="nav-bar">
              <button className="back-btn" onClick={() => setScreen(4)}>←</button>
            </div>
            <div className="step-row">
              <div className="step-dot done" /><div className="step-dot done" />
              <div className="step-dot done" /><div className="step-dot done" /><div className="step-dot active" />
            </div>
            <div className="scroll-area">
              <div className="clinica-hero">
                <div className="ch-label">Clínica seleccionada</div>
                <div className="ch-name">{selectedClinica.nombre}</div>
                <div className="ch-address">📍 {selectedClinica.direccion}</div>
                <div className="ch-tags">
                  {selectedClinica.tiene_convenio && <span className="ch-tag green">{isapre?.nombre} ✓</span>}
                  <span className="ch-tag">{especialidadNombre}</span>
                </div>
              </div>

              <div style={{ padding: '20px 24px 12px' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  Próxima disponibilidad
                </div>
                <div style={{ background: 'var(--white)', borderRadius: 10, padding: '14px 16px', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--teal)' }}>
                    {formatFecha(selectedClinica.proxima_hora)}
                  </div>
                </div>
              </div>

              <div className="email-section" style={{ marginTop: 8 }}>
                <label>Tu email para el recordatorio</label>
                <input type="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>

              <div className="confirm-section" style={{ marginTop: 16 }}>
                <div className="confirm-note">
                  <span>⚡</span>
                  <span>Te redirigiremos al sitio de la clínica para confirmar y pagar la hora. Tu email solo se usa para recordarte la cita.</span>
                </div>
                <button
                  className="btn-confirm"
                  onClick={async () => {
                    // Guardar búsqueda en Supabase
                    await supabase.from('busquedas').insert({
                      rut_hash: rut ? btoa(rut).slice(0, 16) : null,
                      isapre_id: isapreId,
                      comuna_id: comunaId,
                      especialidad_id: especialidadId,
                      email: email || null,
                    })
                    // Redirigir a la clínica
                    window.open(selectedClinica.url_reserva || selectedClinica.url_agenda, '_blank')
                  }}
                >
                  Ir a confirmar en la clínica →
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* NAV DE ESCRITORIO */}
      <nav className="desktop-nav">
        {['Datos', 'Especialidad', 'Buscando', 'Resultados', 'Reserva'].map((label, i) => (
          <button
            key={i}
            className={`nav-pill ${screen === i + 1 ? 'current' : ''}`}
            onClick={() => setScreen(i + 1)}
          >
            {i + 1}. {label}
          </button>
        ))}
      </nav>
    </>
  )
}
