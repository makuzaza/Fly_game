# ✈️ CO₂ Lentopeli / CO₂ Flight Challenge Game

![Project Logo](front_end/img/game.jpg)

## 📌 Projektin yleiskuvaus
CO₂ Lentopeli on Pythonilla toteutettu opetuksellinen peli, jossa pelaajan tehtävänä on tunnistaa maat vihjeiden avulla, valita lentokentät ja rakentaa optimaalinen lentoreitti pysyen annetun CO₂-budjetin sisällä. Peli tallentaa tulokset SQL-tietokantaan ja tarjoaa tulostaulun muiden tulosten vertailuun.

---

## 🎮 Säännöt
- Peli alkaa Helsingistä (taso 1).
- Jokaisessa tasossa on **3 maata**, joista jokaisesta annetaan **3 vihjettä**.
- Pelaajan tulee arvata oikea maa tai valita se kartalta.
- Tavoitteena on muodostaa **CO₂-tehokas reittijärjestys**:
  - Ei saa lentää takaisinpäin epäoptimaalisesti
  - Reitin kokonaispäästöjen tulee mahtua CO₂-budjettiin
- Jokaisessa tasossa on **3 yritystä**.
- Voit lopettaa pelin milloin tahansa `quit`-painikkeella.
- Lopputulokset tallennetaan tietokantaan ja näkyvät tulostaulussa.

---

## 🛠️ Teknologiat
- **Python (Flask)** – backend ja pelilogiikka
- **SQL / MariaDB** – tulosten tallennus
- **JavaScript** – frontend-käyttöliittymä
- **REST API** – tiedonsiirto backendin ja frontendin välillä
- **OpenStreetMap + Leaflet** – kartta lentokenttämarkkereilla

---

## 🎯 Tavoitteet
- Opettaa CO₂-päästöjen vaikutusta interaktiivisen pelin avulla
- Harjoittaa maantietoa vihjejärjestelmän avulla
- Tarjota strateginen reittisuunnittelupeli
- Tallentaa pelaajan eteneminen SQL-tietokantaan

---

## 🔄 Pelin kulku
1. Pelaajalle annetaan CO₂-raja ja ensimmäinen vihje.
2. Pelaaja arvaa maan tai valitsee sen kartalta.
3. Kun kaikki kolme maata on tunnistettu, pelaaja rakentaa **optimaalisen reitin**.
4. CO₂-kulutus lasketaan koko reitille.
5. Jos budjetti riittää → siirrytään seuraavaan tasoon.
6. Kierrosten välissä pelaaja voi jatkaa tai lopettaa.

---

## ▶️ Projektin käynnistäminen

### Backend
Siirry `back_end`-kansioon ja suorita:

```bash
python lentopeli_api.py
```
### Frontend
Avaa index.html → Suorita Live Serverillä.

## 👥 Tiimi
- Moreira Da Silva Luara
- Kuznetsova Maria
- Petrova Olena
- Mahamuud Hanad
- Horuz Renan

## ⭐ Ominaisuudet
- 3 tasoa
- 3 yritystä per taso
- Maa-arvaus vihjeiden avulla
- Maakoodi- tai maanimi-input
- Maan valinta kartalta aeroportin kautta
- CO₂-laskenta koko reitille
- Reitin optimoinnin tarkastus
- SQL-tietokantaan tallentuvat tulokset
- Leaderboard CO₂-tehokkuuden perusteella
- Introanimaatio videolla
- Säätiedot API:sta
- Layover-toiminto 3 väärän arvauksen jälkeen
- Informatiivinen ja selkeä UI

---

## 🌍 English Version

## 📌 Project Overview
CO₂ Flight Challenge Game is a Python-based educational game where the player identifies countries using hints, selects airports, and creates an optimal flight route while staying within a CO₂ budget. All results are stored in an SQL database and displayed on a global leaderboard.

---

## 🎮 Rules
- The game starts in Helsinki (Level 1).
- Each level contains 3 countries, each with 3 hints.
- The player must guess the correct country or select it on the map.
- The route must be placed in CO₂-efficient order:
  - No unnecessary backtracking
  - Total emissions must not exceed the CO₂ budget
- Each level may be retried up to 3 times.
- The player can exit anytime via button Quit.
- Results are automatically saved to the database.

---

## 🛠️ Technologies
- **Python (Flask)** – backend and game logic
- **SQL / MariaDB** – progress and result storage
- **JavaScript** – frontend UI
- **REST API** – communication between backend and UI
- **OpenStreetMap + Leaflet** – interactive airport map

---

## 🎯 Goals
- Raise awareness of CO₂ emissions
- Provide geography-based learning through hints
- Encourage strategic route planning
- Track user performance with an SQL database

---

## 🔄 Gameplay Loop
1. The player receives a CO₂ limit and a set of hints.
2. They guess or select each country.
3. Once all countries are identified, the player arranges them in an **optimal CO₂ route**.
4. Total CO₂ is calculated.
5. If the budget is not exceeded → next level.
6. Between rounds, the player may continue or exit.

---

## ▶️ Running the Project

### Backend
Open `back_end` folder and run:

```bash
python api.py
```
### Frontend
Open index.html with Live Server.

## ⭐ Features
- 3 levels
- 3 attempts per level
- 3 hints per country
- Input via country code, name, or map
- CO₂ calculator with route optimization
- SQL-based leaderboard
- Intro video animation
- Weather API integration
- Layover mechanism after 3 failed attempts
- Informative UI