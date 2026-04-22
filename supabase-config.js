// 🔑 Configuration Supabase
// Remplacez ces deux valeurs par celles de votre projet Supabase :
// Dashboard → Project Settings → API
//   - URL : "Project URL"
//   - clé : "anon / public" key (PAS la service_role !)
//
// Ces valeurs sont publiques par conception : la sécurité repose sur les
// Row Level Security (RLS) policies définies dans supabase-schema.sql.

window.SUPABASE_CONFIG = {
  url: 'https://VOTRE-PROJET.supabase.co',
  anonKey: 'VOTRE_CLE_ANON_PUBLIQUE'
};
