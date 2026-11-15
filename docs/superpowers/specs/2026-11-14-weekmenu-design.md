# Weekmenu — ontwerp

Datum: 2026-11-14 · Status: concept, wacht op goedkeuring

## 1. Doel en waarom

Een gratis tool op de telefoon die elke week recepten voorstelt. De eigenaar kiest uit die voorstellen voor de week. De tool maakt daarvan één boodschappenlijst en laat zien bij welke winkel, of welke combinatie van twee winkels, die het goedkoopst is.

De aanleiding is de bestaande app Suppie. Die maakt een weekmenu op basis van aanbiedingen, maar heeft drie tekortkomingen:

- Je kunt maar één supermarkt tegelijk kiezen, dus er is geen prijsvergelijking.
- Wie meer recepten wil, moet een abonnement nemen (€1,99 per week tot €49,99 per jaar).
- Er zitten geen voedingswaarden in. Suppie geeft zelfs uitdrukkelijk geen voedingsadvies.

Deze tool richt zich daarom zowel op de **kosten** per recept als op de **voedingswaarden**. Je kunt filteren op bijvoorbeeld "veel eiwit" of "gezond".

Gebruikers: een huishouden van 2 personen, op één telefoon.

## 2. Doelen

1. Elke week een set receptvoorstellen, afgestemd op de aanbiedingen van die week bij **Albert Heijn, Jumbo, Aldi en Lidl**.
2. Per recept zichtbaar: de **prijsindicatie** voor 2 personen en de **voedingswaarden per portie** (kcal, eiwit, koolhydraten, vet, vezels, zout).
3. **Filters**: veel eiwit, maximaal aantal kcal, vegetarisch, snel, maximale prijs per portie.
4. **Wisselen**: een recept dat je niet wilt, vervang je door een ander voorstel. Afgewezen recepten mogen in latere weken terugkomen.
5. Een knop **"Lust ik niet"**, bij een recept en bij een ingrediënt. Wat je daarmee wegzet, komt nooit meer terug.
6. Eén **boodschappenlijst** voor de gekozen recepten, met afvinken in de winkel.
7. **Winkelvergelijking**: de goedkoopste losse winkel en het goedkoopste **paar van twee winkels**. Hooguit 2 winkels per week.
8. Alles werkt op de telefoon. Na de eenmalige installatie is geen laptop meer nodig.

## 3. Niet-doelen

- Geen AI die tijdens het gebruik draait. Recepten komen uit een vaste bibliotheek.
- Geen accounts en geen synchronisatie tussen telefoons. Eén telefoon is genoeg.
- Geen online bestellen of winkelmandjes vullen bij supermarkten.
- Geen persoonlijke voedingsdoelen per dag of week, geen tracking per persoon. Filteren is voldoende.
- Geen pushmeldingen.
- Geen App Store-app.

## 4. Anti-doelen (dan is het mislukt, ook als het technisch werkt)

- Het kost geld: een abonnement, een betaalde API, betaalde hosting of AI-kosten.
- Er zit een limiet op het aantal recepten of het aantal wissels.
- Je hebt de laptop nodig voor het wekelijkse gebruik.
- Prijzen lijken exact terwijl ze geschat zijn. Een geschatte prijs moet altijd herkenbaar zijn.
- Een recept of ingrediënt met "Lust ik niet" komt toch terug.

## 5. Randvoorwaarden

- **€0 per maand.** Gratis hosting en gratis geplande taken.
- **Prijsdata is onofficieel.** Geen van de vier ketens heeft een publieke API. Prijzen komen uit de interne koppelingen van de supermarktapps en uit de websites, zoals bestaande scrapers die ook gebruiken (bijvoorbeeld `supermarktconnector` en diverse Apify-actors). Die kunnen zonder waarschuwing veranderen. De tool moet daarom blijven werken als een winkel een week geen data levert: dan toont hij de prijzen van vorige week met een melding.
- **Lidl** zet online vrijwel alleen prijzen van aanbiedingen. Het vaste assortiment staat er meestal zonder prijs. **Aldi** toont het grootste deel van het assortiment met prijzen. AH en Jumbo hebben een volledige catalogus.
- **Voedingswaarden** komen uit NEVO-online (RIVM). Die mogen alleen ongewijzigd worden gebruikt, met bronvermelding en versienummer: "NEVO-online versie 2025/9.0, RIVM, Bilthoven". Die vermelding komt in de app.
- **Geen overgenomen recepten.** Recepten van Allerhande en vergelijkbare sites vallen onder auteursrecht. De bibliotheek wordt eigen werk.
- **Taal.** De interface is Nederlands. Code en identifiers zijn Engels.
- **Bouwregels** zoals in `C:\Projects\HuishoudSaven\basis regels.md`: simpelst eerst, geen speculatieve abstracties, en elke taak eindigt met een verifieerbaar criterium.

## 6. Aanpakken (overwogen)

| Aanpak | Afweging | Besluit |
|---|---|---|
| **A. Web-app op het beginscherm + wekelijkse prijstaak via GitHub** | Gratis, werkt op iPhone en Android, geen App Store. Minder gepolijst dan een echte app. | **Gekozen door de eigenaar** |
| B. Echte iPhone-app | Het meest gepolijst, maar kost €99 per jaar of vraagt elke 7 dagen herinstallatie via de laptop. | Afgewezen: botst met "gratis" en "geen laptop" |
| C. Mealie + MealieShopper, zelf gehost | Bestaat al, maar heeft een server nodig die altijd aanstaat, ondersteunt geen Aldi en Lidl en heeft geen voedingswaarden. | Afgewezen |
| Onderdeel van HuishoudSaven | Draait lokaal op de laptop, die dan aan moet staan. | Afgewezen door de eigenaar: **losse app** |

## 7. Wat de eigenaar heeft besloten

- Aanpak A, een losse app, op één telefoon.
- Winkels: AH, Jumbo, Aldi en Lidl. De lijst mag verdeeld worden over **hooguit 2 winkels** per week, zodat je het voordeligst uit bent.
- De tool stelt de recepten voor. De eigenaar kiest en wisselt per week.
- Gratis: recepten uit een vaste, vooraf geschreven bibliotheek, zonder AI tijdens gebruik.
- Afgewezen recepten mogen terugkomen. "Lust ik niet" sluit ze permanent uit.
- Filteren op voedingswaarden is voldoende.
- 2 personen.
- De eigenaar heeft een **AH Bonuskaart** en **Lidl Plus**. Kaartprijzen tellen dus mee.
- **Acties tellen mee**, zoals "1+1 gratis", "2e halve prijs" en staffels.
- Er is **geen vaste boodschappendag**.

## 8. Ontwerp

### 8.1 Onderdelen

```
GitHub-repo (openbaar, geen persoonlijke data)
 ├─ app/                 web-app (React + TypeScript + Vite + Tailwind), installeerbaar als PWA
 ├─ data/recipes.json    receptenbibliotheek (statisch)
 ├─ data/ingredients.json  ingrediëntencatalogus → NEVO-code + zoektermen per winkel
 ├─ data/nevo.json       benodigde NEVO-subset (per 100 g)
 ├─ fetcher/             prijstaak (Node + TypeScript)
 └─ .github/workflows/   wekelijkse cron → draait fetcher → publiceert data/prices/<week>.json
GitHub Pages             serveert app + data
Telefoon                 alle persoonlijke staat in IndexedDB (keuzes, "Lust ik niet", eigen prijzen, lijst)
```

### 8.2 Receptenbibliotheek

- Om te beginnen 150–200 eigen recepten voor **avondeten**. Uitbreiden kan later.
- Per recept: titel, korte bereiding, bereidingstijd, tags (vegetarisch, vis, oven, eenpans, enzovoort), en ingrediënten met hoeveelheid in gram of ml **voor 2 personen**.
- Elk ingrediënt verwijst naar een item in `ingredients.json`. Dat item legt de koppeling naar:
  - een NEVO-code, voor de voedingswaarden;
  - per winkel een zoekterm of productfilter, waarmee de prijstaak het passende product vindt.
- Basisvoorraad (zout, peper, olie, bloem, gedroogde kruiden) is gemarkeerd als "voorraadkast". Die telt standaard niet mee in de lijst en de prijs. Per keer kan de eigenaar dat aanzetten.
- Voedingswaarden per portie: de som van (hoeveelheid × NEVO per 100 g), gedeeld door 2.
  - `nevo.json` bevat de NEVO-waarden per 100 g **ongewijzigd**, met bronvermelding.
  - De waarden per portie rekent de app zelf uit op de telefoon.
- De recepten worden **tijdens het bouwen door Claude geschreven** op basis van algemene kookkennis. Er draait daarna geen AI meer.
- Aantal recepten:
  - de eerste versie begint met **50 recepten**;
  - daarna volgt uitbreiding naar 150–200.

### 8.3 Prijstaak (dagelijks)

- Draait **elke dag om 06:00** via GitHub Actions. Handmatig starten kan ook.
  - Omdat er geen vaste boodschappendag is en de aanbiedingsweken per keten verschillen, wordt dagelijks opgehaald. Zo staan nieuwe folders erin zodra ze online komen.
  - Per aanbieding wordt de **geldigheid** (van/tot) opgeslagen. De app gebruikt een aanbieding alleen op dagen dat die geldig is.
  - Op de lijst staat "aanbieding t/m <datum>" als een aanbieding binnen 2 dagen afloopt.
  - De "week" in de app is de planningsweek. Die begint wanneer de eigenaar een nieuw menu kiest, niet op een vaste dag.
- **Kaartprijzen tellen mee**: AH Bonus en de openbare Lidl Plus-prijzen. Persoonlijke Lidl Plus-coupons blijven buiten beschouwing, omdat die per account verschillen en een login vragen.
- **Acties** ("1+1 gratis", "2e halve prijs", staffels) worden omgerekend naar een effectieve prijs.
  - Bij het afronden naar hele verpakkingen (8.5.5) stelt de lijst voor om extra te kopen als dat goedkoper uitkomt. Voorbeeld: "neem 2, dan betaal je €2,49 i.p.v. €3,32".
  - De eigenaar kan dat per item weigeren.
- Zoekt per winkel voor elk ingrediënt uit de catalogus het passende product. Daarbij gelden de regels "goedkoopste per kilo of liter" en "verpakking dichtst bij de gebruikelijke hoeveelheid".
- Legt per product vast: naam, verpakkingsgrootte, normale prijs, aanbiedingsprijs, voorwaarden van de aanbieding en geldigheid.
- Schrijft `prices/<jaar-week>.json`, plus een overzicht per winkel: gelukt, mislukt en hoeveel items gevonden.
- Is een winkel mislukt, dan blijven de prijzen van vorige week voor die winkel staan, gemarkeerd als "verouderd".

### 8.4 Ontbrekende prijzen

Als een prijs ontbreekt (vooral bij het vaste assortiment van Lidl) laat de app een **schatting** zien, gemarkeerd met "~". De schatting is de laagste bekende prijs van datzelfde ingrediënt bij een andere winkel. De eigenaar kan de prijs aanpassen. De app onthoudt die aanpassing per winkel en ingrediënt, en gebruikt hem tot er een echte prijs binnenkomt.

In de winkelvergelijking gelden voor geschatte prijzen deze regels:

- Een geschatte prijs wint nooit van een echte prijs. Kost iets bij twee winkels evenveel, dan gaat het item naar de winkel met de echte prijs.
- Bij elke winkeloptie staat hoeveel items geschat zijn, bijvoorbeeld "3 items geschat".
- Een prijs die de eigenaar zelf heeft ingevuld, telt als een echte prijs.

### 8.5 Weekflow in de app

1. **Voorstellen**: de app toont 12 recepten. Ze worden gesorteerd op "voordeel deze week", dus hoeveel van de ingrediënten in de aanbieding is. Recepten die je eerder lekker vond scoren iets hoger, en recepten van de laatste 3 weken lager. Recepten die door de actieve filters of door "Lust ik niet" uitvallen, verschijnen niet.
2. Per kaart: titel, tijd, prijs voor 2 personen, kcal en eiwit per portie, en een aanbiedingslabel. Met een tik zie je alle voedingswaarden en de ingrediënten.
3. De knoppen per kaart zijn **Kies**, **Wissel** (een ander voorstel komt ervoor in de plaats; het afgewezen recept mag later terugkomen) en **Lust ik niet** (permanent weg). In de ingrediëntenlijst staat bij elk ingrediënt ook "Lust ik niet", waarmee alle recepten met dat ingrediënt wegvallen.
4. **Filters** (die blijven bewaard): veel eiwit (≥ 30 g per portie), maximaal aantal kcal per portie, vegetarisch, snel (≤ 30 minuten), maximale prijs per portie.
5. **Boodschappenlijst**: de app telt de hoeveelheden van alle gekozen recepten per ingrediënt bij elkaar op en rondt af naar hele verpakkingen. Die verpakkingen bepalen de prijs die je in de winkel betaalt.
6. **Winkelvergelijking**: de app berekent 4 losse winkels en 6 paren. Bij een paar gaat elk item naar de goedkoopste van de twee winkels. Bovenaan staan het goedkoopste paar en de goedkoopste losse winkel, met het verschil daartussen. De eigenaar kiest welke van de twee hij gebruikt.
7. **In de winkel**: de lijst is gegroepeerd per winkel en daarbinnen per afdeling (groente, zuivel, vlees, enzovoort). Je vinkt af. Per winkel staat het totaal erbij.

### 8.6 Prijs per recept

Op een receptkaart staat de prijs van de **gebruikte hoeveelheid** (hoeveelheid × prijs per kilo of liter), berekend in de goedkoopste winkel. Op de lijst staat wat je werkelijk betaalt voor hele verpakkingen. Het verschil wordt kort uitgelegd in de app.

### 8.7 Opslag en back-up

- Alles wat persoonlijk is, staat op de telefoon (IndexedDB): gekozen recepten per week, "Lust ik niet" voor recepten en ingrediënten, favorieten, filters, eigen prijzen en de afvinkstatus.
- Onder Instellingen zit **Back-up exporteren/importeren** (JSON-bestand), zodat er niets verloren gaat bij een nieuwe telefoon.

### 8.8 Eenmalige installatie

Eenmalig gebeurt dit met hulp van Claude op de laptop: repo aanmaken, GitHub Pages en de geplande taak instellen, de bibliotheek vullen. Daarna opent de eigenaar de URL op de telefoon en kiest "Zet op beginscherm". Vanaf dan is de laptop niet meer nodig.

## 9. Eerste stap: haalbaarheidstest prijzen

Een uitzonderlijk risico is dat supermarkten verzoeken blokkeren vanaf GitHub-servers, die niet in Nederland staan. Vóór de rest wordt daarom een korte test gebouwd. Die test haalt vanuit GitHub Actions voor 10 vaste ingrediënten de prijzen op bij alle vier de winkels.

- Werkt het voor een winkel niet, dan worden de alternatieven met de eigenaar besproken. Een betaalde proxy valt af. Een voorbeeld van een alternatief is "alleen aanbiedingen uit de online folder" voor die winkel.

## 10. Keuzes van Claude (eigenaar kan ze nog wijzigen)

- Techniek:
  - React, TypeScript, Vite en Tailwind als PWA;
  - de gegevens staan in IndexedDB op de telefoon;
  - de app draait op GitHub Pages vanuit een openbare repo, met een geplande taak in GitHub Actions.
- In de openbare repo staan geen persoonlijke gegevens. Wel staan er opgehaalde prijzen in.
- De eerste versie is alleen voor avondeten.
- Er worden 12 voorstellen per keer getoond.
- Standaardwaarde voor het filter "veel eiwit": ≥ 30 g per portie. Voor "snel": ≤ 30 minuten.
- Basisvoorraad telt niet mee, maar is per keer aan te zetten.
- Een geschatte prijs is de laagste bekende prijs van datzelfde ingrediënt bij een andere winkel. Bij gelijke prijs krijgt de echte prijs voorrang.
- De eerste versie begint met 50 recepten.
- Voedingswaarden per portie worden op de telefoon uitgerekend uit ongewijzigde NEVO-waarden.

## 11. Aan de bouwer overgelaten

- De precieze endpoints en het parsen per winkel.
- De matching-heuristiek van ingrediënt naar product, binnen de regels van 8.3.
- De precieze scoreformule voor de voorstellen, binnen 8.5.1.
- De visuele uitwerking van de schermen, binnen 8.5.
- De opbouw van de recepten en de ingrediëntencatalogus.

## 12. Bronnen

- Suppie: <https://apps.apple.com/nl/app/suppie-weekmenu-aanbiedingen/id6780547488>, privacy: <https://appsuppie.nl/privacy.html>
- NEVO-online: <https://www.rivm.nl/nederlands-voedingsstoffenbestand/nevo-online>, voorwaarden: <https://www.rivm.nl/en/dutch-food-composition-database/access-nevo-data/nevo-online/copyright-and-disclaimer>
- supermarktconnector: <https://github.com/bartmachielsen/supermarktconnector>
- Lidl NL-data (prijzen alleen bij aanbiedingen): <https://apify.com/studio-amba/lidl-scraper>
- Aldi NL-data: <https://apify.com/sleepmodesystems/aldi.md>
