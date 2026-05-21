export default function TjekMailPage() {
  return (
    <div className="form-page">
      <div className="form-card" style={{ textAlign: 'center' }}>
        <div className="kicker-strip" style={{ justifyContent: 'center', marginBottom: 20 }}>
          <span className="dash" />
          <span className="eyebrow">GFC</span>
        </div>
        <h1 className="form-card-title">Tjek din e-mail</h1>
        <p className="form-card-sub" style={{ marginBottom: 0 }}>
          Vi har sendt dig et link. Klik på det for at logge ind. Linket virker i 24 timer.
        </p>
        <p className="eyebrow" style={{ marginTop: 20 }}>
          Kan du ikke finde mailen? Tjek spam-mappen.
        </p>
      </div>
    </div>
  )
}
