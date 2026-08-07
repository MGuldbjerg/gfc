# Playbook: fra GFC til Nordic Fantasy Challenge

**Skrevet efter 2026-sæsonens drift (august 2026). Skrevet til den session, der
begynder på NFC — læs den FØR du rører noget, og følg rækkefølgen.**

Dette er ikke GFC-dokumentation (`CLAUDE.md` er filkortet, `projekt-status.md`
er changeloggen). Dette er opskriften på at gøre motoren fler-lands, destilleret
af hvad der faktisk bar, og hvad der vil knække stille, hvis man bolter lande på
bagefter.

Forudsætter `CLAUDE.md` — læs den først. Markedsdelen ligger i
`STRATEGI_international-norden.md`; den tekniske lærdomsledger i
`SKALERING_nfc-readiness.md`.

---

## 0. Den ene ting du skal forstå først

**`liga_navn` ("BB1", "M2", "C1") er en nøgle, der bliver *parset* — ikke en
etiket. Land må ALDRIG puttes ind i den strengen.**

Seks steder udleder betydning af tegnene i navnet:

| Sted | Hvad det udleder |
|---|---|
| `lib/fordeling.ts` `typeForNavn()` | `startsWith('BB' / 'M' / 'C')` → rækken |
| `lib/leagues.ts` `sleeperIdForLigaNavn()` | `^[A-Z]+` + `\d+$` → række + nummer |
| `lib/leagues.ts` `navnForLiga()` | bygger navnet af præfiks + nummer |
| `lib/seasonConfig.ts` | `\d+$` → nummer, når DB-ligaer flettes ind |
| `app/api/admin/saeson/route.ts` | validerer `/^(BB|M|C)\d+$/` |
| `league_assignments.liga_navn` | join-nøglen i hele fordelingen |

Skriver du `"DK-BB1"` eller `"BB1-NO"`, matcher `typeForNavn()` ingenting og
returnerer `null`. Og i `beregnFordeling` står der:

```ts
const type = typeForNavn(pin.ligaNavn)
if (!type) continue
```

**VIP-pins forsvinder lydløst.** Ingen fejl, ingen advarsel — den pinnede person
ender bare i en tilfældig liga. Det er nøjagtig den slags fejl, man opdager tre
uger senere, når en amerikansk gæst sidder i den forkerte liga.

**Gør i stedet:** land er en *egen kolonne* ved siden af `league_type`, aldrig
en del af navnet. Navnet forbliver `"BB1"`. Unikhed bliver `(season, land,
liga_navn)`. Så er de seks parse-steder uændrede og stadig korrekte.

Kør denne før du designer noget som helst, så du selv ser listen:

```bash
grep -rnE "startsWith\('(BB|M|C)'\)|\^\[A-Z\]\+|\(BB\|M\|C\)|TYPE_PRÆFIKS" lib app --include=*.ts --include=*.tsx
```

---

## 1. Rækkefølgen (bindende hvor markeret)

| # | Trin | Bindende? | Lead time |
|---|------|-----------|-----------|
| 1 | Beslut landemodellen (§2) | **FØR alt andet** | timer |
| 2 | `land` som eksplicit kolonne i schema + kode | **FØR 4** | 1 dag |
| 3 | Udvid de tre unikhedsnøgler uden land (§3) | **FØR 4** | timer |
| 4 | Fordeling pr. (land, række) — algoritmen er uændret | FØR 7 | ½ dag |
| 5 | Frist + sene tilmeldinger pr. land (§3) | FØR 7 | ½ dag |
| 6 | Admin-roller pr. land | FØR 8 | 1-2 dage |
| 7 | **Opret Sleeper-ligaer + invitér** | — | **uger, manuelt** |
| 8 | Indhold + domæne pr. land | — | dage |
| 9 | Offentligt push | — | — |

**Trin 7 er den eneste ægte flaskehals.** Sleepers API er read-only (verificeret
mod docs.sleeper.com): liga-oprettelse og per-deltager-invitationer kan kun
gøres i hånden i appen. GFC 2026 = 14 ligaer. NFC med fire lande × tre rækker
lander let på 40+. Det er dét, der koster uger — ikke koden. Planlæg derefter,
og byg admin-værktøj der komprimerer det manuelle arbejde (tjeklister,
invite-links pr. liga), ikke kode der lader som om API'et kan skrive.

Alt andet kan laves mens ligaerne oprettes.

---

## 2. Beslut landemodellen først

Der er to modeller, og de har vidt forskellige konsekvenser:

**A. Land = skillevæg (anbefalet).** Hver liga hører til ét land. En dansker
spiller i danske ligaer. Fordelingen kører så den eksisterende algoritme **én
gang pr. (land, række)** — `beregnFordeling` skal ikke skrives om, kun kaldes i
en løkke. Leaderboard kan vises pr. land og samlet.

**B. Land = attribut, ligaer er blandede.** Alle nordboer i samme pulje, land er
bare et flag på personen. Kræver at fordelingen kender land som blød
begrænsning — samme mekanik som US-VIP-undgåelsen i dag (`isCompatible`), som
allerede er en blød "prefer separation, fall back to mixing"-regel.

Mikkel har (2026-08-07) sagt **ligaer pr. nordisk land**, altså model A.
Genåbn ikke uden grund — model B ændrer fordeling, leaderboard og præmier på én
gang.

Konsekvens af A, som er let at overse: **en person hører til ét land.** Læg
landet på profilen, ikke på tilmeldingen — ellers skal du beslutte, hvad der sker,
når en person skifter land mellem sæsoner.

---

## 3. Fælder — med det symptom, der afslører dem

**`leaderboard_cache` har ingen landedimension.**
`UNIQUE(season, league_type)` i `db/schema.sql`. To lande skriver til samme
række. *Symptom:* Norges leaderboard viser danske hold, eller tallene skifter
alt efter hvilken cron der kørte sidst. Rettes ved at tilføje `land` til
nøglen — og husk `/api/revalidate` + `/api/admin/opdater`, som begge skriver
den med `${sæson}-${type}` som id.

**`season_settings` har `season` som PRIMARY KEY.**
Frist, invitationskode og nøgledatoer er dermed globale. *Symptom:* du lukker
tilmeldingen i Danmark, og Norge lukker med. Sene tilmeldinger regnes desuden
mod den ene frist (`erSenTilmelding`), så hele ventepulje-logikken bliver
forkert for alle andre lande end det, fristen var sat for.

**`registrations` har `UNIQUE(profile_id, season)`.**
Én tilmelding pr. person pr. sæson. Skal en person kunne spille i to lande
(dansker bosat i Sverige), er den nøgle i vejen. Beslut det bevidst — svaret er
formentlig nej, men så skriv det ned.

**`ADMIN_EMAILS` er én global admin-liste.**
Alle admins kan alt i alle lande. *Symptom:* den svenske arrangør kan slette den
danske fordeling. Rolle-/rettighedsmodel pr. land er trin 6 og er ikke bygget.

**Fordelingen overskriver hele sæsonen.**
`/api/admin/fordel/bekraeft` rydder og genskriver. Med flere lande skal den
begrænses til det land, den kører for — ellers sletter en dansk fordeling de
norske placeringer. *Symptom:* et helt lands ligaer står pludselig tomme.

**Sleeper-ændringer forplanter sig ikke af sig selv.**
Ligaer oprettet eller ændret i appen er usynlige for sitet, til nogen tilføjer
dem i `ALL_LEAGUES`. *Symptom:* en liga findes i Sleeper, men ingen steder på
sitet — leaderboard, historik og draftstatistik tæller den ikke med. Kør
`scripts/synk-liga-fra-sleeper.mjs <sæson> <ligaNavn> <sleeperId>` for at
afstemme medlemmerne bagefter (tørkørsel som standard).

**Profil uden tilmelding er et hul, ikke en fejl.**
Deadline-gaten lukker `/saeson/tilmeld`, men ikke `/profil-setup`. Folk kan
oprette profil efter fristen og stå uden tilmelding — usynlige i Tilmeldinger,
men med brugernavnet optaget, så "tilføj manuelt" svarer *"Det Sleeper-brugernavn
er allerede registreret"*. Ventepuljens tredje gruppe fanger dem nu. Byg samme
gruppe i NFC fra dag ét, eller opdag dem aldrig.

---

## 4. Hvad der bæres over uændret (byg det ikke om)

Det her virker og er afprøvet i drift. Kopiér mønsteret, ikke bare koden.

- **Kode-standard + DB-override.** Koden er standarden, databasen overskriver
  den, sletning af rækken fortryder. Alt Mikkel selv skal kunne ændre, ligger i
  `/admin` under den model — og ingen redigering kan ødelægge sitet permanent.
  Alle DB-opslag falder tilbage til koden, hvis en tabel mangler, så appen
  bygger og kører på en umigreret database. **Det her er det vigtigste enkelte
  mønster at tage med.**
- **Fordelingsalgoritmen** (`lib/fordeling.ts`): færre præferencer først,
  kapacitets-flooring pr. række, VIP-pinning, US-VIP-undgåelse som blød
  begrænsning. Kald den pr. (land, række) — den skal ikke skrives om.
- **Sene tilmeldinger sidst.** `senTilmelding` er primær sorteringsnøgle og
  indgår i tier-nøglen, så en sen tilmelding aldrig blandes ind blandt dem, der
  nåede fristen — den får kun en plads, der ellers ville stå tom. Reglen er
  Mikkels, ikke teknisk: *ingen sen tilmelding før nogen, der nåede fristen.*
- **Ventepulje i tre grupper:** tilmeldt til tiden · sen tilmelding · nåede ikke
  at tilmelde sig. Rækkefølgen ER reglen, og den gør den synlig i stedet for at
  gemme den i en sorteringsfunktion.
- **Byt ud som én handling** (⇄), ikke fjern-så-tilføj: pladsen står aldrig tom,
  og mailen går til den, der kommer ind.
- **Leaderboard-cache-mønsteret:** tung beregning → gem → hurtige reads. Husk
  landedimensionen (§3).
- **Brevo:** transactional API til 1:1, campaign API til lister (håndterer
  afmeldingslinks automatisk). Rate-limit ethvert offentligt mail-sendende
  endpoint fra dag ét — magic-link-endpointet var en email-bomber-vektor.
- **Zero-token indholdsautomatisering** (ugeresumé bygget af skabelon + data).
  Lokalisér den; erstat den ikke med LLM-kald.
- **Sprogversionering = separate domæner**, ikke i18n-routing.
- **Tonalitet: altid positiv, aldrig udstilling af dårlige scores** (slutspil er
  undtagelsen). Gælder også automatisk genereret indhold.

---

## 5. Sådan verificerer du, at land faktisk er trængt igennem

Kør disse, når du tror, du er færdig. Hvert fund skal besvares med *"skal det
her vide hvilket land, eller er det ligegyldigt?"*

```bash
# 1. Forespørgsler på sæson uden land — kandidater til at blande lande sammen
grep -rn "WHERE season = ?\|season = ?" app lib --include=*.ts | grep -v "land\|country"

# 2. De tre unikhedsnøgler der manglede land
grep -nE "UNIQUE\(" db/schema.sql

# 3. Steder der stadig parser betydning ud af liganavnet (§0)
grep -rnE "startsWith\('(BB|M|C)'\)|\^\[A-Z\]\+|\(BB\|M\|C\)" lib app --include=*.ts --include=*.tsx

# 4. Cache-id'er bygget uden land
grep -rn 'leaderboard_cache' app lib --include=*.ts
```

Og til sidst det, der reelt beviser noget: **kør fordelingen for to lande efter
hinanden og tjek, at det første lands placeringer stadig står.** Det er den
fejl, der gør mest skade og er lettest at overse, fordi hvert enkelt kald ser
rigtigt ud.

---

## 6. Hvad der IKKE er løst (arv til NFC)

Ærligt regnskab — det her er stadig åbent i GFC og bliver værre med flere lande:

- **Sleeper-oprettelse og invitationer er manuelle.** Ingen kode fikser det.
  Enten admin-værktøj der komprimerer arbejdet, eller en platform med write-API.
- **Én arrangør driver alt.** Ingen roller, ingen pr.-land-admins.
- **Kommunikation = én Facebook-gruppe.** Skalerer ikke over sprog og lande.
- **Leaderboardet henter alle uger for alle ligaer.** Kaldmængden vokser lineært
  med ligaer × uger. Cachen afbøder, men ved 40+ ligaer skal beregningen
  formentlig batches.
- **Ingen automatisk afstemning mod Sleeper.** `synk-liga-fra-sleeper.mjs` er
  manuel og pr. liga. Med mange ligaer bør den køre som cron over dem alle og
  rapportere afvigelser i stedet for at kræve, at nogen opdager dem.
- **Præmier og slutspilsformat på tværs af lande er ikke tænkt igennem.** Det er
  et produktspørgsmål, ikke et teknisk — men det binder på datamodellen, så tag
  det inden trin 2.
