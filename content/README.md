# Indhold

> **Rediger teksten i /admin → fanen "Indhold".** Du behøver ikke røre filerne
> her — de er kun det, siden falder tilbage til, hvis en ændring fortrydes.

## Sådan retter du tekst

1. Gå til <https://www.fantasychallenge.dk/admin> og vælg fanen **Indhold**.
2. **Sider** — regler, FAQ, sponsorer, om-GFC, VIP og alt du selv opretter.
   Vælg siden i listen, ret teksten, tryk **Gem ændringer**. Siden er live inden
   for et minut.
3. **Forside og menu** — de enkelte tekststumper på forsiden, i menuen og i
   tilmeldingsformularen. Ret feltet, tryk **Gem**.

Har du rettet noget, du fortryder, står der en **Fortryd**-knap ved siden af.
Den sætter teksten tilbage til den oprindelige — der er ingen vej til at ødelægge
sitet med en tekstændring.

### Ny side

Under **Sider** → **+ Ny side**. Adressen bliver til URL'en: skriver du
`praemier`, ligger siden på `/praemier`. Sæt flueben i **Vis i menuen**, hvis den
skal stå i navigationsbjælken.

### Pladsholdere

Skriver du en af disse i teksten, bliver den erstattet automatisk overalt:

| Pladsholder | Bliver til | Sættes i |
|---|---|---|
| `{sæson}` | 2026 | Sæson-fanen (aktuel sæson) |
| `{deadline}` | 29. juli kl. 18:00 | Sæson-fanen → Tilmeldingsfrist |
| `{draftstart}` | 4. juli | Sæson-fanen → Nøgledatoer |
| `{fordelingsdato}` | 3. juli | Sæson-fanen → Nøgledatoer |
| `{sæsonstart}` | 10. september | Sæson-fanen → Nøgledatoer |

Så skal en dato kun rettes ét sted, og den er rettet i al tekst på sitet.

### Markdown — sådan formaterer du

```markdown
## En underoverskrift

Et almindeligt afsnit. Skriv som i Word eller Mail.

- Punkt et
- Punkt to
- **Fed tekst** og *kursiv*
- Et [link til Google](https://google.com)

> Et citat eller en fremhævet tekst.

| Kolonne 1 | Kolonne 2 |
|-----------|-----------|
| Værdi A   | Værdi B   |
```

---

## Hvad filerne her så er til

| Fil | Rolle |
|---|---|
| `content/sider/*.md` | Den oprindelige tekst for hver side. Bruges indtil siden rettes i /admin, og igen hvis ændringen fortrydes. |
| `content/tekst.ts` | De oprindelige tekststumper til forside, menu og tilmeldingsformular. Samme rolle. |

Teknisk: en ændring i /admin gemmes som en override i databasen (`side_indhold`
og `tekst_override`) og vinder over filen. Fortryd sletter override-rækken.
Se `lib/indhold.ts`.

**Forside og menu** viser kun de tekststumper, der faktisk står på sitet.
`tekst.ts` indeholder også gamle nøgler (bl.a. `tilmeld.*`), som ingen side
læser — tilmeldingsformularen har sin egen tekst i koden. De vises ikke i
/admin, fordi et felt, der ikke gør noget, er værre end intet felt.
Skal formularens tekst kunne redigeres, er det en kodeopgave.

## Hvor må du IKKE redigere?

- `.ts`- og `.tsx`-filer — det er kode.
- Er du i tvivl, så spørg.
