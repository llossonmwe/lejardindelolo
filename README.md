# 🌱 Le jardin de Lolo

Application web pour gérer votre jardin (plantes, arrosages, journal) avec **synchronisation multi-appareils** via Supabase.

## 🚀 Mise en route — 3 étapes

### 1. Créer un projet Supabase (gratuit)

1. Allez sur [https://supabase.com](https://supabase.com) → **Start your project** → connectez-vous (GitHub par ex.).
2. **New project** → nom au choix, mot de passe DB au choix, région proche de vous. Attendez ~1 min.
3. Dans le projet : **SQL Editor → New query** → copiez-collez tout le contenu de [`supabase-schema.sql`](supabase-schema.sql) → **Run**. Cela crée les tables `plants` + `journal` avec les bonnes règles de sécurité (RLS).
4. Dans **Authentication → Providers → Email** : laissez activé. Vous pouvez désactiver « Confirm email » pendant les tests (plus simple).

### 2. Configurer l'app

1. Dans Supabase : **Project Settings → API**. Copiez :
   - **Project URL** (ex. `https://abcdxyz.supabase.co`)
   - **anon public** key (la clé longue, PAS `service_role` !)
2. Ouvrez [`supabase-config.js`](supabase-config.js) et remplacez les deux valeurs :
   ```js
   window.SUPABASE_CONFIG = {
     url: 'https://abcdxyz.supabase.co',
     anonKey: 'eyJhbGci...'
   };
   ```

### 3. Héberger sur GitHub Pages

```bash
cd "Gestionnaire de jardin"
git add .
git commit -m "Configure Supabase"
git push
```
Puis dans le repo GitHub : **Settings → Pages → Branch `main` / `/(root)` → Save**.
Votre app sera en ligne à `https://<user>.github.io/<repo>/`. Ouvrez-la sur ordi ET téléphone : **les données se synchronisent** ✨.

## ✨ Fonctionnalités

- **Authentification** email/mot de passe (gérée par Supabase, pas de mdp en clair).
- **Sync temps réel** entre tous vos appareils.
- **Mes plantes** : CRUD complet (nom, type, emplacement, date de plantation, fréquence d'arrosage, notes).
- **Arrosage** en un clic, statut visuel (à arroser / en retard / à venir).
- **Tâches à venir** : arrosages triés par date.
- **Journal** horodaté.
- **Statistiques** : totaux, retards, répartition par type.
- **Export / Import JSON** pour sauvegarde locale.
- **RLS activé** : chaque utilisateur ne voit QUE ses propres données, garanti au niveau base de données.

## 📁 Structure

```
Gestionnaire de jardin/
├─ index.html            # structure UI
├─ styles.css            # thème vert / responsive
├─ app.js                # logique (auth + CRUD Supabase)
├─ supabase-config.js    # VOS clés (à remplir)
├─ supabase-schema.sql   # à exécuter dans Supabase
└─ README.md
```

## 🔒 Sécurité

- La clé `anon` est **publique par conception** — c'est normal qu'elle soit dans le code. Ne commitez JAMAIS la clé `service_role`.
- Les policies RLS du fichier SQL garantissent qu'un utilisateur ne peut lire/écrire que ses propres lignes.
- Les mots de passe sont hachés côté Supabase (bcrypt).

## 🛠️ Dev local

Servez le dossier via un petit serveur HTTP (le SDK Supabase nécessite http/https, pas `file://`) :

```bash
python3 -m http.server 8000
# puis http://localhost:8000
```

## 💸 Coût

Le plan gratuit Supabase inclut : 500 Mo de base, 50 000 utilisateurs actifs/mois, 5 Go de bande passante. Largement suffisant pour un jardin 🌱.
