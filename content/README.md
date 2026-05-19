# Indhold

Denne mappe indeholder al brugervendt tekst på GFC-platformen.

## Sådan redigerer du tekst

**Du behøver ikke at kunne kode for at ændre tekst.** Bare åbn `tekst.ts` og redigér de strenge der står i anførselstegn.

### Eksempel
For at ændre overskriften på forsiden, find linjen:
```ts
titel: 'Danmarks største fantasy football-konkurrence',
```
og skift teksten mellem `'` og `'` — fx:
```ts
titel: 'Danmarks ENESTE fantasy football-konkurrence',
```

### Vigtige regler
- Behold `'` (anførselstegn) i begge ender af teksten.
- Behold `,` (komma) i slutningen af linjen.
- Tegn som æ, ø, å, ?, !, og emojis virker fint.
- Hvis din tekst skal indeholde et `'`, brug `\'` eller skift hele teksten til `"..."` med dobbelt-anførselstegn.

### Pladsholdere
- `{sæson}` bliver automatisk erstattet med det aktuelle sæsonår (fx `2026`).
- Hvis du vil opdatere året over hele siden, så skift `CURRENT_SEASON` i filen `lib/leagues.ts`.

### Sådan får du dine ændringer ud på sitet
1. Åbn filen på GitHub (https://github.com/MGuldbjerg/gfc/blob/main/content/tekst.ts) — klik på blyantsikonet.
2. Lav dine ændringer i editoren.
3. Scroll ned og tryk **Commit changes**.
4. Vercel deployer automatisk inden for et minut — tjek sitet bagefter.

Hvis du foretrækker at arbejde lokalt: rediger filen i en hvilken som helst editor, `git add`, `git commit`, `git push`.

## Filer

- `tekst.ts` — alle strenge, grupperet efter side (nav, landing, tilmeld).
- Senere kan flere sektioner tilføjes (fx leaderboard, indstillinger).
