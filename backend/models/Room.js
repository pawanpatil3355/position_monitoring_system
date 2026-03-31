const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  room_id: { type: String, required: true, unique: true },
  room_name: { type: String, required: true },
  floor: { type: String, default: '' },
  building: { type: String, default: '' },
  assigned_esp32: { type: String, default: '' },
  capacity: { type: Number, default: 30 },
  registered_students: [{ type: String }], // array of student_ids
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);
