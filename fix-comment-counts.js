/**
 * Script to fix video comment counts in the database
 * This script will count the actual comments for each video and update the video document
 */

const { MongoClient } = require('mongodb');

// MongoDB connection URL - update this to match your database
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lnk-api';

async function fixVideoCommentCounts() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const videosCollection = db.collection('videos');
    const commentsCollection = db.collection('videocomments');
    
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
    console.error('Error fixing comment counts:', error);
  } finally {
    await client.close();
  }
}

// Run the script
fixVideoCommentCounts();
