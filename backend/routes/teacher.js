const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Room = require('../models/Room');
const Attendance = require('../models/Attendance');
const Schedule = require('../models/Schedule');
const { Parser } = require('json2csv');

// GET /api/teachers — all teacher locations (both admin & user)
router.get('/teachers', auth(['admin', 'user']), async (req, res) => {
  try {
    const teachers = await Teacher.find({}, '-password');
    res.json(teachers);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/students — all students (admin only)
router.get('/students', auth(['admin']), async (req, res) => {
  try {
    const students = await Student.find({}, '-password');
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/students — add new student (admin only)
router.post('/students', auth(['admin']), async (req, res) => {
  try {
    const { name, email, password, bluetooth_name, roll_number, class: cls, student_id } = req.body;
    if (!name || !email || !password || !student_id) {
      return res.status(400).json({ message: 'name, email, password, student_id required' });
    }
    const existing = await Student.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ message: 'Student with this email already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const student = new Student({
      student_id,
      name,
      email: email.toLowerCase(),
      password: hashed,
      bluetooth_name: bluetooth_name || '',
      roll_number: roll_number || '',
      class: cls || '',
    });
    await student.save();
    const { password: _, ...studentData } = student.toObject();
    res.status(201).json(studentData);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/students/:student_id — update student (admin only)
router.put('/students/:student_id', auth(['admin']), async (req, res) => {
  try {
    const { name, bluetooth_name, roll_number, class: cls } = req.body;
    const student = await Student.findOneAndUpdate(
      { student_id: req.params.student_id },
      { name, bluetooth_name, roll_number, class: cls },
      { new: true, select: '-password' }
    );
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/students/:student_id — remove student (admin only)
router.delete('/students/:student_id', auth(['admin']), async (req, res) => {
  try {
    const student = await Student.findOneAndDelete({ student_id: req.params.student_id });
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json({ message: 'Student deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/rooms — get all rooms (admin only)
router.get('/rooms', auth(['admin', 'user']), async (req, res) => {
  try {
    const rooms = await Room.find();
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/rooms/:room_id/students — assign students to room
router.post('/rooms/:room_id/students', auth(['admin']), async (req, res) => {
  try {
    const { student_ids } = req.body;
    const room = await Room.findOneAndUpdate(
      { room_id: req.params.room_id },
      { registered_students: student_ids },
      { new: true }
    );
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json(room);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/attendance/mark — manually mark attendance limits (admin only)
router.post('/attendance/mark', auth(['admin']), async (req, res) => {
  try {
    const { room_id, records, date, start_time, end_time } = req.body; 
    
    // Parse target date (defaults to today if not provided)
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const dayName = dayNames[targetDate.getDay()];
    // Find schedule for this room & day (if not historical, it might be inactive, but UI guarantees validity)
    const schedule = await Schedule.findOne({ room_id, day: dayName });
    
    const subject = schedule ? schedule.subject : 'Manual Override Lab';
    const teacher_id = schedule ? schedule.teacher_id : '';
    const teacherEntity = await Teacher.findById(req.user.id);
    const teacherName = teacherEntity ? teacherEntity.name : 'Teacher';

    // Calculate time bounds for DB matching
    let cStart = null;
    let cEnd = null;
    let totalClassMins = 120; // Default

    if (start_time && end_time) {
      cStart = new Date(targetDate);
      const [sh, sm] = start_time.split(':').map(Number);
      cStart.setHours(sh, sm, 0, 0);

      cEnd = new Date(targetDate);
      const [eh, em] = end_time.split(':').map(Number);
      cEnd.setHours(eh, em, 0, 0);
      
      totalClassMins = Math.round((cEnd - cStart) / 60000);
    }

    const bulkOps = records.map(r => {
      let duration = 0;
      let absent_duration = totalClassMins;
      
      // If manually marked present or late, they receive full lab duration credit
      if (r.status === 'present' || r.status === 'late') {
        duration = totalClassMins; 
        absent_duration = 0;
      }

      return {
        updateOne: {
          filter: { student_id: r.student_id, room_id, date: targetDate },
          update: {
            $set: {
              status: r.status,
              manually_marked: true,
              marked_by: teacherName,
              subject: subject,
              teacher_id: teacher_id,
              duration_minutes: duration,
              absent_duration_minutes: absent_duration,
              class_start_time: cStart,
              class_end_time: cEnd
            }
          },
          upsert: true
        }
      }
    });

    await Attendance.bulkWrite(bulkOps);
    res.json({ message: 'Attendance manually marked successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/attendance/history — native chronological feed (admin only)
router.get('/attendance/history', auth(['admin']), async (req, res) => {
  try {
    const teacherEntity = await Teacher.findById(req.user.id);
    if (!teacherEntity) return res.status(404).json({ message: 'Teacher not found' });

    // 1. Get Teacher's assigned schedule
    const schedules = await Schedule.find({ teacher_id: teacherEntity.teacher_id });
    
    const roomIds = [...new Set(schedules.map(s => s.room_id))];
    const records = await Attendance.find({ room_id: { $in: roomIds } });

    const groups = {};
    const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

    records.forEach(r => {
      if(!r.date) return;
      const rDate = new Date(r.date);
      const year = rDate.getFullYear();
      const month = String(rDate.getMonth() + 1).padStart(2, '0');
      const day = String(rDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const dayName = dayNames[rDate.getDay()];
      
      // Validate this block belongs strictly to the active schedule and Subject
      const matchedSchedule = schedules.find(s => s.room_id === r.room_id && s.day === dayName && s.subject === r.subject);
      if (!matchedSchedule) return;

      const key = `${dateStr}_${r.room_id}_${r.subject}`;
      if (!groups[key]) {
        groups[key] = {
           id: key,
           date: dateStr,
           room_id: r.room_id,
           subject: matchedSchedule.subject,
           start_time: matchedSchedule.start_time,
           end_time: matchedSchedule.end_time,
           total_students: 0,
           present_count: 0
        };
      }
      
      let currentStatus = r.status;
      if (!r.manually_marked) {
         let totalMins = 120;
         if (r.class_start_time && r.class_end_time) {
           totalMins = (new Date(r.class_end_time) - new Date(r.class_start_time)) / 60000;
         }
         if (totalMins <= 0) totalMins = 120;
         const d = r.duration_minutes || 0;
         if (d >= 0.9 * totalMins) currentStatus = 'present';
         else if (d > 0) currentStatus = 'late';
         else currentStatus = 'absent';
      }

      groups[key].total_students++;
      if (currentStatus === 'present' || currentStatus === 'late') {
         groups[key].present_count++;
      }
    });

    const historyList = Object.values(groups).sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(historyList);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/attendance/:room_id — attendance for a room (admin only)
router.get('/attendance/:room_id', auth(['admin']), async (req, res) => {
  try {
    const { date, subject } = req.query;
    const query = { room_id: req.params.room_id };
    if (subject) query.subject = subject;
    let d, d2;
    if (date) {
      d = new Date(date);
      d.setHours(0, 0, 0, 0);
      d2 = new Date(d); d2.setDate(d2.getDate() + 1);
      query.date = { $gte: d, $lt: d2 };
    }

    // --- AUTO SPILL-OVER LOGIC ---
    if (subject && date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (d && d.getTime() === today.getTime()) {
         const activeStudents = await Student.find({ current_room: req.params.room_id });
         if (activeStudents.length > 0) {
            const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
            const dayName = dayNames[today.getDay()];
            const schedule = await Schedule.findOne({ room_id: req.params.room_id, subject, day: dayName });
            if (schedule) {
               const [sh, sm] = schedule.start_time.split(':').map(Number);
               const classStart = new Date(today); classStart.setHours(sh, sm, 0, 0);
               const [eh, em] = schedule.end_time.split(':').map(Number);
               const classEnd = new Date(today); classEnd.setHours(eh, em, 0, 0);
               const now = new Date();

               const currentMins = now.getHours() * 60 + now.getMinutes();
               const startMins = sh * 60 + sm;
               const endMins = eh * 60 + em;
               
               // Only mirror presence if the Subject is actively operating natively today
               if (currentMins >= startMins - 15 && currentMins <= endMins + 15) {
                   for (let st of activeStudents) {
                      let att = await Attendance.findOne({ student_id: st.student_id, room_id: req.params.room_id, date: today, subject });
                      if (!att) {
                         const diffMins = (now - classStart) / 60000;
                         const status = diffMins > 10 ? 'late' : 'present';
                         att = new Attendance({
                            student_id: st.student_id,
                            room_id: req.params.room_id,
                            subject: subject,
                            teacher_id: schedule.teacher_id,
                            date: today,
                            entry_time: now,
                            last_session_start: now,
                            status: status,
                            class_start_time: classStart,
                            class_end_time: classEnd,
                            duration_minutes: 0,
                            absent_duration_minutes: 120,
                            disconnect_count: 0
                         });
                         await att.save();
                      } else if (!att.last_session_start && !att.manually_marked) {
                         att.last_session_start = now;
                         await att.save();
                      }
                   }
               }
            }
         }
      }
    }
    // ----------------------------

    const records = await Attendance.find(query).sort({ date: -1 });

    // Enrich with student names
    const studentIds = [...new Set(records.map(r => r.student_id))];
    const students = await Student.find({ student_id: { $in: studentIds } }, 'student_id name roll_number class');
    const studentMap = {};
    students.forEach(s => { studentMap[s.student_id] = s; });

    const enriched = records.map(r => {
      let rObj = r.toObject();
      let liveDuration = rObj.duration_minutes || 0;
      
      if (rObj.last_session_start && !rObj.manually_marked) {
         const now = new Date();
         const classStartTime = rObj.class_start_time ? new Date(rObj.class_start_time) : new Date(0);
         const classEndTime = rObj.class_end_time ? new Date(rObj.class_end_time) : now;
         
         const effectiveExitTime = now > classEndTime ? classEndTime : now;
         const effectiveStartTime = new Date(rObj.last_session_start) < classStartTime ? classStartTime : new Date(rObj.last_session_start);
         
         if (effectiveStartTime < effectiveExitTime) {
           liveDuration += (effectiveExitTime - effectiveStartTime) / 60000;
         }
      }
      
      let liveAbsent = rObj.absent_duration_minutes !== undefined ? rObj.absent_duration_minutes : 120;
      if (rObj.class_start_time && rObj.class_end_time) {
         const totalClassMins = (new Date(rObj.class_end_time) - new Date(rObj.class_start_time)) / 60000;
         liveAbsent = Math.max(0, totalClassMins - liveDuration);
      }

      let currentStatus = rObj.status;
      if (!rObj.manually_marked) {
         let totalMins = 120;
         if (rObj.class_start_time && rObj.class_end_time) {
            totalMins = Math.round((new Date(rObj.class_end_time) - new Date(rObj.class_start_time)) / 60000);
         }
         if (totalMins <= 0) totalMins = 120;
         if (liveDuration >= 0.9 * totalMins) currentStatus = 'present';
         else if (liveDuration > 0) currentStatus = 'late';
         else currentStatus = 'absent';
      }

      return {
        ...rObj,
        status: currentStatus,
        duration_minutes: Math.round(liveDuration),
        absent_duration_minutes: Math.round(liveAbsent),
        student_name: studentMap[r.student_id]?.name || r.student_id,
        roll_number: studentMap[r.student_id]?.roll_number || '',
        class: studentMap[r.student_id]?.class || '',
      };
    });
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/attendance/student/:student_id — attendance history (admin only)
router.get('/attendance/student/:student_id', auth(['admin']), async (req, res) => {
  try {
    const records = await Attendance.find({ student_id: req.params.student_id }).sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/schedule — all schedules (admin only)
router.get('/schedule', auth(['admin', 'user']), async (req, res) => {
  try {
    const schedules = await Schedule.find();
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/schedule — create schedule (admin only)
router.post('/schedule', auth(['admin']), async (req, res) => {
  try {
    const { room_id, teacher_id, subject, day, start_time, end_time } = req.body;
    if (!room_id || !teacher_id || !subject || !day || !start_time || !end_time) {
      return res.status(400).json({ message: 'All fields required' });
    }
    const schedule = new Schedule({ room_id, teacher_id, subject, day, start_time, end_time, is_active: true });
    await schedule.save();
    res.status(201).json(schedule);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/schedule/:id — update schedule (admin only)
router.put('/schedule/:id', auth(['admin']), async (req, res) => {
  try {
    const schedule = await Schedule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!schedule) return res.status(404).json({ message: 'Schedule not found' });
    res.json(schedule);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/schedule/:id — delete schedule (admin only)
router.delete('/schedule/:id', auth(['admin']), async (req, res) => {
  try {
    await Schedule.findByIdAndDelete(req.params.id);
    res.json({ message: 'Schedule deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});



// GET /api/profile — teacher own profile
router.get('/profile', auth(['admin']), async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.id, '-password');
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
    res.json(teacher);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/profile — update teacher profile
router.put('/profile', auth(['admin']), async (req, res) => {
  try {
    const { name, subject, bluetooth_name, currentPassword, newPassword } = req.body;
    const teacher = await Teacher.findById(req.user.id);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ message: 'Current password required to change password' });
      const match = await bcrypt.compare(currentPassword, teacher.password);
      if (!match) return res.status(400).json({ message: 'Current password is incorrect' });
      teacher.password = await bcrypt.hash(newPassword, 10);
    }

    if (name) teacher.name = name;
    if (subject) teacher.subject = subject;
    if (bluetooth_name !== undefined) teacher.bluetooth_name = bluetooth_name;
    await teacher.save();

    const { password, ...data } = teacher.toObject();
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
