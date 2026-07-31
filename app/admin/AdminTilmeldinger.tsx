'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// email comes from the Auth.js user sharing the profile id — null means the
// player has no login account and can only be managed from here.
type Profil = { display_name: string; username: string; id: string; email: string | null }

// A profile carries at most one VIP tag; the two flags are mutually exclusive.
type VipType = 'amerikansk' | 'dansk' | 'none'

export interface Tilmelding {
  id: string
  season: string
  preferred_types: string[]
  assigned_league_name: string | null
  status: string
  created_at: string
  nyhedsbrev: boolean
  erAmerikanskVip: boolean
  erDanskVip: boolean
  undgaaAmerikanskVip: boolean
  profiles: Profil | Profil[] | null
}

function getProfil(profiles: Tilmelding['profiles']): Profil | null {
  if (!profiles) return null
  return Array.isArray(profiles) ? profiles[0] ?? null : profiles
}

function vipTypeOf(t: Tilmelding): VipType {
  return t.erAmerikanskVip ? 'amerikansk' : t.erDanskVip ? 'dansk' : 'none'
}

const FILTERKNAPPER = ['alle', 'bestball', 'managed', 'chopped']
const RÆKKEVALGMULIGHEDER = ['bestball', 'managed', 'chopped']

export default function AdminTilmeldinger({ tilmeldinger }: { tilmeldinger: Tilmelding[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState<string>('alle')
  const [søgning, setSøgning] = useState('')
  const [vipState, setVipState] = useState<Record<string, VipType>>(
    Object.fromEntries(tilmeldinger.map(t => [getProfil(t.profiles)?.id ?? '', vipTypeOf(t)]))
  )
  const [editId, setEditId] = useState<string | null>(null)
  const [editData, setEditData] = useState<{
    displayName: string
    sleeperUsername: string
    email: string
    preferredTypes: string[]
  }>({ displayName: '', sleeperUsername: '', email: '', preferredTypes: [] })
  const [editSaving, setEditSaving] = useState(false)
  const [editFejl, setEditFejl] = useState('')
  const [localUpdates, setLocalUpdates] = useState<Record<string, Partial<Tilmelding & { display_name: string; username: string; email: string }>>>({})

  // Manual "add player" form
  const [tilføjÅben, setTilføjÅben] = useState(false)
  const [tilføjData, setTilføjData] = useState<{
    displayName: string
    sleeperUsername: string
    email: string
    preferredTypes: string[]
    vip: VipType
    undgaaAmerikanskVip: boolean
  }>({ displayName: '', sleeperUsername: '', email: '', preferredTypes: [], vip: 'none', undgaaAmerikanskVip: false })
  const [tilføjGemmer, setTilføjGemmer] = useState(false)
  const [tilføjFejl, setTilføjFejl] = useState('')

  // Clicking a VIP flag sets that type, or clears it if it was already active.
  // The two flags are mutually exclusive, so this also clears the other one.
  async function setVip(profileId: string, klikket: 'amerikansk' | 'dansk') {
    const nuværende = vipState[profileId] ?? 'none'
    const næste: VipType = nuværende === klikket ? 'none' : klikket
    setVipState(prev => ({ ...prev, [profileId]: næste }))
    await fetch('/api/admin/profil/vip', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId, vip: næste }),
    })
  }

  function toggleTilføjRække(type: string) {
    setTilføjData(prev => ({
      ...prev,
      preferredTypes: prev.preferredTypes.includes(type)
        ? prev.preferredTypes.filter(r => r !== type)
        : [...prev.preferredTypes, type],
    }))
  }

  async function tilføjDeltager() {
    setTilføjGemmer(true)
    setTilføjFejl('')
    try {
      const res = await fetch('/api/admin/tilmelding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tilføjData),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Ukendt fejl')
      setTilføjData({ displayName: '', sleeperUsername: '', email: '', preferredTypes: [], vip: 'none', undgaaAmerikanskVip: false })
      setTilføjÅben(false)
      router.refresh()
    } catch (e) {
      setTilføjFejl(e instanceof Error ? e.message : 'Noget gik galt')
    } finally {
      setTilføjGemmer(false)
    }
  }

  function startEdit(t: Tilmelding) {
    const profil = getProfil(t.profiles)
    setEditId(t.id)
    setEditFejl('')
    setEditData({
      displayName: profil?.display_name ?? '',
      sleeperUsername: profil?.username ?? '',
      email: (localUpdates[t.id]?.email as string | undefined) ?? profil?.email ?? '',
      preferredTypes: [...(t.preferred_types ?? [])],
    })
  }

  function toggleRække(type: string) {
    setEditData(prev => ({
      ...prev,
      preferredTypes: prev.preferredTypes.includes(type)
        ? prev.preferredTypes.filter(r => r !== type)
        : [...prev.preferredTypes, type],
    }))
  }

  async function saveEdit(registrationId: string) {
    setEditSaving(true)
    setEditFejl('')
    try {
      const res = await fetch(`/api/admin/tilmelding/${registrationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferredTypes: editData.preferredTypes,
          displayName: editData.displayName,
          sleeperUsername: editData.sleeperUsername,
          email: editData.email,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Ukendt fejl')
      setLocalUpdates(prev => ({
        ...prev,
        [registrationId]: {
          preferred_types: editData.preferredTypes,
          display_name: editData.displayName,
          username: editData.sleeperUsername,
          email: editData.email.trim().toLowerCase(),
        },
      }))
      setEditId(null)
    } catch (e) {
      setEditFejl(e instanceof Error ? e.message : 'Noget gik galt')
    } finally {
      setEditSaving(false)
    }
  }

  const filtrerede = tilmeldinger.filter(t => {
    const updates = localUpdates[t.id]
    const types = (updates?.preferred_types as string[] | undefined) ?? t.preferred_types
    const matchFilter = filter === 'alle' || types?.includes(filter)
    const profil = getProfil(t.profiles)
    const navn = (updates?.display_name as string | undefined) ?? profil?.display_name ?? ''
    const brugernavn = (updates?.username as string | undefined) ?? profil?.username ?? ''
    const matchSøgning = søgning === '' ||
      navn.toLowerCase().includes(søgning.toLowerCase()) ||
      brugernavn.toLowerCase().includes(søgning.toLowerCase())
    return matchFilter && matchSøgning
  })

  return (
    <div>
      <div className="lb-section-head">
        Tilmeldinger
        <span className="dash" />
      </div>

      <div style={{ marginBottom: 16 }}>
        <button
          onClick={() => { setTilføjÅben(o => !o); setTilføjFejl('') }}
          className="btn ghost"
        >
          {tilføjÅben ? '✕ Annullér' : '+ Tilføj deltager manuelt'}
        </button>

        {tilføjÅben && (
          <div className="lb-col" style={{ marginTop: 12, padding: '20px 24px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 160 }}>
                <span className="eyebrow">Visningsnavn</span>
                <input
                  className="gfc-input"
                  value={tilføjData.displayName}
                  onChange={e => setTilføjData(p => ({ ...p, displayName: e.target.value }))}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 160 }}>
                <span className="eyebrow">Sleeper-brugernavn</span>
                <input
                  className="gfc-input mono"
                  value={tilføjData.sleeperUsername}
                  onChange={e => setTilføjData(p => ({ ...p, sleeperUsername: e.target.value }))}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 200 }}>
                <span className="eyebrow">E-mail (login)</span>
                <input
                  className="gfc-input"
                  type="email"
                  placeholder="valgfri"
                  value={tilføjData.email}
                  onChange={e => setTilføjData(p => ({ ...p, email: e.target.value }))}
                />
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span className="eyebrow">Rækker</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', height: 38 }}>
                  {RÆKKEVALGMULIGHEDER.map(type => (
                    <label key={type} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 13 }}>
                      <input
                        type="checkbox"
                        checked={tilføjData.preferredTypes.includes(type)}
                        onChange={() => toggleTilføjRække(type)}
                      />
                      {type}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center', marginTop: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span className="eyebrow">VIP</span>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', height: 24 }}>
                  {([
                    { v: 'none', label: 'Ingen' },
                    { v: 'amerikansk', label: '🇺🇸 Amerikansk' },
                    { v: 'dansk', label: '🇩🇰 Dansk' },
                  ] as const).map(({ v, label }) => (
                    <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 13 }}>
                      <input
                        type="radio"
                        name="tilføj-vip"
                        checked={tilføjData.vip === v}
                        onChange={() => setTilføjData(p => ({ ...p, vip: v }))}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, marginTop: 18 }}>
                <input
                  type="checkbox"
                  checked={tilføjData.undgaaAmerikanskVip}
                  onChange={e => setTilføjData(p => ({ ...p, undgaaAmerikanskVip: e.target.checked }))}
                />
                Undgå amerikansk VIP i samme liga
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16 }}>
              <button
                className="btn"
                disabled={tilføjGemmer || !tilføjData.displayName.trim() || !tilføjData.sleeperUsername.trim()}
                onClick={tilføjDeltager}
              >
                {tilføjGemmer ? 'Tilføjer…' : 'Tilføj deltager'}
              </button>
              {tilføjFejl && <p style={{ color: 'var(--accent)', fontSize: 13, margin: 0 }}>{tilføjFejl}</p>}
            </div>

            <p style={{ fontSize: 12, color: 'var(--muted)', margin: '10px 0 0' }}>
              Med en e-mail kan deltageren selv logge ind på fantasychallenge.dk med et magisk link
              og modtager ligabesked. Uden e-mail bliver profilen kun administreret herfra.
            </p>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Søg navn eller Sleeper-brugernavn..."
          value={søgning}
          onChange={e => setSøgning(e.target.value)}
          className="gfc-input"
          style={{ flex: 1, minWidth: 220 }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {FILTERKNAPPER.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={f !== 'alle' ? `type-badge ${f}` : 'type-badge'}
              style={{
                cursor: 'pointer', fontSize: 11, padding: '6px 14px',
                background: filter === f ? 'var(--ink)' : undefined,
                color: filter === f ? 'var(--bg)' : undefined,
                borderColor: filter === f ? 'var(--ink)' : undefined,
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="lb-col" style={{ padding: 0 }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Deltager</th>
              <th>Sleeper</th>
              <th>Rækker</th>
              <th>Liga</th>
              <th>Status</th>
              <th className="c">Mail</th>
              <th className="c">🇺🇸 VIP</th>
              <th className="c">🇩🇰 VIP</th>
              <th className="c">Undgå 🇺🇸</th>
              <th>Tilmeldt</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtrerede.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>
                  Ingen tilmeldinger
                </td>
              </tr>
            ) : filtrerede.map(t => {
              const profil = getProfil(t.profiles)
              const updates = localUpdates[t.id]
              const visNavn = (updates?.display_name as string | undefined) ?? profil?.display_name ?? '—'
              const visBrugernavn = (updates?.username as string | undefined) ?? profil?.username ?? '—'
              const visTypes = (updates?.preferred_types as string[] | undefined) ?? t.preferred_types
              const visEmail = (updates?.email as string | undefined) ?? profil?.email ?? null
              const isEditing = editId === t.id

              return (
                <>
                  <tr key={t.id} style={isEditing ? { background: 'var(--bg-2)' } : undefined}>
                    <td className="name">
                      {visNavn}
                      <div style={{ fontSize: 11, color: visEmail ? 'var(--muted)' : 'var(--accent)', fontWeight: 400 }}>
                        {visEmail ?? 'ingen login-mail'}
                      </div>
                    </td>
                    <td className="mono" style={{ fontSize: 12 }}>{visBrugernavn}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {visTypes?.map(type => (
                          <span key={type} className={`type-badge ${type}`}>{type}</span>
                        ))}
                      </div>
                    </td>
                    <td>{t.assigned_league_name ?? '—'}</td>
                    <td>
                      <span
                        className="type-badge"
                        style={t.status === 'assigned' || t.status === 'active'
                          ? { color: 'var(--pos)', borderColor: 'color-mix(in oklch, var(--pos) 30%, transparent)', background: 'color-mix(in oklch, var(--pos) 10%, var(--bg))' }
                          : undefined}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="c" style={{ fontSize: 16 }} title={t.nyhedsbrev ? 'Tilmeldt nyhedsbrev' : 'Frameldt nyhedsbrev'}>
                      {t.nyhedsbrev ? '✓' : '–'}
                    </td>
                    <td className="c">
                      {profil && (
                        <button
                          onClick={() => setVip(profil.id, 'amerikansk')}
                          title={vipState[profil.id] === 'amerikansk' ? 'Fjern amerikansk VIP' : 'Marker som amerikansk VIP'}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, opacity: vipState[profil.id] === 'amerikansk' ? 1 : 0.25, padding: 0 }}
                        >
                          🇺🇸
                        </button>
                      )}
                    </td>
                    <td className="c">
                      {profil && (
                        <button
                          onClick={() => setVip(profil.id, 'dansk')}
                          title={vipState[profil.id] === 'dansk' ? 'Fjern dansk VIP' : 'Marker som dansk VIP'}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, opacity: vipState[profil.id] === 'dansk' ? 1 : 0.25, padding: 0 }}
                        >
                          🇩🇰
                        </button>
                      )}
                    </td>
                    <td className="c" style={{ fontSize: 14, color: t.undgaaAmerikanskVip ? 'var(--accent)' : 'var(--muted)', opacity: t.undgaaAmerikanskVip ? 1 : 0.3 }}>
                      {t.undgaaAmerikanskVip ? '✓' : '–'}
                    </td>
                    <td className="mono" style={{ fontSize: 11 }}>
                      {new Date(t.created_at).toLocaleDateString('da-DK')}
                    </td>
                    <td className="c">
                      <button
                        onClick={() => isEditing ? setEditId(null) : startEdit(t)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: isEditing ? 'var(--accent)' : 'var(--muted)', fontSize: 13, padding: '2px 6px' }}
                        title="Rediger tilmelding"
                      >
                        {isEditing ? '✕' : '✎'}
                      </button>
                    </td>
                  </tr>

                  {isEditing && (
                    <tr key={`${t.id}-edit`}>
                      <td colSpan={11} style={{ padding: '16px 20px 20px', background: 'var(--bg-2)', borderBottom: '2px solid var(--line)' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 160 }}>
                            <span className="eyebrow">Visningsnavn</span>
                            <input
                              className="gfc-input"
                              value={editData.displayName}
                              onChange={e => setEditData(p => ({ ...p, displayName: e.target.value }))}
                            />
                          </label>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 160 }}>
                            <span className="eyebrow">Sleeper-brugernavn</span>
                            <input
                              className="gfc-input mono"
                              value={editData.sleeperUsername}
                              onChange={e => setEditData(p => ({ ...p, sleeperUsername: e.target.value }))}
                            />
                          </label>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 200 }}>
                            <span className="eyebrow">E-mail (login)</span>
                            <input
                              className="gfc-input"
                              type="email"
                              placeholder="ingen — kan ikke logge ind"
                              value={editData.email}
                              onChange={e => setEditData(p => ({ ...p, email: e.target.value }))}
                            />
                          </label>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <span className="eyebrow">Rækker</span>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', height: 38 }}>
                              {RÆKKEVALGMULIGHEDER.map(type => (
                                <label key={type} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 13 }}>
                                  <input
                                    type="checkbox"
                                    checked={editData.preferredTypes.includes(type)}
                                    onChange={() => toggleRække(type)}
                                  />
                                  {type}
                                </label>
                              ))}
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            {editFejl && <p style={{ color: 'var(--accent)', fontSize: 12, margin: 0 }}>{editFejl}</p>}
                            <button
                              className="btn"
                              disabled={editSaving}
                              onClick={() => saveEdit(t.id)}
                              style={{ alignSelf: 'flex-end' }}
                            >
                              {editSaving ? 'Gemmer…' : 'Gem'}
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="eyebrow" style={{ marginTop: 12 }}>
        {filtrerede.length} af {tilmeldinger.length} tilmeldinger
      </p>
    </div>
  )
}
