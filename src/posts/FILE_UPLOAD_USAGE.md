# Post File Upload Implementation

This document explains how to upload files along with post data in the LNK API.

## Creating a Post with Photos

You can create a post and upload both a main photo and additional photos in a single API call using `multipart/form-data`:

```http
POST /posts
Content-Type: multipart/form-data
Authorization: Bearer YOUR_JWT_TOKEN

Form Fields:
- postData: JSON string containing post data
- mainPhoto: File upload field for the main photo (single file)
- additionalPhotos: File upload field for additional photos (can include multiple files)

Example postData content:
{
  "title": "Titre de l'annonce",
  "description": "Description de l'annonce",
  "location": "Paris",
  "price": 100,
  "clientType": "individual",
  "travelOption": "userLocation",
  "services": [
    {
      "name": "Service 1",
      "price": 50
    }
  ]
}
```

## Adding Additional Photos to an Existing Post

You can add multiple additional photos to an existing post:

```http
POST /posts/:id/additional-photos
Content-Type: multipart/form-data
Authorization: Bearer YOUR_JWT_TOKEN

Form Fields:
- additionalPhotos: Multiple file upload field (supports up to 10 files)
```

## Notes on File Uploads

1. All photo files must be in jpg, jpeg, png, or webp format
2. Maximum file size is 5MB per file
3. Each post can have one main photo and multiple additional photos
4. Files are stored in the `/upload` directory on the server
5. Files are now organized in the database using the PostFile collection
6. When posts are fetched, file data is automatically populated and included in the response

### How File Storage Works

When a file is uploaded:

1. The physical file is saved to the server in the `/upload` directory
2. A `PostFile` document is created in the database with metadata about the file
3. The post is linked to this file document via MongoDB references 
4. When retrieving posts, these references are automatically populated with file data

## Frontend Implementation Example

Here's a sample form setup in React with FormData that handles both main photo and additional photos:

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  
  const formData = new FormData();
  
  // Convert post data to JSON string
  const postData = {
    title: title,
    description: description,
    price: price,
    // ... other post fields
  };
  
  // Add post data as JSON string
  formData.append('postData', JSON.stringify(postData));
  
  // Add main photo if selected
  if (mainPhotoFile) {
    formData.append('mainPhoto', mainPhotoFile);
  }
  
  // Add multiple additional photos if selected
  if (additionalPhotoFiles && additionalPhotoFiles.length > 0) {
    additionalPhotoFiles.forEach(file => {
      formData.append('additionalPhotos', file);
    });
  }
  
  try {
    const response = await axios.post('/api/posts', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`
      }
    });
    
    // Handle success
    console.log('Post created:', response.data);
  } catch (error) {
    // Handle error
    console.error('Error creating post:', error);
  }
};
```