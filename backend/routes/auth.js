const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');

// POST /api/auth/teacher/login
router.post('/teacher/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const teacher = await Teacher.findOne({ email: email.toLowerCase() });
    if (!teacher) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, teacher.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: teacher._id, teacher_id: teacher.teacher_id, role: 'admin', name: teacher.name, email: teacher.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: teacher._id,
        teacher_id: teacher.teacher_id,
        name: teacher.name,
        email: teacher.email,
        subject: teacher.subject,
        role: 'admin',
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/auth/student/login
router.post('/student/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const student = await Student.findOne({ email: email.toLowerCase() });
    if (!student) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: student._id, student_id: student.student_id, role: 'user', name: student.name, email: student.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: student._id,
        student_id: student.student_id,
        name: student.name,
        email: student.email,
        roll_number: student.roll_number,
        class: student.class,
        role: 'user',
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
