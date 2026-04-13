# HypnoZen 🧘‍♂️

Application d'auto-hypnose personnalisée fonctionnant de manière 100% autonome.

## 🚀 Déploiement sur GitHub
### ⚠️ Résolution de l'erreur de permission GitHub
L'erreur "Insufficient permissions to push workflow files" signifie que vous devez autoriser AI Studio à gérer vos fichiers de déploiement (Workflows).

**Pour corriger cela :**
1. Allez dans vos **Paramètres GitHub** (photo de profil en haut à droite).
2. Allez dans **Applications** > **Authorized GitHub Apps**.
3. Trouvez **AI Studio Build** et cliquez sur **Configure**.
4. Dans la section **Permissions**, vérifiez que **Workflows** est autorisé en lecture/écriture.
5. Le fichier de déploiement automatique a été restauré pour permettre la publication sur GitHub Pages.

### Étapes d'installation
1. **Créez un nouveau dépôt** sur GitHub.
2. **Exportez le code** depuis AI Studio (Menu Paramètres > Export to GitHub).
3. **Activez GitHub Pages** :
   - Dans votre dépôt GitHub, allez dans **Settings > Pages**.
   - Sous "Build and deployment > Source", choisissez **GitHub Actions**.
   - L'application sera déployée automatiquement.

## 🛠 Installation locale

1. Clonez le dépôt :
   ```bash
   git clone <votre-url-repo>
   cd hypnozen
   ```
2. Installez les dépendances :
   ```bash
   npm install
   ```
3. Lancez le serveur de développement :
   ```bash
   npm run dev
   ```

## ✨ Caractéristiques

- **20 scripts d'hypnose pré-enregistrés** avec insertion dynamique du prénom.
- **Synthèse vocale native** (Web Speech API) : fonctionne sans service externe.
- **Ambiance sonore générée** : Bruit rose apaisant généré via Web Audio API.
- **Zéro dépendance externe** : Idéal pour un hébergement statique gratuit.

## 📜 Licence
Apache-2.0
