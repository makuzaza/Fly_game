# Project Proposal: CO2 Lentopeli / CO2 Flight Challenge Game

## Suomi

## Projektin yleiskuvaus
Tämä on Pythonilla toteutettava opiskeluprojekti, jossa peli yhdistää SQL-tietokannan. Pelaajan tavoitteena on suorittaa lentomatkoja pysyen annetun CO2-rajan sisällä. Onnistuneen kierroksen jälkeen pelaaja saa uuden tehtävän. Jokaisen kierroksen jälkeen pelaajalla on mahdollisuus jatkaa peliä tai poistua.

![Project Logo](/Ohj1_ryhmaProj/images/flying.png)

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

## Tiimi
- Moreira Da Silva Luara
- Kuznetsova Maria
- Petrova Olena

## Seuraavat askeleet
- Määrittele vaatimukset ja tietokantarakenne
- Suunnittele käyttöliittymän perusversio
- Luo ensimmäiset testi-skenaariot lentotehtäville

---

## English

## Project Overview
This project is a Python-based educational game where the objective is to successfully complete flight challenges while managing a limited CO2 quota. The user attempts to “fly” different routes without exceeding the defined amount of CO2 emissions. On successful completion of a round, the user receives a new task; after each round, they may choose to continue or leave the game.

![Project Logo](/Ohj1_ryhmaProj/images/flying.png)

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

## Team
- Moreira Da Silva Luara
- Kuznetsova Maria
- Petrova Olena

## Next Steps
- Draft full requirements and database schema
- Design basic user interface for game interaction
- Create initial test scenarios for flight challenges