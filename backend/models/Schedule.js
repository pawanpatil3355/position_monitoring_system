const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  room_id: { type: String, required: true },
  teacher_id: { type: String, required: true },
  subject: { type: String, required: true },
  day: { type: String, required: true }, // "Monday", "Tuesday" etc.
  start_time: { type: String, required: true }, // "09:00"
  end_time: { type: String, required: true },   // "11:00"
  is_active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Schedule', scheduleSchema);
