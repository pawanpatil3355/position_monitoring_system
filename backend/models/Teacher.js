const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
  teacher_id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  subject: { type: String, default: '' },
  bluetooth_name: { type: String, default: '' },
  current_room: { type: String, default: null },
  last_seen: { type: Date, default: null },
  is_active: { type: Boolean, default: false },
  role: { type: String, default: 'admin' },
}, { timestamps: true });

module.exports = mongoose.model('Teacher', teacherSchema);
