# HypnoZen 🧘‍♂️

> **Live :** [ericsotoca.github.io/HypnoZen](https://ericsotoca.github.io/HypnoZen/)

Application d'**auto-hypnose personnalisée** fonctionnant 100% hors-ligne via le navigateur. Zéro dépendance externe, zéro serveur.

---

## ✨ Fonctionnalités

| Feature | Détail |
|---|---|
| 🎙️ **Synthèse vocale** | Web Speech API — fonctionne sans service tiers |
| 🎵 **3 ambiances sonores** | Zen, Océan, Forêt — générées via Web Audio API |
| 👤 **Personnalisation** | Insertion dynamique du prénom dans les scripts |
| 📜 **20 scripts d'hypnose** | Relaxation, confiance, sommeil, concentration, etc. |
| 📱 **PWA** | Installable sur mobile, fonctionne hors-ligne |
| 🔇 **Zéro dépendance** | Idéal pour hébergement statique gratuit |

## 🛠️ Stack

- **TypeScript** + **Vite** (build optimisé)
- **Web Audio API** — sons procéduraux (pas de fichiers audio)
- **Web Speech API** — synthèse vocale native
- **GitHub Actions** — déploiement automatique sur GitHub Pages

## 🚀 Installation locale

```bash
# 1. Cloner le repo
git clone https://github.com/ericsotoca/HypnoZen.git
cd HypnoZen

# 2. Installer les dépendances
npm install

# 3. Lancer en développement
npm run dev

# 4. Build de production
npm run build
```

## 📁 Structure

```
src/
├── App.tsx           # Composant principal
├── main.tsx          # Point d'entrée
├── index.css         # Styles globaux
└── constants/        # Scripts d'hypnose et configurations
```

## ⚙️ Variables d'environnement

Copier `.env.example` → `.env` et renseigner les valeurs si besoin.

## 📜 Licence

Apache-2.0 — Libre d'utilisation et de modification.

---

*Développé par Éric Sotoca · 2025-2026*
