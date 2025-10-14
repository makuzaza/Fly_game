# Project Proposal: CO2 Lentopeli / CO2 Flight Challenge Game

## Projektin yleiskuvaus
Tämä on Pythonilla toteutettava opiskeluprojekti, jossa peli yhdistää SQL-tietokannan. Pelaajan tavoitteena on suorittaa lentomatkoja pysyen annetun CO2-rajan sisällä. Onnistuneen kierroksen jälkeen pelaaja saa uuden tehtävän. Jokaisen kierroksen jälkeen pelaajalla on mahdollisuus jatkaa peliä tai poistua.

![Project Logo](/images/flying.png)

## Säännöt
Tervetuloa maailmanlaajuisen matkailun jännittävään maailmaan!
Tässä pelissä lähdet lennoille kaukaisiin maihin, ratkaiset kiehtovia pulmia ja koet unohtumattomia seikkailuja.
On tietysti tärkeää pitää ympäristö mielessä – suunnittele siis reittisi huolellisesti vähentääksesi hiilidioksidipäästöjä.
Aloitat tason 1 Helsingistä ja etenet aina edellisestä määränpäästä.
Tehtäväsi on vierailla kolmessa maassa arvaamalla niiden nimet.
Älä huoli – runsaasti vinkkejä opastaa sinua matkan varrella.
Suosittelemme kartan käyttöä optimaalisen reitin valitsemiseen.
Jokaisella maalla voi olla useita lentokenttiä, joten valitse viisaasti ja ota aina huomioon ympäristövaikutukset.
Jos et onnistu, kutakin tasoa voidaan pelata uudelleen jopa 3 kertaa.
Voit myös poistua pelistä milloin tahansa kirjoittamalla "quit" tai "X" näppäimistölläsi.
Pelin lopussa näet tuloksesi,
jotka tallennetaan myös automaattisesti tietokantaan myöhempää tarkastelua varten.
Onnea! 🌍✈️

Hae ja tarkista oikea lentokenttä kartalta:
![Project Logo](/images/lentomap.png)

## Käytettävät teknologiat
- **Python**: Pelilogiikka ja käyttäjän toiminnot
- **SQL-tietokanta**: Pelaajan edistymisen, pelitilojen ja CO2-tietojen tallennus

## Tavoitteet
- Lisätä tietoisuutta CO2-päästöistä interaktiivisen pelin avulla
- Tallentaa ja seurata pelaajan etenemistä SQL-tietokannassa
- Tarjota useita peliratoja ja nousevaa haastavuutta

## Pelin kulku
1. Pelaajalle annetaan lentotehtävä ja CO2-raja.
2. Pelaajan tulee suorittaa reitti pysyen sallituissa päästöissä.
3. Onnistuneen suorituksen jälkeen annetaan uusi tehtävä.
4. Kierroksen jälkeen pelaaja voi jatkaa tai lopettaa.

## Kehityssuunnitelma
- Python-koodipohjan sekä SQL-tietokantarakenteen luominen
- Pelin ydintoiminnallisuuksien ja logiikan toteutus
- Yhteyden rakentaminen Pythonin ja SQL:n välille tiedon tallentamista ja hakua varten

## Lisäkomennot
```bash
pip install folium
```

## Tiimi
- Moreira Da Silva Luara
- Kuznetsova Maria
- Petrova Olena
- Mahamuud Hanad
- Horuz Renan

## Seuraavat askeleet
- Lisää tasoja
- Vaikeusasteen valinta (helppo/keskivaikea/vaikea)
- Valinnaiset vinkit
- Maakoodin syöttö
- Tulostaulu
- Pisteitä tai kolikoita palkkioina

---

## English

## Project Overview
This project is a Python-based educational game where the objective is to successfully complete flight challenges while managing a limited CO2 quota. The user attempts to “fly” different routes without exceeding the defined amount of CO2 emissions. On successful completion of a round, the user receives a new task; after each round, they may choose to continue or leave the game.

![Project Logo](/images/flying.png)

## Story
Welcome to the exciting world of global travel!
In this game, you will embark on flights to distant countries, solve intriguing puzzles, and experience unforgettable adventures.
Of course, it is important to keep the environment in mind — so plan your route carefully to reduce CO₂ emissions.
You’ll start Level 1 from Helsinki, and always progress from previous destination.
Your task is to visit 3 countries by guessing their names.
Don’t worry — plenty of hints will guide you along the way.
We recommend using the map to choose the most optimal route.
Each country may have several airports, so choose wisely, always considering the environmental impact.
If you don’t succeed, each level can be replayed up to 3 times.
You can also exit the game at any time by typing “quit” or “X” on your keyboard.
At the end of the game, you’ll see your results,
which will also be automatically saved to the database for future viewing.
Good luck! 🌍✈️

Search and check the correct airport on the map:
![Project Logo](/images/lentomap.png)

## Technologies
- **Python**: Core game logic and user interaction
- **SQL database**: Storing user progress, game state, and CO2 tracking data

## Goals
- Encourage awareness about CO2 emissions through an interactive game scenario
- Track user success and progress using an SQL database
- Provide multiple game rounds with progressive difficulty or different flight scenarios

## Gameplay Loop
1. Player is assigned a flight challenge with a CO2 limit.
2. Player must complete the route using available resources, aiming to stay within the allowed emissions.
3. Upon success, player receives the next challenge.
4. After each round, player can opt to continue or exit.

## Development Plan
- Set up Python codebase and SQL schema for game data
- Implement core gameplay features and logic for flight challenges
- Establish connection between Python and SQL database for saving/loading progress

## Additional commands
```bash
pip install folium
```

## Team
- Moreira Da Silva Luara
- Kuznetsova Maria
- Petrova Olena
- Mahamuud Hanad
- Horuz Renan

## Next Steps
- More levels
- Difficulty selection (easy/medium/hard)
- Optional hints
- Country code input
- Leaderboard
- Points or coins as rewards