# GASKIA Design System v1.0

**Tagline:** *Voir. Prouver. Maîtriser.*

Trust Control Layer for AI Systems

---

## 1. Brand Identity

### Brand Name
**GASKIA** - Signifie "vérité" en Haoussa, reflétant notre engagement envers la transparence et la confiance dans les systèmes IA.

### Tagline
> Voir. Prouver. Maîtriser.

Cette tagline capture notre mission en trois actions:
- **Voir** - Observer et monitorer vos systèmes IA
- **Prouver** - Démontrer la conformité et la fiabilité
- **Maîtriser** - Contrôler et optimiser vos opérations IA

---

## 2. Palette de Couleurs

### Couleurs Principales

| Nom | Hex | Usage |
|-----|-----|-------|
| **Or Sahel** | `#D4A017` | Couleur primaire. Évoque le Sahel, la lumière, la valeur. Utilisée pour les accents, CTA, éléments de marque forts. |
| **Bleu Nuit** | `#1A1A2E` | Couleur secondaire. Profondeur, confiance, technologie. Fonds sombres, titres, éléments structurants. |
| **Blanc Chaud** | `#F5F5F0` | Couleur de fond. Clarté, transparence, ouverture. Fonds de page, espaces négatifs. |

### Couleur d'Accent

| Nom | Hex | Usage |
|-----|-----|-------|
| **Terre Cuite** | `#8B4513` | Accent secondaire. Évoque l'Afrique, l'authenticité, l'ancrage. Éléments graphiques, illustrations. |

### Variables CSS

```css
:root {
    /* GASKIA Brand Colors */
    --color-or-sahel: #D4A017;
    --color-bleu-nuit: #1A1A2E;
    --color-blanc-chaud: #F5F5F0;
    --color-terre-cuite: #8B4513;

    /* Semantic Colors */
    --color-primary: #D4A017;
    --color-primary-hover: #B8890F;
    --color-primary-light: #FDF6E3;
    --color-accent: #8B4513;
}
```

---

## 3. Typographie

### Police Principale: Space Grotesk
Sans-serif géométrique moderne avec une touche d'humanité.

**Usage:**
- Titres
- Logo
- Éléments de marque forts
- Tagline

**Styles:**
- **Bold (700)** - Titres H1, H2, Logo
- **Medium (500)** - Sous-titres H3, Tagline

### Police Secondaire: Inter
Excellente lisibilité à toutes tailles.

**Usage:**
- Corps de texte
- Interfaces
- Documents

**Styles:**
- **Light (300)** - Petits textes
- **Regular (400)** - Corps de texte
- **Semi-Bold (600)** - Emphase

### Hiérarchie Typographique

| Élément | Police | Taille | Poids |
|---------|--------|--------|-------|
| H1 - Titre principal | Space Grotesk | 48-64px (3-4rem) | Bold (700) |
| H2 - Titre section | Space Grotesk | 32-40px (2-2.5rem) | Bold (700) |
| H3 - Sous-titre | Space Grotesk | 24-28px (1.5-1.75rem) | Medium (500) |
| Corps de texte | Inter | 16-18px (1-1.125rem) | Regular (400) |
| Tagline | Space Grotesk | 20-24px (1.25-1.5rem) | Medium (500) |
| Petits textes | Inter | 12-14px (0.75-0.875rem) | Light (300) |

### Variables CSS

```css
:root {
    --font-heading: 'Space Grotesk', sans-serif;
    --font-body: 'Inter', sans-serif;
}
```

---

## 4. Logo

### Concept: L'Œil Stylisé (Concept B)

**Symbolique:** L'œil qui voit tout, qui observe, qui révèle la vérité. Forme abstraite évoquant à la fois un œil et un soleil levant africain.

**Caractéristiques:**
- Forme amande horizontale avec cercle central
- Dégradé Or Sahel → Terre Cuite
- Style minimaliste, une seule ligne
- Reflet subtil pour ajouter de la profondeur

### Fichiers Logo

| Fichier | Usage |
|---------|-------|
| `gaskia-logo.svg` | Logo complet (icône + texte) |
| `gaskia-logo-dark.svg` | Pour fonds sombres |
| `gaskia-logo-light.svg` | Pour fonds clairs |
| `gaskia-icon.svg` | Icône seule (sans texte) |
| `favicon.svg` | Favicon pour navigateurs |

### Logotype

**GASKIA**
- Police: Space Grotesk Bold
- Lettres capitales
- Letter-spacing: +5% (0.05em)
- Dégradé: Or Sahel → Terre Cuite

---

## 5. Éléments d'Interface

### Boutons Primaires

```css
.btn-primary {
    background: var(--color-primary);
    color: var(--text-inverse);
    font-family: var(--font-heading);
    font-weight: 500;
    border-radius: var(--radius-md);
    transition: var(--transition-base);
}

.btn-primary:hover {
    background: var(--color-primary-hover);
}
```

### Cartes

```css
.card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
}
```

### États Actifs

```css
.active {
    background: var(--bg-active);
    border-color: var(--color-primary);
    color: var(--color-primary);
}
```

---

## 6. Thème Sombre

Le thème sombre utilise le Bleu Nuit comme couleur de fond principale:

```css
[data-theme="dark"] {
    --bg-body: #1A1A2E;
    --bg-card: #252540;
    --bg-sidebar: #252540;
    --text-primary: #F5F5F0;
}
```

---

## 7. Espacements

| Variable | Valeur | Usage |
|----------|--------|-------|
| `--space-1` | 0.25rem (4px) | Micro-espacements |
| `--space-2` | 0.5rem (8px) | Petits espacements |
| `--space-3` | 0.75rem (12px) | Espacements moyens |
| `--space-4` | 1rem (16px) | Espacements standards |
| `--space-5` | 1.25rem (20px) | Grands espacements |
| `--space-6` | 1.5rem (24px) | Très grands espacements |
| `--space-8` | 2rem (32px) | Sections |

---

## 8. Rayons de Bordure

| Variable | Valeur | Usage |
|----------|--------|-------|
| `--radius-sm` | 0.375rem (6px) | Petits éléments |
| `--radius-md` | 0.5rem (8px) | Boutons, inputs |
| `--radius-lg` | 0.75rem (12px) | Cartes |
| `--radius-xl` | 1rem (16px) | Modales |
| `--radius-full` | 9999px | Badges, avatars |

---

## 9. Ombres

```css
--shadow-sm: 0 1px 2px rgba(26, 26, 46, 0.05);
--shadow-md: 0 4px 6px -1px rgba(26, 26, 46, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(26, 26, 46, 0.1);
--shadow-xl: 0 20px 25px -5px rgba(26, 26, 46, 0.1);
```

---

## 10. Transitions

| Variable | Durée | Usage |
|----------|-------|-------|
| `--transition-fast` | 150ms | Hovers rapides |
| `--transition-base` | 200ms | Standard |
| `--transition-slow` | 300ms | Animations complexes |

---

## 11. Accessibilité

- Contraste minimum de 4.5:1 pour le texte normal
- Contraste minimum de 3:1 pour le texte large
- Focus visible sur tous les éléments interactifs
- Support RTL (Right-to-Left) pour les langues arabes

---

## 12. Assets

### Structure des Fichiers

```
visualization/static/
├── css/
│   └── dashboard.css       # Design system complet
├── images/
│   ├── logos/
│   │   ├── gaskia-logo.svg
│   │   ├── gaskia-logo-dark.svg
│   │   ├── gaskia-logo-light.svg
│   │   └── gaskia-icon.svg
│   └── favicons/
│       └── favicon.svg
└── js/
    └── dashboard.js
```

---

## 13. Intégration

### Google Fonts

```html
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

### Favicon

```html
<link rel="icon" type="image/svg+xml" href="/static/images/favicons/favicon.svg">
```

---

*GASKIA Design System v1.0 - Voir. Prouver. Maîtriser.*
