# Posts Module API Documentation

## Description
Le module Posts permet de gérer les annonces des utilisateurs, incluant la création, la mise à jour, la suppression et la recherche d'annonces, ainsi que le téléchargement de photos.

## Endpoints

### Récupérer toutes les annonces avec pagination et filtrage
```
GET /posts
```

### Récupérer les annonces mises en avant
```
GET /posts/featured
```
Retourne jusqu'à 10 annonces marquées comme mises en avant (isFeatured=true), avec leurs photos et les informations sur le propriétaire.

#### Paramètres de requête
- `page` (optionnel, par défaut: 1): Numéro de page
- `limit` (optionnel, par défaut: 10): Nombre d'éléments par page (max: 100)
- `sortBy` (optionnel, par défaut: "createdAt"): Champ de tri
- `sortOrder` (optionnel, par défaut: "desc"): Ordre de tri ("asc" ou "desc")
- `city` (optionnel): Filtrer par ville
- `clientType` (optionnel): Filtrer par type de clientèle (homme, femme, couple, tous)
- `minPrice` (optionnel): Prix minimum
- `maxPrice` (optionnel): Prix maximum
- `offerings` (optionnel): Filtrer par services spécifiques
- `search` (optionnel): Terme de recherche pour le titre et la description

#### Réponse
```json
{
  "items": [
    {
      "id": "60d21b4667d0d8992e610c85",
      "title": "Titre de l'annonce",
      "description": "Description détaillée de l'annonce...",
      "services": [
        {
          "service": "Massage",
          "price": 50
        }
      ],
      "mainPhoto": {
        "id": "60d21b4667d0d8992e610c90",
        "originalName": "photo-principale.jpg",
        "url": "/upload/mainPhoto-1624189182123-123456789.jpg",
        "mimeType": "image/jpeg",
        "size": 245678
      },
      "additionalPhotos": [
        {
          "id": "60d21b4667d0d8992e610c91",
          "originalName": "photo1.jpg",
          "url": "/upload/additionalPhotos-1624189182123-234567890.jpg",
          "mimeType": "image/jpeg",
          "size": 124567
        },
        {
          "id": "60d21b4667d0d8992e610c92",
          "originalName": "photo2.jpg",
          "url": "/upload/additionalPhotos-1624189182123-345678901.jpg",
          "mimeType": "image/jpeg",
          "size": 198765
        }
      ],      
      "user": {
        "id": "60d21b4667d0d8992e610c84",
        "email": "user@example.com",
        "name": "John Doe",
        "avatar": "/uploads/avatars/user-avatar.jpg",        
        "phoneNumber": "+33612345678",
        "isPhoneVerified": true,
        "userType": "regular",
        "bio": "Description de l'utilisateur",
        "isActive": true,
        "isPremium": false,
        "isVerified": false,
      },
      "clientType": "tous",
      "appearance": "Description physique",
      "offerings": ["massages", "sexcam"],
      "city": "Paris",
      "neighborhood": "Montmartre",
      "travelOption": "les deux",
      "phoneNumber": "+33612345678",
      "whatsappNumber": "+33612345678",
      "isFeatured": false,
      "isAd": false,
      "isVip": false,
      "views": 42,
      "createdAt": "2023-06-20T15:12:22.123Z",
      "updatedAt": "2023-06-21T10:22:54.567Z"
    }
  ],
  "meta": {
    "totalItems": 42,
    "totalPages": 5,
    "currentPage": 1,
    "itemsPerPage": 10
  }
}
```

### Rechercher des annonces avec filtres
```
GET /posts/search
```

Mêmes paramètres et format de réponse que pour `GET /posts`.

### Récupérer une annonce par ID
```
GET /posts/:id
```

#### Paramètres
- `id`: ID de l'annonce à récupérer

#### Réponse
Retourne l'objet annonce et incrémente le compteur de vues.

### Récupérer toutes les annonces d'un utilisateur spécifique
```
GET /posts/user/:userId
```

#### Paramètres
- `userId`: ID de l'utilisateur
- Paramètres de pagination comme pour `GET /posts`

#### Réponse
Même format de réponse que pour `GET /posts`. Les fichiers sont automatiquement peuplés avec leurs métadonnées complètes, et les informations de l'utilisateur propriétaire sont incluses dans chaque annonce. Cette approche élimine le besoin de requêtes supplémentaires pour obtenir les détails de l'utilisateur.

### Créer une nouvelle annonce
```
POST /posts
```

#### En-têtes
- `Authorization`: Bearer [token JWT]
- `Content-Type`: multipart/form-data

#### Corps de la requête
- `postData`: Chaîne JSON contenant les données de l'annonce
  ```json
  {
    "title": "Titre de l'annonce",
    "description": "Description détaillée de l'annonce...",
    "services": [
      {
        "service": "Massage",
        "price": 50
      }
    ],
    "clientType": "tous",
    "appearance": "Description physique",
    "offerings": ["massages", "sexcam"],
    "city": "Paris",
    "neighborhood": "Montmartre",
    "travelOption": "les deux",
    "phoneNumber": "+33612345678",
    "whatsappNumber": "+33612345678",
    "isActive": true
  }
  ```
- `mainPhoto`: Fichier image pour la photo principale (optionnel)
- `additionalPhotos[]`: Fichiers images additionnels (optionnel, peut être multiple)

#### Réponse
Retourne l'objet annonce créé.

### Mettre à jour une annonce
```
PATCH /posts/:id
```

#### En-têtes
- `Authorization`: Bearer [token JWT]

#### Paramètres
- `id`: ID de l'annonce à mettre à jour

#### Corps de la requête
Tous les champs sont optionnels.
```json
{
  "title": "Nouveau titre",
  "description": "Nouvelle description",
  "services": [
    {
      "service": "Nouveau service",
      "price": 75
    }
  ],
  "isActive": false
}
```

#### Réponse
Retourne l'objet annonce mis à jour.

### Supprimer une annonce
```
DELETE /posts/:id
```

#### En-têtes
- `Authorization`: Bearer [token JWT]

#### Paramètres
- `id`: ID de l'annonce à supprimer

#### Réponse
```json
{
  "message": "Annonce supprimée avec succès"
}
```

### Télécharger une photo pour une annonce
```
POST /posts/:id/photos
```

#### En-têtes
- `Authorization`: Bearer [token JWT]
- `Content-Type`: multipart/form-data

#### Paramètres
- `id`: ID de l'annonce

#### Corps de la requête
- `file`: Fichier image (jpg, jpeg, png, webp)
- `isMainPhoto` (optionnel, booléen): Indique si c'est la photo principale

#### Réponse
Retourne l'objet annonce mis à jour avec la nouvelle photo.

### Ajouter plusieurs photos additionnelles
```
POST /posts/:id/additional-photos
```

#### En-têtes
- `Authorization`: Bearer [token JWT]
- `Content-Type`: multipart/form-data

#### Paramètres
- `id`: ID de l'annonce

#### Corps de la requête
- `additionalPhotos`: Tableau de fichiers images (jusqu'à 10 fichiers)

#### Réponse
Retourne l'objet annonce mis à jour avec les nouvelles photos.

## Système de Likes

### Aimer une annonce
```
POST /posts/:id/like
```

#### En-têtes
- `Authorization`: Bearer [token JWT]

#### Paramètres
- `id`: ID de l'annonce à aimer

#### Réponse
Retourne l'objet annonce mis à jour avec le like ajouté.

#### Erreurs
- 400: L'utilisateur a déjà aimé cette annonce
- 404: Annonce non trouvée

### Retirer un like d'une annonce
```
DELETE /posts/:id/like
```

#### En-têtes
- `Authorization`: Bearer [token JWT]

#### Paramètres
- `id`: ID de l'annonce

#### Réponse
Retourne l'objet annonce mis à jour avec le like retiré.

#### Erreurs
- 400: L'utilisateur n'a pas aimé cette annonce
- 404: Annonce non trouvée

### Vérifier le statut de like
```
GET /posts/:id/like-status
```

#### En-têtes
- `Authorization`: Bearer [token JWT]

#### Paramètres
- `id`: ID de l'annonce

#### Réponse
```json
{
  "isLiked": true
}
```

## Notes
- Toutes les erreurs retournent un message d'erreur approprié en français.
- Les fichiers téléchargés sont limités à 5 Mo et aux formats d'image (jpg, jpeg, png, webp).
- Seul le propriétaire de l'annonce peut la modifier, supprimer ou ajouter des photos.
- Les likes sont automatiquement comptabilisés dans le champ `likesCount` de l'annonce.
- Un utilisateur ne peut aimer une annonce qu'une seule fois.
- Lors de la récupération d'une annonce ou d'une liste d'annonces, les informations de l'utilisateur propriétaire sont automatiquement incluses dans la propriété `user` et les fichiers associés sont complètement peuplés avec leurs métadonnées complètes.