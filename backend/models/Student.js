const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  student_id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  bluetooth_name: { type: String, default: '' },
  roll_number: { type: String, default: '' },
  class: { type: String, default: '' },
  current_room: { type: String, default: null },
  is_present: { type: Boolean, default: false },
  role: { type: String, default: 'user' },
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);
