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

    // Helpers for strict IST handling on any server OS
    const now = new Date();
    const istMs = now.getTime() + (5.5 * 3600000);
    const istNow = new Date(istMs);
    const year = istNow.getUTCFullYear();
    const month = String(istNow.getUTCMonth() + 1).padStart(2, '0');
    const d = String(istNow.getUTCDate()).padStart(2, '0');
    const today = new Date(`${year}-${month}-${d}T00:00:00.000Z`);

    const getISTDate = (timeStr) => {
      let [sh, sm] = timeStr.split(':').map(Number);
      let utcMins = (sh * 60 + sm) - (5.5 * 60);
      if (utcMins < 0) utcMins += 24 * 60;
      const h = String(Math.floor(utcMins / 60)).padStart(2, '0');
      const m = String(utcMins % 60).padStart(2, '0');
      return new Date(`${year}-${month}-${d}T${h}:${m}:00.000Z`);
    };

    // Get schedule for this room today
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[istNow.getUTCDay()];
    const schedules = await Schedule.find({ room_id, day: dayName, is_active: true });

    let schedule = null;
    const currentMins = istNow.getUTCHours() * 60 + istNow.getUTCMinutes();
    for (let s of schedules) {
      const [sh, sm] = s.start_time.split(':').map(Number);
      const [eh, em] = s.end_time.split(':').map(Number);
      if (currentMins >= (sh * 60 + sm) && currentMins <= (eh * 60 + em) + 15) {
        schedule = s;
        break;
      }
    }

    if (!schedule) {
      return res.json({ message: 'No active lab schedule at this time. Location updated.' });
    }

    let classStart = null, classEnd = null, status = 'present';
    let subjectName = null, subjectTeacher = null;

    if (schedule) {
      subjectName = schedule.subject;
      subjectTeacher = schedule.teacher_id;

      classStart = getISTDate(schedule.start_time);
      classEnd = getISTDate(schedule.end_time);

      const classDurationMins = (classEnd - classStart) / 60000;
      const gracePeriodMins = classDurationMins * (1 / 12); // exactly 8.33%

      const diffMins = (now - classStart) / 60000;
      status = diffMins > gracePeriodMins ? 'late' : 'present';
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
      let updateFields = {};
      if (!attendance.last_session_start) {
        // Recovering from a disconnect
        updateFields.last_session_start = new Date();
      }
      let newStatus = 'present';
      if (classStart && classEnd) {
        const classDurationMins = (classEnd.getTime() - classStart.getTime()) / 60000;
        const gracePeriodMins = classDurationMins * (1 / 12);
        const initialDiffMins = (attendance.entry_time.getTime() - classStart.getTime()) / 60000;
        if (initialDiffMins > gracePeriodMins) newStatus = 'late';
      }
      
      if (attendance.disconnect_count > 3) {
        newStatus = 'late';
      }

      if (attendance.status === 'absent' || (attendance.status === 'present' && newStatus === 'late')) {
        updateFields.status = newStatus;
      }

      if (Object.keys(updateFields).length > 0) {
        attendance = await Attendance.findOneAndUpdate(
          { _id: attendance._id },
          { $set: updateFields },
          { new: true }
        );
      }
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

    // Helper for strict IST handling
    const now = new Date();
    const istMs = now.getTime() + (5.5 * 3600000);
    const istNow = new Date(istMs);
    const year = istNow.getUTCFullYear();
    const month = String(istNow.getUTCMonth() + 1).padStart(2, '0');
    const d = String(istNow.getUTCDate()).padStart(2, '0');
    const today = new Date(`${year}-${month}-${d}T00:00:00.000Z`);

    // Resolve the active tracking record for the most recent Subject block
    const attendance = await Attendance.findOne({ student_id, room_id, date: today }).sort({ class_start_time: -1 });

    // Do not override if teacher manually marked it
    if (attendance && attendance.manually_marked) {
      return res.json({ message: 'Student left, skipped attendance calc because manually marked.' });
    }

    if (attendance) {
      let updateFields = { status: 'absent' };
      let incFields = {};

      if (attendance.last_session_start) {
        const exitTime = new Date();
        const classStartTime = attendance.class_start_time || new Date(0);
        const classEndTime = attendance.class_end_time || exitTime;

        // Cap the measurable exit and start times to the precise lab boundaries
        const effectiveExitTime = exitTime > classEndTime ? classEndTime : exitTime;
        const effectiveStartTime = attendance.last_session_start < classStartTime ? classStartTime : attendance.last_session_start;

        if (exitTime.getTime() >= classStartTime.getTime() && exitTime.getTime() <= classEndTime.getTime()) {
          incFields.disconnect_count = 1;
        }

        let sessionMinutes = 0;
        // Only accrue duration if there is valid intersection with the class
        if (effectiveStartTime < effectiveExitTime) {
          const durationMs = effectiveExitTime - effectiveStartTime;
          sessionMinutes = durationMs / 60000;
          incFields.duration_minutes = sessionMinutes;
        }

        updateFields.exit_time = effectiveExitTime;
        updateFields.last_session_start = null; // Close the continuous tracking session

        const totalClassMins = attendance.class_start_time && attendance.class_end_time
          ? (attendance.class_end_time - attendance.class_start_time) / 60000
          : 120;

        const updatedDuration = (attendance.duration_minutes || 0) + sessionMinutes;
        updateFields.absent_duration_minutes = Math.max(0, totalClassMins - updatedDuration);
      }

      let updateParams = { $set: updateFields };
      if (Object.keys(incFields).length > 0) {
        updateParams.$inc = incFields;
      }
      await Attendance.updateOne({ _id: attendance._id }, updateParams);
    }

    res.json({ message: 'Student left, attendance updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
