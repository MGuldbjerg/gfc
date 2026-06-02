// VIP-deltagere — rediger VIPS-arrayet herunder for at opdatere siden.

export const metadata = {
  title: 'VIP-deltagere — GFC',
  description: 'Mød de særligt inviterede VIP-deltagere i Guldbjergs Fantasy Challenge.',
}

type Vip = {
  navn: string
  fra: string
  bio: string
}

const VIPS: Vip[] = [
  {
    navn: 'Navn Navnesen',
    fra: 'København',
    bio: 'Skriv en kort beskrivelse af denne VIP-deltager her. Hvad gør dem særlige, og hvorfor er de med i GFC?',
  },
  {
    navn: 'Anden Deltager',
    fra: 'Aarhus',
    bio: 'Endnu en VIP-deltager med en interessant baggrund. Beskriv dem med et par sætninger.',
  },
  {
    navn: 'Tredje Person',
    fra: 'Odense',
    bio: 'En tredje VIP med sin egen unikke historie. Teksten her vises direkte på siden.',
  },
]

export default function VipPage() {
  return (
    <div className="gfc-app">
      <div className="container">
        <div className="page-head">
          <div className="kicker-strip">
            <span className="dash" />
            <span className="eyebrow">Særligt inviterede</span>
          </div>
          <h1>VIP-deltagere</h1>
          <p className="sub">
            Hvert år inviterer GFC et udvalg af særlige gæster til at deltage i konkurrencen.
            Mød dem her.
          </p>
        </div>

        <div className="vip-grid">
          {VIPS.map((vip, i) => (
            <article key={vip.navn} className="vip-card">
              <div className="vip-card-index eyebrow">{String(i + 1).padStart(2, '0')}</div>
              <div className="vip-card-body">
                <div className="vip-card-name">{vip.navn}</div>
                <div className="vip-card-fra eyebrow">{vip.fra}</div>
                <p className="vip-card-bio">{vip.bio}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
