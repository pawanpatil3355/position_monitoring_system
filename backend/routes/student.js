const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Teacher = require('../models/Teacher');

// GET /api/attendance/me — student's own attendance
router.get('/attendance/me', auth(['user']), async (req, res) => {
  try {
    const records = await Attendance.find({ student_id: req.user.student_id }).sort({ date: -1 });

    const uniqueLabs = await Attendance.aggregate([
      { $group: { _id: { date: "$date", room_id: "$room_id", subject: "$subject" } } }
    ]);
    const totalConducted = uniqueLabs.length;

    const presentCount = records.filter(r => r.status === 'present' || r.status === 'late').length;
    const absentCount = totalConducted - presentCount;
    const percentage = totalConducted > 0 ? Math.round((presentCount / totalConducted) * 100) : 0;

    res.json({ records, percentage, total: totalConducted, present: presentCount, absent: absentCount });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/profile/me — student own profile
router.get('/profile/me', auth(['user']), async (req, res) => {
  try {
    const student = await Student.findById(req.user.id, '-password');
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/profile/me — update student profile
router.put('/profile/me', auth(['user']), async (req, res) => {
  try {
    const { currentPassword, newPassword, bluetooth_name } = req.body;
    const student = await Student.findById(req.user.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ message: 'Current password required' });
      const match = await bcrypt.compare(currentPassword, student.password);
      if (!match) return res.status(400).json({ message: 'Current password is incorrect' });
      student.password = await bcrypt.hash(newPassword, 10);
    }

    if (bluetooth_name !== undefined) student.bluetooth_name = bluetooth_name;
    await student.save();

    const { password, ...data } = student.toObject();
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
