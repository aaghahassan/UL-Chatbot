import fs from "fs";

const path = "artifacts/api-server/data/university-knowledge.json";
const kb = JSON.parse(fs.readFileSync(path, "utf8"));

kb.university.name = "University of Layyah";
kb.university.spelling_note =
  "Always spell as Layyah (NOT Layyeh, NOT Lahore). Official website: https://ul.edu.pk";
kb.university.total_faculties = 5;
kb.university.total_departments = 21;
kb.university.total_programs = 56;

kb.campuses = kb.campuses.map((c) => {
  if (c.name === "City Campus") {
    return {
      ...c,
      type: "Administrative campus, Central Library, offices, and several teaching blocks",
      key_facilities_note:
        "University Central Library is at City Campus. Many admin offices are here.",
    };
  }
  if (c.name === "Main Campus") {
    return {
      ...c,
      type: "Main academic campus including Faculty of Computing & Engineering building",
      key_facilities_note:
        "Faculty of Computing & Engineering (CS, IT, Computer Engineering, AI, Data Science, E-Rozgaar labs) is at Main Campus.",
      faculties_primarily_here: ["Faculty of Computing & Engineering"],
    };
  }
  return c;
});

kb.faculties = [
  {
    name: "Faculty of Computing & Engineering",
    campus: "Main Campus",
    building:
      "Faculty of Computing and Engineering building, Main Campus, Karor Road (Hafiz Abad), Layyah",
    dean: { name: "Prof. Dr. M Amjad", role: "Dean" },
    departments: [
      {
        name: "Department of Computer Engineering",
        campus: "Main Campus",
        location: "Faculty of Computing and Engineering building, Main Campus",
        programs: [
          {
            name: "B.Sc Computer Engineering",
            program_incharge: [
              {
                name: "Engr. Dr. Muhammad Faheem Khalil Paracha",
                designation: "Lecturer",
                role: "Program Incharge",
              },
            ],
          },
        ],
      },
      {
        name: "Department of Computer Science",
        campus: "Main Campus",
        location:
          "Faculty of Computing and Engineering building, Main Campus (NOT City Campus)",
        programs: [
          {
            name: "BS Computer Science (BSCS)",
            program_incharge: [
              { name: "Dr. Abdul Qayoom", role: "Program Incharge" },
              { name: "Dr. Ashir Javeed", role: "Program Incharge" },
            ],
          },
          {
            name: "BSCS - Artificial Intelligence (BSAI)",
            program_incharge: [
              { name: "Muhammad Asif Aziz", role: "Program Incharge" },
            ],
          },
        ],
      },
      {
        name: "Department of Information Technology",
        campus: "Main Campus",
        location: "Faculty of Computing and Engineering building, Main Campus",
        programs: [
          {
            name: "BS Information Technology (BS IT)",
            program_incharge: [
              {
                name: "Dr. Nasrullah",
                designation: "Assistant Professor",
                role: "Program Incharge",
              },
              {
                name: "Dr. M Rehan Abbas",
                designation: "Assistant Professor",
                role: "Program Incharge",
              },
              { name: "Muhammad Faisal Hafeez", role: "Program Incharge" },
            ],
          },
          {
            name: "BSCS - Data Science (BSDS)",
            program_incharge: [
              { name: "Muhammad Shakeel", role: "Program Incharge" },
            ],
          },
        ],
      },
      {
        name: "E-Rozgaar Program",
        campus: "Main Campus",
        location:
          "E-Rozgaar Lab, Faculty of Computing and Engineering building, 1st Floor, Main Campus",
        programs: [
          { name: "Freelancing & Soft Skills" },
          { name: "SEO & Digital Marketing" },
          { name: "Graphic Design" },
          { name: "YouTube Automation" },
        ],
        note: "Fee Rs. 7,000 per course (discounted from Rs. 10,000). Duration 2 months. Eligibility: Matric minimum. Portal: https://erozgaar.ul.edu.pk",
      },
    ],
  },
  {
    name: "Faculty of Veterinary and Animal Sciences",
    campus: "Confirm with department (Layyah campuses)",
    dean: { name: "Prof. Dr. Muhammad Asif Raza", role: "Dean" },
    departments: [
      {
        name: "Department of Biosciences",
        leadership: [
          { name: "Prof. Dr. Muhammad Asif Raza", designation: "Dean" },
          {
            name: "Dr. Muhammad Ali",
            designation: "Assistant Professor",
            role: "Incharge, Department of Biosciences",
          },
        ],
        programs: [],
      },
      {
        name: "Department of Clinical Sciences",
        programs: [
          {
            name: "Livestock Assistant Diploma",
            note: "Practical skill-based program",
          },
        ],
      },
      {
        name: "Department of Livestock and Poultry Sciences",
        programs: [
          { name: "BS Poultry Sciences" },
          { name: "BS Dairy Technology" },
        ],
      },
      {
        name: "Department of Pathobiology",
        leadership: [
          { name: "Prof. Dr. Muhammad Asif Raza", designation: "Dean" },
          { name: "Dr. Muhammad Ali", designation: "Assistant Professor" },
        ],
        programs: [
          { name: "BS Microbiology" },
          { name: "POST-ADP (MICROBIOLOGY)" },
        ],
      },
    ],
  },
  {
    name: "Faculty of Agricultural Sciences and Technology",
    campus: "Confirm with department",
    departments: [
      {
        name: "Faculty of Agricultural Sciences and Technology",
        programs: [{ name: "B.Sc. (Hons) Agriculture" }],
      },
      {
        name: "Department of Plant Production & Biotechnology",
        leadership: [
          {
            name: "Dr. Zeeshan Hassan",
            designation: "Associate Professor",
          },
        ],
        programs: [{ name: "BS Biotechnology" }],
      },
      {
        name: "Department of Entomology & Food Science",
        leadership: [
          {
            name: "Dr. Muhammad Faisal Shahzad",
            designation: "Assistant Professor",
          },
        ],
        programs: [{ name: "BS Food Science & Technology" }],
      },
      {
        name: "Department of Horticulture & Plant Pathology",
        leadership: [
          {
            name: "Dr. Tahira Abbas",
            designation: "Associate Professor",
          },
        ],
        programs: [
          { name: "M.Sc. (Hons) Agriculture (Horticulture)" },
          { name: "BS Horticulture & Plant Pathology" },
        ],
      },
    ],
  },
  {
    name: "Faculty of Management, Humanities & Social Sciences",
    campus: "Confirm with department",
    departments: [
      {
        name: "Department of Behavioral Sciences",
        leadership: [
          {
            name: "Dr. Umbreen Shahzad",
            designation: "Associate Professor",
            role: "Department of Behavioral Sciences",
          },
        ],
        programs: [
          { name: "BS Education" },
          { name: "BS Applied Psychology" },
          { name: "BS Sociology" },
          { name: "BS Sports Science" },
          { name: "B.Ed (1.5)" },
          { name: "B.Ed (Hons)" },
          { name: "POST-ADP (PSYCHOLOGY)" },
          { name: "POST-ADP (SPORTS SCIENCE)" },
          { name: "POST-ADP (SOCIOLOGY)" },
          { name: "POST-ADP (EDUCATION)" },
        ],
      },
      {
        name: "Department of Islamic Studies and Languages",
        programs: [
          { name: "BS English" },
          { name: "BS Islamic Studies" },
          { name: "BS Urdu" },
          { name: "POST-ADP (ENGLISH)" },
          { name: "POST-ADP (ISLAMIC STUDIES)" },
          { name: "POST-ADP (URDU)" },
        ],
      },
      {
        name: "Department of Economics & Business Administration",
        leadership: [
          {
            name: "Dr. Sadia Anjum",
            designation: "Assistant Professor",
            role: "Department of Economics & Business Administration",
          },
        ],
        programs: [
          { name: "BS International Relations" },
          { name: "BBA" },
          { name: "BS Economics" },
          { name: "BS Public Administration & Governance" },
          { name: "BBA-IT" },
          { name: "POST-ADP (INTERNATIONAL RELATIONS)" },
          { name: "POST-ADP (PUBLIC ADMINISTRATION)" },
          { name: "POST-ADP (ECONOMICS)" },
          { name: "POST-ADP (BBA)" },
        ],
      },
    ],
  },
  {
    name: "Faculty of Natural Sciences",
    campus: "Confirm with department",
    departments: [
      {
        name: "Department of Chemistry",
        leadership: [
          { name: "Iqra Ahmad Malik", role: "Department Incharge" },
        ],
        programs: [
          { name: "BS Chemistry" },
          { name: "BS Environmental Sciences" },
          { name: "POST-ADP (ENVIRONMENTAL SCIENCE)" },
          { name: "POST-ADP (CHEMISTRY)" },
        ],
      },
      {
        name: "Department of Mathematics",
        programs: [
          { name: "BS Mathematics" },
          { name: "POST-ADP (MATHEMATICS)" },
        ],
      },
      {
        name: "Department of Physics",
        leadership: [{ name: "Dr. Tahira Abbas", role: "Incharge" }],
        programs: [{ name: "BS Physics" }],
      },
      {
        name: "Department of Zoology",
        programs: [
          { name: "BS Zoology" },
          { name: "POST-ADP (ZOOLOGY)" },
        ],
      },
      {
        name: "Department of Botany",
        leadership: [
          {
            name: "Dr. Azhar Abbas Khan",
            designation: "Associate Professor",
          },
        ],
        programs: [
          { name: "BS Botany" },
          { name: "POST-ADP (BOTANY)" },
        ],
      },
      {
        name: "Department of Biotechnology",
        programs: [
          { name: "BS Biotechnology" },
          { name: "POST-ADP (BIOTECHNOLOGY)" },
        ],
      },
    ],
  },
];

kb.programs = {
  total_programs_on_website: 56,
  spelling: "University of Layyah",
  note: "Complete program list mirrors Academics menu on https://ul.edu.pk",
  all_program_names: [
    "B.Sc Computer Engineering",
    "BS Computer Science (BSCS)",
    "BSCS - Artificial Intelligence (BSAI)",
    "BS Information Technology (BS IT)",
    "BSCS - Data Science (BSDS)",
    "Freelancing & Soft Skills",
    "SEO & Digital Marketing",
    "Graphic Design",
    "YouTube Automation",
    "Livestock Assistant Diploma",
    "BS Poultry Sciences",
    "BS Dairy Technology",
    "BS Microbiology",
    "POST-ADP (MICROBIOLOGY)",
    "B.Sc. (Hons) Agriculture",
    "BS Biotechnology",
    "BS Food Science & Technology",
    "M.Sc. (Hons) Agriculture (Horticulture)",
    "BS Horticulture & Plant Pathology",
    "BS Education",
    "BS Applied Psychology",
    "BS Sociology",
    "BS Sports Science",
    "B.Ed (1.5)",
    "B.Ed (Hons)",
    "POST-ADP (PSYCHOLOGY)",
    "POST-ADP (SPORTS SCIENCE)",
    "POST-ADP (SOCIOLOGY)",
    "POST-ADP (EDUCATION)",
    "BS English",
    "BS Islamic Studies",
    "BS Urdu",
    "POST-ADP (ENGLISH)",
    "POST-ADP (ISLAMIC STUDIES)",
    "POST-ADP (URDU)",
    "BS International Relations",
    "BBA",
    "BS Economics",
    "BS Public Administration & Governance",
    "BBA-IT",
    "POST-ADP (INTERNATIONAL RELATIONS)",
    "POST-ADP (PUBLIC ADMINISTRATION)",
    "POST-ADP (ECONOMICS)",
    "POST-ADP (BBA)",
    "BS Chemistry",
    "BS Environmental Sciences",
    "POST-ADP (ENVIRONMENTAL SCIENCE)",
    "POST-ADP (CHEMISTRY)",
    "BS Mathematics",
    "POST-ADP (MATHEMATICS)",
    "BS Physics",
    "BS Zoology",
    "POST-ADP (ZOOLOGY)",
    "BS Botany",
    "POST-ADP (BOTANY)",
    "POST-ADP (BIOTECHNOLOGY)",
  ],
  department_locations_critical: {
    "Department of Computer Science":
      "Main Campus — Faculty of Computing and Engineering building (NOT City Campus)",
    "Department of Information Technology":
      "Main Campus — Faculty of Computing and Engineering building",
    "Department of Computer Engineering":
      "Main Campus — Faculty of Computing and Engineering building",
    "E-Rozgaar Program":
      "Main Campus — E-Rozgaar Lab, 1st Floor, Computing building",
  },
};

kb.department_locations = {
  important:
    "Faculty of Computing & Engineering (including Computer Science) is at MAIN CAMPUS, not City Campus.",
  locations: [
    {
      department: "Department of Computer Science",
      campus: "Main Campus",
      building: "Faculty of Computing and Engineering building",
      programs: ["BSCS", "BSAI"],
    },
    {
      department: "Department of Information Technology",
      campus: "Main Campus",
      building: "Faculty of Computing and Engineering building",
      programs: ["BS IT", "BSDS"],
    },
    {
      department: "Department of Computer Engineering",
      campus: "Main Campus",
      building: "Faculty of Computing and Engineering building",
      programs: ["B.Sc Computer Engineering"],
    },
  ],
};

kb.teaching_staff = {
  note: "Staff list for UL assistant accuracy. Confirm on campus if critically important.",
  faculty_of_computing_and_engineering: {
    campus: "Main Campus",
    dean: "Prof. Dr. M Amjad",
    staff: [
      {
        name: "Engr. Dr. Muhammad Faheem Khalil Paracha",
        designation: "Lecturer",
        role: "Program Incharge — Computer Engineering",
      },
      { name: "Dr. Abdul Qayoom", role: "Program Incharge — BSCS" },
      { name: "Dr. Ashir Javeed", role: "Program Incharge — BSCS" },
      { name: "Muhammad Asif Aziz", role: "Program Incharge — BSAI" },
      {
        name: "Dr. Nasrullah",
        designation: "Assistant Professor",
        role: "Program Incharge — BS IT",
      },
      {
        name: "Dr. M Rehan Abbas",
        designation: "Assistant Professor",
        role: "Program Incharge — BS IT",
      },
      { name: "Muhammad Faisal Hafeez", role: "Program Incharge — BS IT" },
      { name: "Muhammad Shakeel", role: "Program Incharge — BSDS" },
    ],
  },
  other_key_staff: [
    {
      name: "Prof. Dr. Muhammad Asif Raza",
      designation: "Dean",
      unit: "Faculty of Veterinary and Animal Sciences / Pathobiology",
    },
    {
      name: "Dr. Muhammad Ali",
      designation: "Assistant Professor",
      role: "Incharge, Department of Biosciences",
    },
    {
      name: "Dr. Umbreen Shahzad",
      designation: "Associate Professor",
      unit: "Department of Behavioral Sciences",
    },
    {
      name: "Dr. Sadia Anjum",
      designation: "Assistant Professor",
      unit: "Department of Economics & Business Administration",
    },
    { name: "Iqra Ahmad Malik", role: "Department Incharge — Chemistry" },
    {
      name: "Dr. Tahira Abbas",
      role: "Incharge — Physics; Associate Professor — Horticulture & Plant Pathology",
    },
    {
      name: "Dr. Azhar Abbas Khan",
      designation: "Associate Professor",
      unit: "Department of Botany",
    },
    {
      name: "Dr. Zeeshan Hassan",
      designation: "Associate Professor",
      unit: "Department of Plant Production & Biotechnology",
    },
    {
      name: "Dr. Muhammad Faisal Shahzad",
      designation: "Assistant Professor",
      unit: "Department of Entomology & Food Science",
    },
  ],
};

kb.laboratories = {
  faculty_of_computing_and_engineering_building: {
    campus: "Main Campus",
    labs: [
      {
        name: "Computing Lab 1",
        location:
          "Faculty of Computing and Engineering building, Ground Floor, Main Campus",
      },
      {
        name: "Computing Lab 2",
        location:
          "Faculty of Computing and Engineering building, 1st Floor, Main Campus",
      },
      {
        name: "Computing Lab 3",
        location:
          "Faculty of Computing and Engineering building, Ground Floor, Main Campus",
      },
      {
        name: "E-Rozgaar Lab",
        location:
          "Faculty of Computing and Engineering building, 1st Floor, Main Campus",
      },
      {
        name: "DLD Lab",
        location:
          "Faculty of Computing and Engineering building, 1st Floor, Main Campus",
      },
    ],
  },
};

kb.libraries = {
  university_central_library: {
    name: "University Central Library",
    campus: "City Campus",
    location: "City Campus, Katchehry Road, Layyah",
  },
  computing_faculty_library: {
    name: "Library — Faculty of Computing and Engineering building",
    campus: "Main Campus",
    location: "Faculty of Computing and Engineering building, Main Campus",
  },
};

kb.transport = {
  fleet: "University of Layyah operates 8+ student buses",
  office: "Transport Section, University of Layyah",
  schedule_ref: "Transport / 55 / 2023",
  schedule_dated: "16/09/2023",
  effective_from:
    "15.09.2023 (confirm current session updates with Transport Section)",
  drivers_rotation: ["Haq Nawaz", "Mazhar Mehmood"],
  city_routes: {
    route_01: {
      departure: "08:00 AM from City Campus",
      stops: [
        "City Campus",
        "Sugar Mill Gate",
        "Chungi No. 10 Phatak",
        "Khan De Hati",
        "Canal Colony Gate",
        "Highway Colony Gate",
        "Eid Gah Chok",
        "Mastana Hotel",
        "Aslam Mor",
        "Sadar Bazar",
        "Railway Phatak",
        "Layyah Minor Pul",
        "TDA Chok",
        "Lari Ada",
        "City Campus (Return)",
      ],
    },
    route_02: {
      departure: "08:00 AM from City Campus",
      stops: [
        "City Campus",
        "Lari Ada",
        "Affor Store",
        "Faiz Chok",
        "Bhata Mor",
        "Railway Phatak",
        "Kalma Chok Bypass",
        "Chungi No. 06",
        "Top Chok",
        "Zakriya Academy",
        "GPO",
        "Thana City",
        "Aslam Mor",
        "Sadar Bazar",
        "Railway Phatak",
        "Layyah Minor Pul",
        "TDA Chok",
        "Lari Ada",
        "City Campus (Return)",
      ],
    },
  },
  inter_campus_and_city_schedule: [
    { from: "City Campus", time: "06:30 AM", route: "Layyah City Routes" },
    { from: "City Campus", time: "07:30 AM", route: "To Main Campus" },
    { from: "Main Campus", time: "07:45 AM", route: "To City Campus" },
    { from: "City Campus", time: "08:00 AM", route: "To Main Campus" },
    { from: "Main Campus", time: "08:15 AM", route: "To City Campus" },
    { from: "City Campus", time: "09:00 AM", route: "To Main Campus" },
    { from: "Main Campus", time: "09:20 AM", route: "To City Campus" },
    { from: "City Campus", time: "10:30 AM", route: "To Main Campus" },
    { from: "Main Campus", time: "11:15 AM", route: "To City Campus" },
    {
      from: "City Campus",
      time: "11:00 AM",
      route: "Layyah City Routes (For Evening)",
    },
    {
      from: "City Campus",
      time: "11:45 AM",
      route: "To Main Campus",
      note: "Printed notice may show 11:45 pm; treated as 11:45 AM",
    },
    { from: "Main Campus", time: "12:20 PM", route: "To City Campus" },
    { from: "City Campus", time: "12:45 PM", route: "To Main Campus" },
    { from: "Main Campus", time: "01:10 PM", route: "To City Campus" },
    { from: "City Campus", time: "01:30 PM", route: "Layyah City Routes" },
    { from: "City Campus", time: "03:00 PM", route: "To Main Campus" },
    { from: "Main Campus", time: "03:30 PM", route: "To City Campus" },
    { from: "City Campus", time: "04:00 PM", route: "To Main Campus" },
    { from: "Main Campus", time: "04:30 PM", route: "To City Campus" },
    { from: "City Campus", time: "05:00 PM", route: "To Main Campus" },
    { from: "City Campus", time: "05:15 PM", route: "Layyah City Routes" },
    { from: "Main Campus", time: "06:00 PM", route: "To City Campus" },
  ],
  transport_page: "https://ul.edu.pk/page/Transport",
};

kb.fee_structure = {
  important_notice:
    "Official fee amounts are on the university Fee Structure page and can change by session/shift. Always confirm before payment.",
  fee_structure_url: "https://ul.edu.pk/page/Fee-Structure",
  how_to_check_updated_fees: [
    "Open https://ul.edu.pk/page/Fee-Structure",
    "Select Category (program group)",
    "Select Shift",
    "Select Admission Year",
    "Click Search to view the current fee for that program",
  ],
  contact_accounts:
    "Accounts Section — City Campus | info@ul.edu.pk | +92-0606-920247",
  how_to_pay:
    "Bank Challan in designated bank branches / as instructed at admission.",
  known_fees: {
    erozgaar_each_course: "Rs. 7,000 (discounted from Rs. 10,000)",
  },
  note_for_assistant:
    "Do not invent exact semester fee numbers. Direct users to https://ul.edu.pk/page/Fee-Structure. Mention E-Rozgaar Rs. 7000 when asked about E-Rozgaar.",
};

kb.campus_facilities = {
  ...kb.campus_facilities,
  libraries:
    "Central Library at City Campus; library in Faculty of Computing and Engineering building at Main Campus",
  computing_labs:
    "Computing Lab 1, Lab 2, Lab 3, E-Rozgaar Lab, DLD Lab — Faculty of Computing and Engineering building, Main Campus",
  transport:
    "8+ university buses with city routes and City↔Main campus schedule — see transport section",
  computing_faculty_campus:
    "Faculty of Computing & Engineering is located at MAIN CAMPUS",
};

kb.visitor_guide.suggested_questions = [
  "Where is the Computer Science department?",
  "List all faculties and programs",
  "Who is the dean of Computing & Engineering?",
  "Show bus timings and routes",
  "Where are Computing Lab 1 and E-Rozgaar Lab?",
  "Where is the Central Library?",
  "How do I check updated fee structure for BS Computer Science?",
  "Who is program incharge of BSAI?",
];

fs.writeFileSync(path, JSON.stringify(kb, null, 2));
console.log(
  "OK faculties=",
  kb.faculties.length,
  "programs=",
  kb.programs.all_program_names.length,
);
