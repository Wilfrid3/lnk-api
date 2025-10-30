/**
 * Script to check MongoDB collections and fix video comment counts
 */

const { MongoClient } = require('mongodb');

// MongoDB connection URL - update this to match your database
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lnk_db';

async function checkCollections() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('Available collections:');
    collections.forEach(col => console.log(`  - ${col.name}`));
    
    // Check each collection that might contain videos or comments
    const possibleVideoCollections = ['videos', 'video', 'Video'];
    const possibleCommentCollections = ['videocomments', 'videoComment', 'VideoComment', 'video_comments'];
    
    let videosCollection = null;
    let commentsCollection = null;
    
    // Find the correct video collection
    for (const name of possibleVideoCollections) {
      try {
        const count = await db.collection(name).countDocuments();
        if (count > 0) {
          console.log(`Found ${count} documents in ${name} collection`);
          videosCollection = db.collection(name);
          break;
        }
      } catch (error) {
        // Collection doesn't exist, continue
      }
    }
    
    // Find the correct comment collection
    for (const name of possibleCommentCollections) {
      try {
        const count = await db.collection(name).countDocuments();
        if (count > 0) {
          console.log(`Found ${count} documents in ${name} collection`);
          commentsCollection = db.collection(name);
          break;
        }
      } catch (error) {
        // Collection doesn't exist, continue
      }
    }
    
    if (!videosCollection) {
      console.log('❌ No video collection found');
      return;
    }
    
    if (!commentsCollection) {
      console.log('❌ No comment collection found');
      return;
    }
    
    console.log('\nFixing comment counts...');
    
    // Get all videos
    const videos = await videosCollection.find({}).toArray();
    console.log(`Found ${videos.length} videos`);
    
    for (const video of videos) {
      // Count root comments (not replies) for this video
      const commentCount = await commentsCollection.countDocuments({
        videoId: video._id,
        parentId: null,
        isDeleted: false
      });
      
      console.log(`Video ${video._id}: Current count = ${video.comments || 0}, Actual count = ${commentCount}`);
      
      // Update video document if counts don't match
      if ((video.comments || 0) !== commentCount) {
        await videosCollection.updateOne(
          { _id: video._id },
          { $set: { comments: commentCount } }
        );
        console.log(`✅ Updated video ${video._id} comment count to ${commentCount}`);
      } else {
        console.log(`✓ Video ${video._id} comment count is already correct`);
      }
    }
    
    console.log('✅ Comment count fix completed');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

// Run the script
checkCollections();
