# WORLOADGEO

Application interne Capgemini de gestion de workload pour les consultants supply chain.

## Pitch

WORLOADGEO permet aux managers Capgemini d'affecter intelligemment les fournisseurs aux consultants, et aux consultants d'optimiser leurs decisions de sourcing grace a un agent IA hybride (Claude Sonnet 4.5 via Capgemini GenAI).

Le produit couvre :
- L'organisation des equipes (managers, consultants, fournisseurs)
- La declaration et le suivi de la charge de travail
- L'affectation automatique de nouveaux fournisseurs par IA
- La cartographie geolocalisee (34 docks europeens)
- Les recommandations IA de repartition de stock

## Stack technique

Frontend : React 18 + Leaflet + Recharts
Backend : FastAPI + SQLAlchemy + SQLite + JWT
LLM : Claude Sonnet 4.5 via Capgemini GenAI Platform

## Lancement

3 fenetres PowerShell separees :

Fenetre 1 (backend) :
cd backend
.\venv\Scripts\python.exe -m uvicorn app:app --reload

Fenetre 2 (frontend) :
cd mon-app
npm start

Fenetre 3 (commandes libres)

## Comptes de demo

Manager : zineb.deguague@capgemini.com / zdeguague2026
Consultant : anas.elalemidrissi@capgemini.com / aelalemidrissi2026

---

Projet Capgemini Engineering / Supply Chain Practice
Derniere mise a jour : Mai 2026
