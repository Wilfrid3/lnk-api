/**
 * Migration script to combine firstName and lastName into a single name field
 * 
 * To run this script:
 * 1. Make sure MongoDB is running
 * 2. Run: node -r dotenv/config src/migrations/combine-names.js
 */

const { MongoClient } = require('mongodb');

async function migrateName() {
  // Get MongoDB connection string from environment or use a default
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lnk';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const database = client.db();
    const users = database.collection('users');
    
    // Find all users that have firstName or lastName
    const cursor = users.find({
      $or: [
        { firstName: { $exists: true } },
        { lastName: { $exists: true } }
      ]
    });
    
    let count = 0;
    
    // Process each user
    for await (const user of cursor) {
      const firstName = user.firstName || '';
      const lastName = user.lastName || '';
      const name = [firstName, lastName].filter(Boolean).join(' ').trim();
      
      // Update the user document
      await users.updateOne(
        { _id: user._id },
        { 
          $set: { name },
          $unset: { firstName: "", lastName: "" }
        }
      );
      
      count++;
      console.log(`Updated user ${user._id}: "${firstName} ${lastName}" -> "${name}"`);
    }
    
    console.log(`Migration complete. Updated ${count} users.`);
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

// Run the migration
migrateName().catch(console.error);