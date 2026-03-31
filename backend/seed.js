const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const Teacher = require('./models/Teacher');
const Student = require('./models/Student');
const Room = require('./models/Room');
const Attendance = require('./models/Attendance');
const Schedule = require('./models/Schedule');

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/college_attendance';

const teachersData = [
  { teacher_id: "TCH001", name: "Amol Ingole", email: "amol.ingole@college.edu", password: "amol@123", bluetooth_name: "TEACHER_TCH001", subject: "Cellular Networks", role: "admin" },
  { teacher_id: "TCH002", name: "N.B. Patil", email: "nb.patil@college.edu", password: "patil@123", bluetooth_name: "TEACHER_TCH002", subject: "Power Devices and Circuits", role: "admin" },
  { teacher_id: "TCH003", name: "Dr. Satish Narkhede", email: "satish.narkhede@college.edu", password: "satish@123", bluetooth_name: "TEACHER_TCH003", subject: "Mini Project 1 & Mini Project 2", role: "admin" },
  { teacher_id: "TCH004", name: "Anagha Rajput", email: "anagha.rajput@college.edu", password: "anagha@123", bluetooth_name: "TEACHER_TCH004", subject: "Network Security", role: "admin" }
];

const roomsData = [
  { room_id: "LAB_ROOM_001", room_name: "Cellular Networks Lab", esp32_id: "ESP32_001", floor: "1", capacity: 30 },
  { room_id: "LAB_ROOM_002", room_name: "Power Devices Lab", esp32_id: "ESP32_002", floor: "1", capacity: 30 },
  { room_id: "LAB_ROOM_003", room_name: "Mini Project Lab 1", esp32_id: "ESP32_003", floor: "2", capacity: 30 },
  { room_id: "LAB_ROOM_004", room_name: "Network Security Lab", esp32_id: "ESP32_004", floor: "2", capacity: 30 },
  { room_id: "LAB_ROOM_005", room_name: "Mini Project Lab 2", esp32_id: "ESP32_005", floor: "2", capacity: 30 }
];

const schedulesData = [
  { room_id: "LAB_ROOM_001", teacher_id: "TCH001", subject: "Cellular Networks", day: "Monday", start_time: "10:30", end_time: "12:30", is_active: true },
  { room_id: "LAB_ROOM_002", teacher_id: "TCH002", subject: "Power Devices and Circuits", day: "Tuesday", start_time: "10:30", end_time: "12:30", is_active: true },
  { room_id: "LAB_ROOM_003", teacher_id: "TCH003", subject: "Mini Project 1", day: "Wednesday", start_time: "10:30", end_time: "12:30", is_active: true },
  { room_id: "LAB_ROOM_004", teacher_id: "TCH004", subject: "Network Security", day: "Thursday", start_time: "10:30", end_time: "12:30", is_active: true },
  { room_id: "LAB_ROOM_005", teacher_id: "TCH003", subject: "Mini Project 2", day: "Friday", start_time: "10:30", end_time: "12:30", is_active: true }
];

const studentNames = [
  "Pawan Sharma", "Rahul Patil", "Priya Desai", "Amit Kulkarni", "Sneha Joshi",
  "Rohit Bhosale", "Pooja Shinde", "Nikhil Jadhav", "Kavya Nair", "Arjun Mehta",
  "Divya Rane", "Saurabh More", "Ananya Singh", "Vikram Pawar", "Shruti Wagh",
  "Tejas Sawant", "Neha Gaikwad", "Karan Mhatre", "Rutuja Kadam", "Yash Salunkhe"
];

async function seedDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    console.log('Clearing existing data...');
    await Promise.all([
      Teacher.deleteMany({}),
      Student.deleteMany({}),
      Room.deleteMany({}),
      Attendance.deleteMany({}),
      Schedule.deleteMany({})
    ]);
    console.log('✅ Deleted all previous data');

    console.log('Seeding teachers...');
    for (let t of teachersData) {
      const salt = await bcrypt.genSalt(10);
      t.password = await bcrypt.hash(t.password, salt);
    }
    await Teacher.insertMany(teachersData);
    console.log('✅ Seeded 4 teachers');

    console.log('Seeding rooms...');
    await Room.insertMany(roomsData);
    console.log('✅ Seeded 5 rooms');

    console.log('Seeding schedules...');
    await Schedule.insertMany(schedulesData);
    console.log('✅ Seeded 5 schedules');

    console.log('Seeding students...');
    const studentsData = [];
    const studentSalt = await bcrypt.genSalt(10);
    const defaultStudentPassword = await bcrypt.hash("student@123", studentSalt);

    for (let i = 0; i < 20; i++) {
      const paddedId = String(i + 1).padStart(3, '0');
      studentsData.push({
        student_id: `STU${paddedId}`,
        name: studentNames[i],
        email: `student${paddedId}@college.edu`,
        password: defaultStudentPassword,
        bluetooth_name: `PHONE_STU${paddedId}`,
        roll_number: i + 1,
        class: "TE EXTC",
        role: "user",
        is_present: false,
        current_room: null
      });
    }
    await Student.insertMany(studentsData);
    console.log('✅ Seeded 20 students');

    console.log('\n🎉 Database seeded successfully!\n');
    console.log('📋 Teacher Logins:');
    teachersData.forEach(t => console.log(`   ${t.email} / (their unique password)`));
    console.log('📋 Student Logins:');
    console.log(`   student001@college.edu to student020@college.edu / student@123\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
}

seedDatabase();
