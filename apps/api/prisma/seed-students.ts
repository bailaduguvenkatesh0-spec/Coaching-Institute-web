// ─────────────────────────────────────────────────────────────────────────────
// TEAM B Coaching Institute — Seed 100 Demonstration Students
// Upserts 4 tech courses and exactly 100 fictional student demonstration records.
// ─────────────────────────────────────────────────────────────────────────────

import { PrismaClient, FeeStatus, StudentStatus } from '@prisma/client';

const prisma = new PrismaClient();

const COURSES_DATA = [
  {
    id: 'course-java-fs',
    courseCode: 'JAVA-FS-2026',
    title: 'Java Full Stack',
    description: 'Full stack enterprise software engineering with Java 21, Spring Boot 3, and React.',
  },
  {
    id: 'course-py-fs',
    courseCode: 'PY-FS-2026',
    title: 'Python Full Stack',
    description: 'Full stack development with Python, Django, FastAPI, PostgreSQL, and React.',
  },
  {
    id: 'course-web-dev',
    courseCode: 'WEB-DEV-2026',
    title: 'Web Development',
    description: 'Modern front-to-back web development with TypeScript, React, Node.js, and Next.js.',
  },
  {
    id: 'course-data-analytics',
    courseCode: 'DATA-ANLYT-2026',
    title: 'Data Analytics',
    description: 'Data analytics, visualization, and business intelligence with SQL, Python, and PowerBI.',
  },
];

const STUDENT_NAMES: string[] = [
  // 1-30: Java Full Stack (30)
  'Aarav Sharma',
  'Aditi Rao',
  'Ananya Deshmukh',
  'Arjun Patel',
  'Bhavya Nair',
  'Chaitanya Reddy',
  'Deepa Krishnan',
  'Devendra Joshi',
  'Divya Sengupta',
  'Esha Banerjee',
  'Farhan Akhtar',
  'Gautham Menon',
  'Harini Venkat',
  'Ishaan Mukherjee',
  'Jhanvi Kulkarni',
  'Karthik Subramanian',
  'Kavya Hegde',
  'Kunal Bhatia',
  'Lavanya Sundaram',
  'Madhav Nambiar',
  'Meera Pillai',
  'Mithun Chakraborty',
  'Nandini Iyer',
  'Nikhil Verma',
  'Pallavi Chauhan',
  'Pranav Dixit',
  'Priya Namboodiri',
  'Rahul Saxena',
  'Rajeshwari Gowda',
  'Rakesh Mallick',

  // 31-55: Python Full Stack (25)
  'Ritika Sen',
  'Rohan Khandelwal',
  'Roshni Majumdar',
  'Sagar Walia',
  'Sakshi Choudhary',
  'Sameer Qureshi',
  'Sandeep Bhattacharya',
  'Sanjay Mahajan',
  'Sanjana Reddy',
  'Sarvesh Tiwari',
  'Shalini Ranganathan',
  'Shivam Mishra',
  'Shreya Goswami',
  'Siddharth Roy',
  'Sneha Patil',
  'Sourav Das',
  'Sravanthi Chunduru',
  'Srikant Swaminathan',
  'Suhasini Natarajan',
  'Sumit Rastogi',
  'Sunita Acharya',
  'Suresh Prabhu',
  'Swati Agrawal',
  'Tanmay Deshpande',
  'Tarun Singhania',

  // 56-75: Web Development (20)
  'Tejaswini Murthy',
  'Uday Kiran',
  'Umang Mathur',
  'Utkarsh Shukla',
  'Vaishnavi Iyengar',
  'Varun Kapoor',
  'Veda Narayanan',
  'Vidya Balasubramanian',
  'Vignesh Raghavan',
  'Vijay Shekhawat',
  'Vikas Aggarwal',
  'Vinay Pathak',
  'Vineet Kaul',
  'Yamini Prasad',
  'Yashwardhan Rathore',
  'Zara Sheikh',
  'Abhimanyu Sethi',
  'Aishwarya Sridhar',
  'Akhil Varma',
  'Alok Ranjan',

  // 76-100: Data Analytics (25)
  'Amrita Chatterjee',
  'Anand Kumar',
  'Aniket Sawant',
  'Aniruddh Bose',
  'Ankita Tripathy',
  'Aparna Sundaresan',
  'Aravind Chandran',
  'Archana Godbole',
  'Ashish Khurana',
  'Avinash Goud',
  'Balaram Das',
  'Chetana Naidu',
  'Chirag Shah',
  'Darshan Mehta',
  'Dhanush Rajan',
  'Diksha Pandita',
  'Dinesh Solanki',
  'Gayatri Vats',
  'Girish Kamath',
  'Himanshu Mittal',
  'Indira Venkatesh',
  'Jayant Borah',
  'Kalyani Bhatt',
  'Lokesh Yadav',
  'Manisha Barua',
];

export async function seed100Students() {
  console.log('======================================================');
  console.log('  SEEDING 100 DEMONSTRATION STUDENTS & 4 COURSES      ');
  console.log('======================================================\n');

  // 1. Upsert Courses
  console.log('Step 1: Upserting 4 Technical Courses...');
  const courseMap: Record<string, string> = {};
  for (const c of COURSES_DATA) {
    const record = await prisma.course.upsert({
      where: { courseCode: c.courseCode },
      update: {
        title: c.title,
        description: c.description,
      },
      create: {
        id: c.id,
        courseCode: c.courseCode,
        title: c.title,
        description: c.description,
      },
    });
    courseMap[c.title] = record.id;
    console.log(`  ✓ Course: ${c.title} (${record.id})`);
  }

  // 2. Build 100 Student Records
  console.log('\nStep 2: Preparing 100 Student Records...');

  // Fee Status distribution: 60 PAID, 25 PARTIALLY_PAID, 15 PENDING
  const feeStatuses: FeeStatus[] = [
    ...Array(60).fill('PAID' as FeeStatus),
    ...Array(25).fill('PARTIALLY_PAID' as FeeStatus),
    ...Array(15).fill('PENDING' as FeeStatus),
  ];

  // Student Status distribution: 80 ACTIVE, 10 INACTIVE, 10 COMPLETED
  const studentStatuses: StudentStatus[] = [
    ...Array(80).fill('ACTIVE' as StudentStatus),
    ...Array(10).fill('INACTIVE' as StudentStatus),
    ...Array(10).fill('COMPLETED' as StudentStatus),
  ];

  // Course distribution: 30 Java, 25 Python, 20 Web Dev, 25 Data Analytics
  const studentCourses: string[] = [
    ...Array(30).fill('Java Full Stack'),
    ...Array(25).fill('Python Full Stack'),
    ...Array(20).fill('Web Development'),
    ...Array(25).fill('Data Analytics'),
  ];

  const now = new Date();
  let createdCount = 0;
  let updatedCount = 0;

  for (let i = 0; i < 100; i++) {
    const studentNum = i + 1;
    const studentId = `STU${String(studentNum).padStart(3, '0')}`;
    const name = STUDENT_NAMES[i];
    const courseTitle = studentCourses[i];
    const courseId = courseMap[courseTitle];
    const feeStatus = feeStatuses[i];
    const studentStatus = studentStatuses[i];

    // Fictional unique email
    const emailSlug = name.toLowerCase().replace(/[^a-z0-9]/g, '.');
    const email = `${emailSlug}.${studentId.toLowerCase()}@example.com`;

    // Varied admission date within previous 12 months (5 to 350 days ago)
    const daysAgo = Math.floor(5 + (i * 3.45));
    const admissionDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    const existing = await prisma.student.findUnique({
      where: { studentIdNumber: studentId },
    });

    await prisma.student.upsert({
      where: { studentIdNumber: studentId },
      update: {
        studentId,
        name,
        fullName: name,
        email,
        phone: null,
        courseId,
        admissionDate,
        feeStatus,
        studentStatus,
        enrollmentStatus: studentStatus,
        isDemoData: true,
      },
      create: {
        id: `stu-${studentId.toLowerCase()}`,
        studentIdNumber: studentId,
        studentId,
        name,
        fullName: name,
        email,
        phone: null,
        courseId,
        admissionDate,
        feeStatus,
        studentStatus,
        enrollmentStatus: studentStatus,
        isDemoData: true,
      },
    });

    if (existing) {
      updatedCount++;
    } else {
      createdCount++;
    }
  }

  console.log(`\nStep 3: Verification of Database Records:`);
  const totalInDb = await prisma.student.count();
  const demoCount = await prisma.student.count({ where: { isDemoData: true } });
  const activeCount = await prisma.student.count({ where: { studentStatus: 'ACTIVE', isDemoData: true } });
  const inactiveCount = await prisma.student.count({ where: { studentStatus: 'INACTIVE', isDemoData: true } });
  const completedCount = await prisma.student.count({ where: { studentStatus: 'COMPLETED', isDemoData: true } });

  const paidCount = await prisma.student.count({ where: { feeStatus: 'PAID', isDemoData: true } });
  const partiallyPaidCount = await prisma.student.count({ where: { feeStatus: 'PARTIALLY_PAID', isDemoData: true } });
  const pendingFeeCount = await prisma.student.count({ where: { feeStatus: 'PENDING', isDemoData: true } });

  const javaCount = await prisma.student.count({ where: { course: { title: 'Java Full Stack' }, isDemoData: true } });
  const pyCount = await prisma.student.count({ where: { course: { title: 'Python Full Stack' }, isDemoData: true } });
  const webCount = await prisma.student.count({ where: { course: { title: 'Web Development' }, isDemoData: true } });
  const dataCount = await prisma.student.count({ where: { course: { title: 'Data Analytics' }, isDemoData: true } });

  console.log(`  ✓ Total Students in Database:       ${totalInDb} (includes existing non-demo records)`);
  console.log(`  ✓ 100 Demo Records Inserted:        ${demoCount} demo students`);
  console.log(`  ✓ Inserted New:                     ${createdCount}`);
  console.log(`  ✓ Updated Existing:                 ${updatedCount}`);
  console.log(`\n  Course Distribution (Expected: 30 / 25 / 20 / 25):`);
  console.log(`    • Java Full Stack:                ${javaCount}`);
  console.log(`    • Python Full Stack:              ${pyCount}`);
  console.log(`    • Web Development:                ${webCount}`);
  console.log(`    • Data Analytics:                 ${dataCount}`);
  console.log(`\n  Fee Status Distribution (Expected: 60 / 25 / 15):`);
  console.log(`    • PAID:                           ${paidCount}`);
  console.log(`    • PARTIALLY_PAID:                 ${partiallyPaidCount}`);
  console.log(`    • PENDING:                        ${pendingFeeCount}`);
  console.log(`\n  Student Status Distribution (Expected: 80 / 10 / 10):`);
  console.log(`    • ACTIVE:                         ${activeCount}`);
  console.log(`    • INACTIVE:                       ${inactiveCount}`);
  console.log(`    • COMPLETED:                      ${completedCount}`);

  console.log('\n======================================================');
  console.log('  100 DEMO STUDENTS SEEDED SUCCESSFULLY!              ');
  console.log('======================================================\n');
}

if (process.argv[1]?.includes('seed-students')) {
  seed100Students()
    .catch((err) => {
      console.error('Seed students error:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
