const mongoose = require('mongoose');
require('dotenv').config();

const Room = require('./models/Room');
const Schedule = require('./models/Schedule');

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/college_tracker';

async function fixTestRoom() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB...');

    // 1. Add ROOM_101 to the recognized Rooms list
    await Room.findOneAndUpdate(
      { room_id: 'ROOM_101' },
      { 
        room_name: 'ESP32 Hardware Test Lab',
        capacity: 60,
        registered_students: []
      },
      { upsert: true }
    );
    console.log('✅ Added "ESP32 Hardware Test Lab" (ROOM_101) to the database');

    // 2. Update the Saturday Schedule we made earlier to point to ROOM_101
    await Schedule.findOneAndUpdate(
      { day: 'Saturday', subject: 'Weekend Testing Lab' },
      { room_id: 'ROOM_101' }
    );
    console.log('✅ Re-linked Saturday test schedule to ROOM_101.');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

fixTestRoom();
