# 🌱 Le jardin de Lolo

Petite application web autonome pour gérer votre jardin (plantes, arrosages, journal). 100 % locale, aucune dépendance, aucune installation.

## 🚀 Lancement

Double-cliquez simplement sur **`index.html`** pour l'ouvrir dans votre navigateur.

Pour un meilleur fonctionnement (notamment les dialogues), vous pouvez aussi servir le dossier via un petit serveur local :

```bash
cd "Gestionnaire de jardin"
python3 -m http.server 8000
# puis ouvrez http://localhost:8000
```

## ✨ Fonctionnalités

- **Mes plantes** : ajouter / modifier / supprimer des plantes (nom, type, emplacement, date de plantation, fréquence d'arrosage, notes).
- **Arrosage** : bouton « Arrosé » en un clic, indicateur visuel (à arroser aujourd'hui / en retard / à venir).
- **Tâches à venir** : liste triée des prochains arrosages.
- **Journal du jardin** : prenez des notes horodatées (semis, récoltes, observations).
- **Statistiques** : nombre de plantes, arrosages du jour, retards, répartition par type.
- **Recherche & filtre** par nom, emplacement, type.
- **Export / Import JSON** pour sauvegarder vos données.
- **Persistance locale** via `localStorage` (rien n'est envoyé sur Internet).

## 📁 Structure

```
Gestionnaire de jardin/
├─ index.html    # structure de l'app
├─ styles.css    # thème vert / responsive
├─ app.js        # logique (état, rendu, persistance)
└─ README.md
```

## 🛡️ Données

Toutes vos données sont stockées localement dans le navigateur (`localStorage`). Pour les sauvegarder, utilisez le bouton **Exporter (JSON)** dans l'onglet *Statistiques*.
