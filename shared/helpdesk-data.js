export const TECHNICIANS = [
  'Unassigned',
  'Network Operations (David K.)',
  'Hardware Support (Alex R.)',
  'Facilities Maintenance (Carlos T.)',
  'Campus Security & Access (Sarah M.)',
  'AV Services (Jordan L.)',
  'LMS Admin (Dr. Myers)',
]

export const ROUTING_ASSIGNMENTS = [
  { department: 'Computer Science', team: 'Network Operations', assignedTo: 'Network Operations (David K.)' },
  { department: 'Engineering', team: 'Hardware Support', assignedTo: 'Hardware Support (Alex R.)' },
  { department: 'Library Services', team: 'Facilities Maintenance', assignedTo: 'Facilities Maintenance (Carlos T.)' },
  { department: 'Campus Housing', team: 'Campus Security & Access', assignedTo: 'Campus Security & Access (Sarah M.)' },
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

export const PRIORITIES = ['Low', 'Medium', 'High', 'Critical']
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
