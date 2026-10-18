const ago = (ms) => new Date(Date.now() - ms).toISOString()

export const TECHNICIANS = [
  'Unassigned',
  'Network Operations (David K.)',
  'Hardware Support (Alex R.)',
  'Facilities Maintenance (Carlos T.)',
  'Campus Security & Access (Sarah M.)',
  'AV Services (Jordan L.)',
  'LMS Admin (Dr. Myers)',
]

export const CATEGORIES = [
  'Wi-Fi & Network',
  'Classroom Tech & A/V',
  'Hardware & Labs',
  'Campus Facilities',
  'Software & LMS',
  'Dormitory Maintenance',
  'ID Card & Access',
  'Other / General Support',
]

export const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent']
export const STATUSES = ['Pending', 'In Progress', 'Resolved']

export const DEPARTMENTS = [
  'Computer Science',
  'Engineering',
  'Natural Sciences',
  'Arts & Humanities',
  'Business & Finance',
  'Campus Housing',
  'Library Services',
  'Athletics & Recreation',
  'Administrative',
]

export const FAQS = [
  {
    question: 'How do I connect to the Campus-Secure Wi-Fi?',
    answer:
      'Select "Campus-Secure" from your device Wi-Fi settings. Use your student or staff email address as the username, and your campus portal password. If prompted for a certificate, select "Trust / Campus-CA".',
  },
  {
    question: 'How do I reset my campus portal or email password?',
    answer:
      'Visit the Campus Identity Portal at identity.campus.edu or click the password recovery link on your login screen. Password resets require verification via your secondary recovery phone or email.',
  },
  {
    question: 'What do I do if my dormitory room keycard stops working?',
    answer:
      'During business hours (8 AM - 6 PM), visit the Campus Housing Office in North Quad. For after-hours assistance, contact the 24/7 Campus Safety desk at extension 4444.',
  },
  {
    question: 'How do I print documents in campus computer labs and libraries?',
    answer:
      'Log in to any lab workstation, select "Campus-FollowMe-Printer", and send your job. Then tap your student ID card at any Canon or HP release station across campus to collect your printout.',
  },
]

// Timestamps are relative to "now" so the demo data always looks fresh.
export const createDefaultTickets = () => [
  {
    id: 'TICK-1042',
    title: 'Wi-Fi connection drops intermittently in Science Building Hall 3',
    description:
      'Students and teaching assistants in Science Hall 301 and 304 are experiencing sudden disconnects from the "Campus-Secure" 5GHz Wi-Fi network during afternoon lectures.',
    category: 'Wi-Fi & Network',
    priority: 'High',
    status: 'In Progress',
    submitterName: 'Prof. Marcus Vance',
    submitterEmail: 'm.vance@campus.edu',
    submitterRole: 'Faculty',
    department: 'Computer Science',
    location: 'Science Building - Rm 304',
    createdAt: ago(64.8e6),
    updatedAt: ago(14.4e6),
    assignedTo: 'Network Operations (David K.)',
    adminNotes: 'Checked WAP-3B. Firmware upgrade required. Technician scheduled onsite visit at 2:00 PM.',
    history: [
      { status: 'Pending', timestamp: ago(64.8e6), note: 'Ticket submitted via portal.' },
      {
        status: 'In Progress',
        timestamp: ago(14.4e6),
        note: 'Assigned to Network Operations (David K.). Scheduled AP diagnostic.',
      },
    ],
  },
  {
    id: 'TICK-1041',
    title: 'Ceiling projector lamp failure in Humanities Auditorium B',
    description:
      'The digital projector is flashing an orange lamp error light and will not display HDMI feed from the podium laptop. Philosophy 101 lecture scheduled tomorrow at 9 AM.',
    category: 'Classroom Tech & A/V',
    priority: 'Urgent',
    status: 'Pending',
    submitterName: 'Elena Rostova',
    submitterEmail: 'e.rostova@campus.edu',
    submitterRole: 'Staff',
    department: 'Arts & Humanities',
    location: 'Humanities Hall - Aud B',
    createdAt: ago(7.2e6),
    updatedAt: ago(7.2e6),
    assignedTo: 'Unassigned',
    adminNotes: '',
    history: [{ status: 'Pending', timestamp: ago(7.2e6), note: 'Ticket submitted via portal.' }],
  },
  {
    id: 'TICK-1040',
    title: 'Student ID card NFC reader not unlocking North Dormitory entrance',
    description:
      'My student card works for library checkout, but the RFID scanner at North Dormitory main gate fails with three red beeps. Currently need security desk to buzz me in.',
    category: 'ID Card & Access',
    priority: 'Medium',
    status: 'In Progress',
    submitterName: 'Jordan Taylor',
    submitterEmail: 'jordan.taylor@student.campus.edu',
    submitterRole: 'Student',
    department: 'Campus Housing',
    location: 'North Dormitory - Main Entrance',
    createdAt: ago(108e6),
    updatedAt: ago(21.6e6),
    assignedTo: 'Campus Security & Access (Sarah M.)',
    adminNotes: 'Re-synced card permissions on Honeywell access controller. Awaiting user card re-tap test.',
    history: [
      { status: 'Pending', timestamp: ago(108e6), note: 'Ticket submitted via portal.' },
      { status: 'In Progress', timestamp: ago(21.6e6), note: 'Card permissions updated on central database.' },
    ],
  },
  {
    id: 'TICK-1039',
    title: 'Computer Lab 2 - Workstation #14 blue screens on boot',
    description:
      'Dell OptiPlex desktop in Lab 2 crashes with WHEA_UNCORRECTABLE_ERROR whenever students turn it on. Needs RAM or disk inspection.',
    category: 'Hardware & Labs',
    priority: 'Medium',
    status: 'Resolved',
    submitterName: 'Liam O’Connor',
    submitterEmail: 'liam.oc@campus.edu',
    submitterRole: 'Staff',
    department: 'Engineering',
    location: 'Engineering Complex - Lab 202',
    createdAt: ago(187.2e6),
    updatedAt: ago(36e6),
    assignedTo: 'Hardware Support (Alex R.)',
    adminNotes: 'Replaced faulty secondary 8GB DDR4 RAM stick. Ran MemTest86 with 0 errors. Workstation back online.',
    history: [
      { status: 'Pending', timestamp: ago(187.2e6), note: 'Ticket submitted.' },
      { status: 'In Progress', timestamp: ago(86.4e6), note: 'Diagnosing hardware failure.' },
      { status: 'Resolved', timestamp: ago(36e6), note: 'Memory stick replaced and verified.' },
    ],
  },
  {
    id: 'TICK-1038',
    title: 'Air conditioning unit leaking water in Library Study Room 4',
    description:
      'A noticeable water drip has formed directly above the conference table in Quiet Study Room 4 on the second floor of the Main Library. Safety hazard for power outlets nearby.',
    category: 'Campus Facilities',
    priority: 'High',
    status: 'Resolved',
    submitterName: 'Samantha Green',
    submitterEmail: 'sgreen@campus.edu',
    submitterRole: 'Staff',
    department: 'Library Services',
    location: 'Main Library - 2nd Floor Study Rm 4',
    createdAt: ago(270e6),
    updatedAt: ago(54e6),
    assignedTo: 'Facilities Maintenance (Carlos T.)',
    adminNotes: 'Condensate drain line cleared and insulated. Ceiling tile replaced.',
    history: [
      { status: 'Pending', timestamp: ago(270e6), note: 'Ticket submitted.' },
      { status: 'In Progress', timestamp: ago(172.8e6), note: 'Facilities team dispatched.' },
      { status: 'Resolved', timestamp: ago(54e6), note: 'Drain cleared and area dried.' },
    ],
  },
  {
    id: 'TICK-1037',
    title: 'Unable to access Canvas LMS course materials for BIO-302',
    description:
      'Enrolled in Bio-302 section 01 yesterday during add/drop period, but the course is not showing up in my student dashboard. Midterm assignment due Friday.',
    category: 'Software & LMS',
    priority: 'High',
    status: 'Pending',
    submitterName: 'Aisha Patel',
    submitterEmail: 'aisha.p@student.campus.edu',
    submitterRole: 'Student',
    department: 'Natural Sciences',
    location: 'Online / Remote',
    createdAt: ago(2.7e6),
    updatedAt: ago(2.7e6),
    assignedTo: 'Unassigned',
    adminNotes: '',
    history: [{ status: 'Pending', timestamp: ago(2.7e6), note: 'Ticket submitted via portal.' }],
  },
  {
    id: 'TICK-1036',
    title: 'Color Laser Printer 2A paper jam and toner smudge error',
    description:
      'The heavy-duty color printer in the business center is constantly jamming on tray 2 and producing black streak smudges across all printed copies.',
    category: 'Hardware & Labs',
    priority: 'Low',
    status: 'Resolved',
    submitterName: 'Kevin Miller',
    submitterEmail: 'kmiller@campus.edu',
    submitterRole: 'Faculty',
    department: 'Business & Finance',
    location: 'Management Hall - Copy Center 110',
    createdAt: ago(324e6),
    updatedAt: ago(100.8e6),
    assignedTo: 'Print Services',
    adminNotes: 'Cleaned toner rollers, replaced pickup feed rollers on Tray 2.',
    history: [
      { status: 'Pending', timestamp: ago(324e6), note: 'Ticket submitted.' },
      { status: 'In Progress', timestamp: ago(180e6), note: 'Parts ordered.' },
      { status: 'Resolved', timestamp: ago(100.8e6), note: 'Rollers replaced and test print passed.' },
    ],
  },
]
