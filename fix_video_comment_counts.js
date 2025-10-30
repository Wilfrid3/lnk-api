/**
 * Database Migration Script - Fix Video Comment Counts
 * 
 * This script updates the comment counts in the videos collection
 * to match the actual number of comments in the video_comments collection.
 * 
 * Run this script once to fix the existing data discrepancy.
 */

// For use with MongoDB shell or a Node.js script
const mongoose = require('mongoose');

// Connection string - update with your MongoDB URI
const MONGODB_URI = 'mongodb://localhost:27017/your-database-name';

async function fixVideoCommentCounts() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all videos
    const videos = await mongoose.connection.db.collection('videos').find({}).toArray();
    console.log(`Found ${videos.length} videos to process`);

    let updatedCount = 0;

    for (const video of videos) {
      // Count actual comments (non-deleted root comments) for this video
      const actualCommentCount = await mongoose.connection.db.collection('videocomments').countDocuments({
        videoId: video._id,
        parentId: null, // Only count root comments
        isDeleted: false
      });

      // Update the video's comment count if it doesn't match
      if (video.comments !== actualCommentCount) {
        await mongoose.connection.db.collection('videos').updateOne(
          { _id: video._id },
          { $set: { comments: actualCommentCount } }
        );
        
        console.log(`Updated video ${video._id}: ${video.comments} -> ${actualCommentCount} comments`);
        updatedCount++;
      }
    }

    console.log(`\nMigration completed! Updated ${updatedCount} videos.`);
    
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the migration
fixVideoCommentCounts();

// Alternative: Direct MongoDB shell commands
// You can also run these commands directly in MongoDB shell:

/*
// 1. Get all videos and their actual comment counts
db.videos.aggregate([
  {
    $lookup: {
      from: "videocomments",
      let: { videoId: "$_id" },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$videoId", "$$videoId"] },
                { $eq: ["$parentId", null] },
                { $eq: ["$isDeleted", false] }
              ]
            }
          }
        },
        { $count: "count" }
      ],
      as: "commentCount"
    }
  },
  {
    $project: {
      _id: 1,
      title: 1,
      currentComments: "$comments",
      actualComments: { $ifNull: [{ $arrayElemAt: ["$commentCount.count", 0] }, 0] }
    }
  },
  {
    $match: {
      $expr: { $ne: ["$currentComments", "$actualComments"] }
    }
  }
]);

// 2. Update all videos with correct comment counts
db.videos.find().forEach(function(video) {
  var actualCount = db.videocomments.countDocuments({
    videoId: video._id,
    parentId: null,
    isDeleted: false
  });
  
  if (video.comments !== actualCount) {
    db.videos.updateOne(
      { _id: video._id },
      { $set: { comments: actualCount } }
    );
    print("Updated video " + video._id + ": " + video.comments + " -> " + actualCount);
  }
});

// 3. Verify the fix
db.videos.aggregate([
  {
    $lookup: {
      from: "videocomments",
      let: { videoId: "$_id" },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$videoId", "$$videoId"] },
                { $eq: ["$parentId", null] },
                { $eq: ["$isDeleted", false] }
              ]
            }
          }
        },
        { $count: "count" }
      ],
      as: "commentCount"
    }
  },
  {
    $project: {
      _id: 1,
      title: 1,
      comments: 1,
      actualComments: { $ifNull: [{ $arrayElemAt: ["$commentCount.count", 0] }, 0] },
      isCorrect: { $eq: ["$comments", { $ifNull: [{ $arrayElemAt: ["$commentCount.count", 0] }, 0] }] }
    }
  }
]);
*/
