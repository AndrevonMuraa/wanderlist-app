// Run this in mongosh
const db = db.getSiblingDB('test_database');

// Find and remove duplicates, keeping the first occurrence
// If one has visits, keep that one

const pipeline = [
  { $group: { 
    _id: { name: '$name', country_id: '$country_id' },
    count: { $sum: 1 },
    landmarks: { $push: '$$ROOT' }
  }},
  { $match: { count: { $gt: 1 } } }
];

const duplicates = db.landmarks.aggregate(pipeline).toArray();

print(`Found ${duplicates.length} duplicate groups`);

let removed = 0;

duplicates.forEach(function(group) {
  const landmarks = group.landmarks;
  
  // Keep first one, delete the rest
  for (let i = 1; i < landmarks.length; i++) {
    print(`Deleting: ${landmarks[i].landmark_id} (${landmarks[i].name})`);
    db.landmarks.deleteOne({ landmark_id: landmarks[i].landmark_id });
    removed++;
  }
});

print(`\nRemoved ${removed} duplicate landmarks`);
print(`Database should now have ${db.landmarks.countDocuments({})} landmarks`);
