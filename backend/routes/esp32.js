const express = require('express');
const router = express.Router();
const esp32Auth = require('../middleware/esp32');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Schedule = require('../models/Schedule');
const Room = require('../models/Room');

// POST /api/update-location — teacher detected by ESP32
router.post('/update-location', esp32Auth, async (req, res) => {
  try {
    const { teacher_id, room_id, rssi } = req.body;
    if (!teacher_id || !room_id) return res.status(400).json({ message: 'teacher_id and room_id required' });

    const teacher = await Teacher.findOneAndUpdate(
      { teacher_id },
      { current_room: room_id, last_seen: new Date(), is_active: true },
      { new: true }
    );
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    res.json({ message: 'Teacher location updated', teacher });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/teacher-left — teacher left the room
router.post('/teacher-left', esp32Auth, async (req, res) => {
  try {
    const { teacher_id } = req.body;
    if (!teacher_id) return res.status(400).json({ message: 'teacher_id required' });

    const teacher = await Teacher.findOneAndUpdate(
      { teacher_id },
      { current_room: null, last_seen: new Date(), is_active: false },
      { new: true }
    );
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    res.json({ message: 'Teacher marked as left', teacher });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/student-detected — student detected by ESP32
router.post('/student-detected', esp32Auth, async (req, res) => {
  try {
    const { student_id, room_id } = req.body;
    if (!student_id || !room_id) return res.status(400).json({ message: 'student_id and room_id required' });

    // Update student location
    const student = await Student.findOneAndUpdate(
      { student_id },
      { current_room: room_id, is_present: true },
      { new: true }
    );
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // Get today's date (normalized to midnight)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get schedule for this room today
    const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const dayName = dayNames[new Date().getDay()];
    const schedules = await Schedule.find({ room_id, day: dayName, is_active: true });
    
    let schedule = null;
    const nowLocal = new Date();
    const currentMins = nowLocal.getHours() * 60 + nowLocal.getMinutes();
    for (let s of schedules) {
        const [sh, sm] = s.start_time.split(':').map(Number);
        const [eh, em] = s.end_time.split(':').map(Number);
        if (currentMins >= (sh * 60 + sm) - 15 && currentMins <= (eh * 60 + em) + 15) {
             schedule = s;
             break;
        }
    }
    if (!schedule && schedules.length > 0) schedule = schedules[0];

    let classStart = null, classEnd = null, status = 'present';
    let subjectName = null, subjectTeacher = null;

    if (schedule) {
      subjectName = schedule.subject;
      subjectTeacher = schedule.teacher_id;
      
      const [sh, sm] = schedule.start_time.split(':').map(Number);
      classStart = new Date(today); classStart.setHours(sh, sm, 0, 0);
      
      const [eh, em] = schedule.end_time.split(':').map(Number);
      classEnd = new Date(today); classEnd.setHours(eh, em, 0, 0);

      const now = new Date();
      const diffMins = (now - classStart) / 60000;
      status = diffMins > 10 ? 'late' : 'present';
    }

    // Check if record exists for this specific Subject block
    let attendance = await Attendance.findOne({ student_id, room_id, date: today, subject: subjectName });
    
    // Do not override if teacher manually marked it
    if (attendance && attendance.manually_marked) {
      return res.json({ message: 'Student detected, skipped because manually marked by teacher.', attendance });
    }

    if (!attendance) {
      // Create new
      attendance = new Attendance({
        student_id,
        room_id,
        subject: subjectName,
        teacher_id: subjectTeacher,
        date: today,
        entry_time: new Date(),
        last_session_start: new Date(),
        status,
        class_start_time: classStart,
        class_end_time: classEnd,
        duration_minutes: 0,
        absent_duration_minutes: 120,
        disconnect_count: 0
      });
      await attendance.save();
    } else {
      if (!attendance.last_session_start) {
        // Recovering from a disconnect
        attendance.last_session_start = new Date();
      }
      if (attendance.status === 'absent') {
        attendance.status = status;
      }
      await attendance.save();
    }

    res.json({ message: 'Student detected, attendance recorded', attendance });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/student-left — student left the room
router.post('/student-left', esp32Auth, async (req, res) => {
  try {
    const { student_id, room_id } = req.body;
    if (!student_id || !room_id) return res.status(400).json({ message: 'student_id and room_id required' });

    // Update student
    await Student.findOneAndUpdate({ student_id }, { current_room: null, is_present: false });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Resolve the active tracking record for the most recent Subject block
    const attendance = await Attendance.findOne({ student_id, room_id, date: today }).sort({ class_start_time: -1 });
    
    // Do not override if teacher manually marked it
    if (attendance && attendance.manually_marked) {
      return res.json({ message: 'Student left, skipped attendance calc because manually marked.' });
    }

    if (attendance) {
      // Increment the dropped connection count
      attendance.disconnect_count = (attendance.disconnect_count || 0) + 1;

      if (attendance.last_session_start) {
        const exitTime = new Date();
        const classStartTime = attendance.class_start_time || new Date(0);
        const classEndTime = attendance.class_end_time || exitTime;
        
        // Cap the measurable exit and start times to the precise lab boundaries
        const effectiveExitTime = exitTime > classEndTime ? classEndTime : exitTime;
        const effectiveStartTime = attendance.last_session_start < classStartTime ? classStartTime : attendance.last_session_start;
        
        // Only accrue duration if there is valid intersection with the class
        if (effectiveStartTime < effectiveExitTime) {
          const durationMs = effectiveExitTime - effectiveStartTime;
          const sessionMinutes = durationMs / 60000;
          attendance.duration_minutes = (attendance.duration_minutes || 0) + sessionMinutes;
        }
        
        attendance.exit_time = exitTime; 
        attendance.last_session_start = null; // Close the continuous tracking session

        const totalClassMins = attendance.class_start_time && attendance.class_end_time 
          ? (attendance.class_end_time - attendance.class_start_time) / 60000 
          : 120;
          
        attendance.absent_duration_minutes = Math.max(0, totalClassMins - attendance.duration_minutes);
      }
      
      attendance.status = 'absent'; // Force status to absent so Dashboard only shows currently active students
      
      await attendance.save();
    }

    res.json({ message: 'Student left, attendance updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
