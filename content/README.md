# Indhold

Al brugervendt tekst på GFC-platformen ligger her, så den kan redigeres uden at røre kode.

Der findes **to slags indhold**:

| Filtype | Bruges til | Hvor |
|---|---|---|
| **Markdown-sider** (`.md`) | Sider med løbende tekst — regler, sponsorer, FAQ, om-sider | `content/sider/` |
| **Tekstfil** (`tekst.ts`) | Strukturerede sider — forsiden, navigation, tilmeldingsformularen | `content/tekst.ts` |

---

## Markdown-sider (anbefalet for nye sider)

Hver `.md`-fil i `content/sider/` bliver til en side på sitet. Filnavnet bliver til URL'en.

| Fil | Bliver til |
|---|---|
| `content/sider/regler.md` | `https://fantasychallenge.dk/regler` |
| `content/sider/sponsorer.md` | `https://fantasychallenge.dk/sponsorer` |

### Sådan tilføjer du en helt ny side

1. Gå til https://github.com/MGuldbjerg/gfc/tree/main/content/sider
2. Tryk **Add file → Create new file**.
3. Navngiv filen efter URL'en du vil have — fx `faq.md` (URL'en bliver `/faq`). Brug kun små bogstaver og bindestreger, ingen mellemrum eller danske tegn i filnavnet.
4. Første linje skal være `# Sidens overskrift` — det bliver siden's titel.
5. Skriv resten i markdown (se eksempel nedenfor).
6. Scroll ned og tryk **Commit new file**.
7. Vercel deployer inden for et minut — så er siden live.

### Sådan tilføjer du linket til menuen

Når du har oprettet en ny side, skal du selv tilføje linket til navigationsbjælken:

1. Åbn `content/tekst.ts`
2. I `nav`-blokken, tilføj fx `faq: 'FAQ',`
3. Åbn `components/Nav.tsx` og tilføj `{ href: '/faq', label: tekst.nav.faq },` til `links`-listen

### Sådan redigerer du en eksisterende side

1. Åbn fx https://github.com/MGuldbjerg/gfc/blob/main/content/sider/regler.md
2. Tryk på blyantsikonet.
3. Ret teksten.
4. Tryk **Commit changes**. Vercel deployer automatisk.

### Markdown-eksempel

```markdown
# Sidens titel

Et almindeligt afsnit. Skriv som i Word eller Mail.

## En underoverskrift

- Punkt et
- Punkt to
- **Fed tekst** og *kursiv*
- Et [link til Google](https://google.com)

### Mindre underoverskrift

> Et citat eller en fremhævet tekst.

| Kolonne 1 | Kolonne 2 |
|-----------|-----------|
| Værdi A   | Værdi B   |
```

---

## Strukturerede sider (`tekst.ts`)

Forsiden, navigationen og tilmeldingsformularen er bygget med struktur (kort, lister, knapper). De redigeres i `content/tekst.ts`.

### Sådan redigerer du

1. Åbn https://github.com/MGuldbjerg/gfc/blob/main/content/tekst.ts
2. Find strengen du vil ændre — den er i anførselstegn.
3. Skift tekst mellem `'` og `'`.
4. **Behold** `'` og `,` præcis som de er.
5. **Behold** `{sæson}` hvor du ser det — det erstattes automatisk med 2026 (eller hvad det aktuelle år er).
6. Tryk **Commit changes**.

### Ændre årstal globalt

Ændr `CURRENT_SEASON = '2026'` i `lib/leagues.ts`. Det opdaterer alle `{sæson}`-pladsholdere i hele sitet.

---

## Hvor må du IKKE redigere?

- `.ts`-filer (TypeScript-kode) — undtagen `tekst.ts` og `lib/leagues.ts` ovenfor.
- `.tsx`-filer — det er sidernes struktur.
- Hvis du er i tvivl, så spørg.
