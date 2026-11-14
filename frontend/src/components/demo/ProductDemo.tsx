import { Badge, Count, Roll, Stage, Window, type Act } from '@/stageshow/kit'
import './atmos.css'

// AtmosFusion: clicking a rain gauge re-weights the six models for that cell.
// Beats: the pointer crosses the map to the Ghats gauge, clicks it, the
// inspector rolls to Lonavala, the weights shift towards WRF and GraphCast,
// the blend rolls to 86 mm and a Heavy rain badge opens. Payoff holds, then a
// click back on Pune City is the visible reset.
//
// Real strings: the station, three model names and their weights, the blend,
// the badge. Everything else is map or bar.

type Id = 'pune' | 'lon'
type S = { sel: Id }

const STATIONS: Record<Id, { name: string; meta: string; w: [number, number, number]; blend: number; heavy: boolean }> = {
  pune: { name: 'Pune City', meta: '559 m · Plateau', w: [38, 27, 14], blend: 12, heavy: false },
  lon: { name: 'Lonavala', meta: '622 m · Ghats', w: [12, 33, 41], blend: 86, heavy: true },
}
const MODELS = [
  { name: 'ECMWF IFS', color: '#3F6FC4' },
  { name: 'GraphCast', color: '#2E9C88' },
  { name: 'WRF 3 km', color: '#93B1DD' },
]

// Gauges in % of the map pane, coloured by IMD category of their blend
const GAUGES: { id?: Id; x: number; y: number; cx?: number; cy?: number; c: string; label?: string }[] = [
  { id: 'lon', x: 22, y: 34, cx: 34, cy: 24, c: '#E5B21F', label: 'Lonavala' },
  { id: 'pune', x: 58, y: 56, cx: 44, cy: 62, c: '#4F9FDB', label: 'Pune City' },
  { x: 36, y: 72, cx: 16, cy: 88, c: '#2F6FC0' },
  { x: 44, y: 22, cx: 72, cy: 44, c: '#4F9FDB' },
  { x: 76, y: 30, c: '#8CC8E8' },
  { x: 82, y: 70, c: '#8CC8E8' },
  { x: 10, y: 86, cx: 70, cy: 90, c: '#E5B21F' },
]

const initial: S = { sel: 'pune' }
const REST = { wide: { x: 560, y: 340 }, compact: { x: 320, y: 300 } }

async function script(a: Act<S>) {
  await a.wait(900)
  a.mark('pick')
  await a.move('g-lon')
  await a.wait(180)
  await a.click()
  await a.set({ sel: 'lon' })
  await a.move({ at: 'g-lon', x: 1.8, y: 2.6 }, { duration: 500 })
  await a.wait(3200)
  a.mark('back')
  await a.move('g-pune')
  await a.wait(180)
  await a.click()
  await a.set({ sel: 'pune' })
  await a.move('rest', { duration: 600 })
  await a.wait(1600)
}

export default function AtmosFusionDemo() {
  return (
    <Stage<S>
      width={720}
      height={440}
      compact={{ below: 640, width: 358, height: 356 }}
      initial={initial}
      poster={{ sel: 'lon' }}
      script={script}
      cursor={{ at: REST }}
      tokens={{ '--ss-accent': '#3B7DC4', '--ss-font': '"IBM Plex Sans", system-ui, sans-serif' }}
      className="af"
    >
      {(s, _rect, layout) => {
        const st = STATIONS[s.sel]
        return (
          <>
            <Window url="atmosfusion-web.netlify.app" urlShape="pill" className="af-win">
              <div className="af-body">
                <aside className="af-inspector">
                  <div className="af-label">Station</div>
                  <div className="af-name">
                    <Roll>{st.name}</Roll>
                  </div>
                  <div className="af-meta">
                    <Roll variant="fade">{st.meta}</Roll>
                  </div>

                  <div className="af-label af-label--sec">Model weights</div>
                  <div className="af-weights">
                    {MODELS.map((m, i) => (
                      <div key={m.name} className="af-weight">
                        <div className="af-weight-line">
                          <span className="af-swatch" style={{ background: m.color }} />
                          <span className="af-model">{m.name}</span>
                          <span className="af-pct">
                            <Count value={st.w[i]} format={(n) => `${Math.round(n)}%`} />
                          </span>
                        </div>
                        <div className="af-track">
                          <div className="af-fill" style={{ width: `${st.w[i] * 2}%`, background: m.color, transitionDelay: `${i * 60}ms` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="af-blend">
                    <div className="af-blend-top">AtmosFusion blend</div>
                    <div className="af-blend-value">
                      <Count value={st.blend} format={(n) => `${Math.round(n)} mm`} duration={800} />
                      <span className="af-badge" data-show={st.heavy || undefined}>
                        <Badge tone="warning">Heavy rain</Badge>
                      </span>
                    </div>
                  </div>
                </aside>

                <div className="af-map" data-layout={layout}>
                  <svg className="af-cells" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                    <path d="M0 48 L30 46 L40 0 M30 46 L48 40 L64 0 M48 40 L66 44 L100 50 M30 46 L26 100 M48 40 L50 100 M66 44 L70 100" vectorEffect="non-scaling-stroke" />
                    <path className="af-river" d="M0 84 C 20 78, 34 90, 52 82 S 82 70, 100 76" vectorEffect="non-scaling-stroke" />
                  </svg>
                  {GAUGES.map((g, i) => (
                    <div
                      key={i}
                      className="af-gauge"
                      data-target={g.id ? `g-${g.id}` : undefined}
                      data-cursor={g.id ? 'pointer' : undefined}
                      data-sel={g.id === s.sel || undefined}
                      style={{ left: `${layout === 'compact' ? (g.cx ?? g.x) : g.x}%`, top: `${layout === 'compact' ? (g.cy ?? g.y) : g.y}%`, ['--c' as string]: g.c }}
                    >
                      <span className="af-dot" />
                      {g.label && <span className="af-tag">{g.label}</span>}
                    </div>
                  ))}
                </div>
              </div>
            </Window>
            <span data-target="rest" style={{ position: 'absolute', left: REST[layout].x, top: REST[layout].y }} />
          </>
        )
      }}
    </Stage>
  )
}
