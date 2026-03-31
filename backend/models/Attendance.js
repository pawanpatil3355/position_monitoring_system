const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  student_id: { type: String, required: true },
  room_id: { type: String, required: true },
  subject: { type: String },
  teacher_id: { type: String },
  date: { type: Date, required: true },
  entry_time: { type: Date, default: null },
  exit_time: { type: Date, default: null },
  duration_minutes: { type: Number, default: 0 },
  absent_duration_minutes: { type: Number, default: 120 },
  status: { type: String, enum: ['present', 'absent', 'late'], default: 'absent' },
  class_start_time: { type: Date, default: null },
  class_end_time: { type: Date, default: null },
  manually_marked: { type: Boolean, default: false },
  marked_by: { type: String },
  disconnect_count: { type: Number, default: 0 },
  last_session_start: { type: Date, default: null }
}, { timestamps: true });

// Compound index to avoid duplicate attendance records per student/room/date/subject
attendanceSchema.index({ student_id: 1, room_id: 1, date: 1, subject: 1 }, { unique: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);

// Hotfix: Drop the legacy index on boot if it physically exists to prevent E11000 clashes between multiple subjects
try {
  Attendance.collection.dropIndex('student_id_1_room_id_1_date_1').catch(() => {});
} catch (err) {}

module.exports = Attendance;
