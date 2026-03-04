# Propositions de fonctionnalités

Analyse du projet réalisée le 04/03/2026. Voici les fonctionnalités proposées, classées par catégorie et par priorité.

---

## 1. Gestion du portefeuille

### 1.1 Pondération des actifs et valeur totale du portefeuille
Permettre à l'utilisateur de saisir la **quantité détenue** (ou le montant investi) pour chaque actif. Cela débloque :
- Affichage de la **valeur totale du portefeuille** en euros
- Calcul de la **répartition réelle** (% par actif, par classe d'actifs)
- Performance pondérée du portefeuille (pas juste par actif)
- Graphique d'évolution de la valeur totale dans le temps

### 1.2 Historique des transactions
Journal des achats/ventes avec date, quantité et prix d'entrée. Permet de calculer :
- Prix de revient moyen (PRU)
- Plus/moins-values latentes et réalisées
- Performance réelle vs performance de l'actif

### 1.3 Alertes de prix
Notifications (dans l'app ou par notification du navigateur) quand :
- Un actif atteint un seuil de prix défini
- Le RSI passe en zone de survente/surachat
- Un golden/death cross est détecté
- Le Fear & Greed atteint un extrême

---

## 2. Analyse technique avancée

### 2.1 MACD (Moving Average Convergence Divergence)
Ajouter le MACD comme indicateur technique sur les pages actifs :
- Ligne MACD (EMA12 - EMA26)
- Ligne de signal (EMA9 du MACD)
- Histogramme MACD
- Détection des croisements haussiers/baissiers

### 2.2 Volume d'échange
Yahoo Finance fournit déjà les données de volume. Les exploiter pour :
- Graphique de volume en barres sous le graphique de prix
- Volume moyen mobile (20 jours)
- Détection de pics de volume anormaux (confirmation de tendance)

### 2.3 Niveaux de support/résistance automatiques
Calcul automatique des niveaux clés basé sur :
- Points pivots (high/low historiques)
- Zones de congestion
- Affichage en lignes horizontales sur le graphique de prix

### 2.4 Retracements de Fibonacci
Sur le graphique de prix, afficher les niveaux de Fibonacci (23.6%, 38.2%, 50%, 61.8%) entre le dernier plus haut et plus bas significatifs.

---

## 3. Indicateurs macro supplémentaires

### 3.1 Courbe des taux (Yield Curve)
Via FRED API (déjà intégrée) — ajouter le spread 10Y-2Y US :
- Série `T10Y2Y` de FRED
- Indicateur d'inversion de la courbe des taux (signal de récession)
- Card sur le dashboard avec historique

### 3.2 Dollar Index (DXY)
Ajouter le DXY (`DX-Y.NYB` sur Yahoo Finance) comme indicateur macro :
- Corrélation inverse avec les actifs risqués et l'or
- Intégrer dans le régime de marché

### 3.3 Indice de volatilité crypto (si pertinent)
Si l'utilisateur a du Bitcoin, ajouter un indicateur de volatilité implicite crypto pour compléter le VIX.

---

## 4. Visualisation et UX

### 4.1 Mode comparaison d'actifs
Permettre de sélectionner 2-3 actifs pour les comparer côte à côte :
- Charts superposés (performance normalisée base 100)
- Tableau comparatif des métriques (RSI, drawdown, volatilité)
- Ratio entre deux actifs (ex: BTC/Or)

### 4.2 Sélecteur de période avancé
Actuellement, les données couvrent ~500 jours. Ajouter :
- Sélecteur de plage de dates (date picker)
- Périodes rapides : 1M, 3M, 6M, 1A, 2A, Max
- Zoom interactif sur les graphiques (Chart.js zoom plugin)

### 4.3 Export des données
- Export CSV du tableau de données (déjà partiellement présent via DataTable)
- Export PDF d'un rapport de synthèse du portefeuille
- Capture d'écran / partage d'un graphique

### 4.4 Thème clair
Le thème actuel est sombre. Ajouter un **toggle clair/sombre** (le `ThemeContext` existe déjà, il suffit de définir les variables CSS pour le mode clair).

---

## 5. Performance et fiabilité

### 5.1 Service Worker / Mode hors-ligne (PWA)
Transformer l'app en PWA pour :
- Consultation hors-ligne avec les dernières données en cache
- Installation sur l'écran d'accueil (mobile)
- Notifications push pour les alertes

### 5.2 Websocket / SSE pour les données en temps réel
Remplacer le polling (refresh toutes les 5 min) par un flux temps réel pour les heures de marché, avec fallback sur le polling actuel.

### 5.3 Persistance serveur (optionnel)
Actuellement tout est en localStorage. Pour synchroniser entre appareils :
- Backend léger (SQLite / Supabase / Firebase)
- Auth simple (magic link ou OAuth)
- Sync automatique de la config du portefeuille

---

## 6. Analyse et intelligence

### 6.1 Backtest simplifié
Simuler une stratégie DCA (Dollar Cost Averaging) ou rééquilibrage sur les données historiques :
- « Si j'avais investi X€/mois dans cet actif depuis 1 an »
- Comparaison DCA vs lump sum
- Résultat visuel avec graphique

### 6.2 Score de diversification
Basé sur la matrice de corrélation existante, calculer un score global de diversification du portefeuille et suggérer des améliorations.

### 6.3 Objectifs et projections
Définir un objectif de valeur de portefeuille et projeter l'atteinte basée sur :
- Performance historique
- Contributions régulières
- Intervalles de confiance (Monte Carlo simplifié)

---

## Résumé par priorité

| Priorité | Fonctionnalité | Effort |
|----------|---------------|--------|
| Haute | Pondération actifs + valeur portefeuille | Moyen |
| Haute | MACD | Faible |
| Haute | Sélecteur de période avancé | Moyen |
| Haute | Thème clair | Faible |
| Moyenne | Alertes de prix | Moyen |
| Moyenne | Volume d'échange | Faible |
| Moyenne | Courbe des taux (Yield Curve) | Faible |
| Moyenne | Mode comparaison | Moyen |
| Moyenne | Score de diversification | Faible |
| Moyenne | Export CSV/PDF | Moyen |
| Basse | Historique transactions + PRU | Élevé |
| Basse | PWA / Mode hors-ligne | Moyen |
| Basse | Backtest DCA | Moyen |
| Basse | Support/Résistance automatiques | Moyen |
| Basse | Persistance serveur | Élevé |
| Basse | Objectifs et projections | Élevé |
