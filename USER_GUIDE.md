# Guide Utilisateur - Gestion de Stock

Cette application centralisée vous permet de garder une trace fiable, et en réseau local, du matériel informatique disponible, en service ou assigné entre nos différentes entités (GVA, Zurich, CDS, FIX, etc.).

## 1. Connexion et Déconnexion

Pour utiliser la plateforme :
1. Ouvrez votre navigateur internet et rendez-vous sur l'adresse de l'application (ex: `https://stock.gvaprintlab.ch`).
2. Saisissez votre **Nom d'utilisateur** (ou email) et votre **Mot de passe** fournis préalablement par l'administrateur interne.
3. Cliquez sur **Se connecter**.

*Note : Lors du premier accès sur votre réseau, votre navigateur peut signaler une alerte de type "Avertissement de sécurité" (Certificat local). Acceptez de continuer (ou ajoutez l'exception) pour atterrir sur l'application.*

Pour vous déconnecter en toute sécurité à la fin de vos tâches, cliquez sur le bouton permettant la **Déconnexion** situé généralement dans le menu ou en haut à droite.

## 2. Consultation (Dashboard & Inventaire)

L'accès à l'application est compartimenté en plusieurs vues utiles à votre navigation :

### Le Dashboard (Tableau de bord)

C'est l'écran de synthèse pour comprendre l'état du parc **en un coup d'œil**. Il est
**dynamique** :

- **Barre de filtres globale** en haut (Entité / Catégorie / Lieu / Responsable) :
  chaque sélection recalcule **en direct** tous les chiffres et graphiques. Les options
  « Toutes / Tous » réinitialisent un filtre.
- **Cartes clés** : Total, **Disponibles** (en stock), **Immobilisés** (chez client, en
  test, showroom…) et Archivés.
- **Jauge de disponibilité** : le pourcentage d'appareils réellement disponibles, plus la
  répartition par lieu.
- **Graphiques de répartition** : par catégorie, par entité, par responsable et par
  génération.

### L'Inventaire

L'onglet central : la liste complète des équipements. Il offre :

- une barre de **Filtres / Recherche** (numéro de série, modèle, catégorie, entité, lieu)
  pour repérer rapidement un appareil ;
- un sélecteur du **nombre de lignes** affichées (10 / 20 / 50 / Tout) ;
- des **colonnes contextuelles** : en filtrant sur une catégorie, le tableau ajoute les
  champs pertinents (ex. *Laptop* → processeur / RAM / stockage ; *Display* → taille ;
  *Docking* → puissance) ;
- une **fiche détaillée** : un **clic sur une ligne** ouvre un panneau latéral affichant
  **toutes** les informations de l'appareil (identité, affectation, caractéristiques,
  commentaire, dates).

## 3. Ajout d'un nouvel appareil

Lors de l'arrivée et de l'intégration de nouveau matériel informatique :
1. Allez dans l'onglet/menu désigné pour l' **Ajout d'appareil** (*Add Device*).
2. Complétez chaque champ du formulaire avec la plus grande justesse, en incluant obligatoirement les paramètres critiques : *Numéro de série exact, Catégorie (Laptop/Display...), Modèle et Entité d'appartenance*.
3. Validez la saisie manuelle en cliquant sur **Enregistrer** (ou Submit). Celui-ci s'affiche désormais directement dans l'inventaire global consultable par vos collègues.

*À noter : En tant qu'utilisateur standard de la solution, vous ne pouvez pas éditer, remplacer ou supprimer unitairement par la suite un appareil. Si vos informations comportent une erreur de saisie ou si l'équipement a été égaré, rapprochez-vous des pôles de gestion assignés (Administrateurs) qui valideront cette modification.*