// ── Vanderbilt ADHD Rating Scale question data and scoring ──

export const SYMPTOM_OPTIONS = [
  { label: "Never", value: 0 },
  { label: "Occasionally", value: 1 },
  { label: "Often", value: 2 },
  { label: "Very Often", value: 3 },
]

export const PERFORMANCE_OPTIONS = [
  { label: "Excellent", value: 1 },
  { label: "Above Average", value: 2 },
  { label: "Average", value: 3 },
  { label: "Somewhat of a Problem", value: 4 },
  { label: "Problematic", value: 5 },
]

// ── Parent Form (VADPRS) — 55 questions ──

export const PARENT_SECTIONS = [
  {
    id: "inattention",
    title: "Inattention",
    range: [1, 9],
    type: "symptom",
    questions: [
      "Fails to give close attention to details or makes careless mistakes in schoolwork",
      "Has difficulty sustaining attention in tasks or play activities",
      "Does not seem to listen when spoken to directly",
      "Does not follow through on instructions and fails to finish schoolwork (not due to oppositional behavior or failure to understand)",
      "Has difficulty organizing tasks and activities",
      "Avoids, dislikes, or is reluctant to engage in tasks that require sustained mental effort",
      "Loses things necessary for tasks or activities",
      "Is easily distracted by extraneous stimuli",
      "Is forgetful in daily activities",
    ],
  },
  {
    id: "hyperactivity",
    title: "Hyperactivity / Impulsivity",
    range: [10, 18],
    type: "symptom",
    questions: [
      "Fidgets with hands or feet or squirms in seat",
      "Leaves seat in classroom or in other situations in which remaining seated is expected",
      "Runs about or climbs excessively in situations in which it is inappropriate",
      "Has difficulty playing or engaging in leisure activities quietly",
      "Is 'on the go' or often acts as if 'driven by a motor'",
      "Talks excessively",
      "Blurts out answers before questions have been completed",
      "Has difficulty awaiting turn",
      "Interrupts or intrudes on others",
    ],
  },
  {
    id: "odd",
    title: "Oppositional Defiant Disorder",
    range: [19, 26],
    type: "symptom",
    questions: [
      "Loses temper",
      "Actively defies or refuses to comply with adults' requests or rules",
      "Is angry or resentful",
      "Argues with adults",
      "Deliberately annoys people",
      "Blames others for his or her mistakes or misbehavior",
      "Is touchy or easily annoyed by others",
      "Is spiteful or vindictive",
    ],
  },
  {
    id: "conduct",
    title: "Conduct Disorder",
    range: [27, 40],
    type: "symptom",
    questions: [
      "Bullies, threatens, or intimidates others",
      "Initiates physical fights",
      "Lies to obtain goods or favors or to avoid obligations",
      "Is physically cruel to people",
      "Has stolen items of nontrivial value",
      "Deliberately destroys others' property",
      "Has used a weapon that could cause serious physical harm",
      "Is physically cruel to animals",
      "Has deliberately set fires to cause damage",
      "Has broken into someone else's house, building, or car",
      "Has stayed out at night without permission",
      "Has run away from home overnight",
      "Has been truant from school",
      "Has forced someone into sexual activity",
    ],
  },
  {
    id: "anxiety",
    title: "Anxiety / Depression",
    range: [41, 47],
    type: "symptom",
    questions: [
      "Is fearful, anxious, or worried",
      "Is afraid to try new things for fear of making mistakes",
      "Feels worthless or inferior",
      "Blames self for problems, feels guilty",
      "Feels lonely, unwanted, or unloved; complains that 'no one likes me'",
      "Is sad, unhappy, or depressed",
      "Is self-conscious or easily embarrassed",
    ],
  },
  {
    id: "performance",
    title: "Performance",
    range: [48, 55],
    type: "performance",
    hint: "Rate the child's performance in each area (1 = Excellent, 5 = Problematic)",
    questions: [
      "Reading",
      "Mathematics",
      "Written expression",
      "Relationship with parents",
      "Relationship with siblings",
      "Relationship with peers",
      "Participation in organized activities (sports, clubs, etc.)",
      "Overall, how do you rate this child's functioning?",
    ],
  },
]

// ── Teacher Form (VADTRS) — 43 questions ──

export const TEACHER_SECTIONS = [
  {
    id: "inattention",
    title: "Inattention",
    range: [1, 9],
    type: "symptom",
    questions: [
      "Fails to give close attention to details or makes careless mistakes in schoolwork",
      "Has difficulty sustaining attention in tasks or play activities",
      "Does not seem to listen when spoken to directly",
      "Does not follow through on instructions and fails to finish schoolwork (not due to oppositional behavior or failure to understand)",
      "Has difficulty organizing tasks and activities",
      "Avoids, dislikes, or is reluctant to engage in tasks that require sustained mental effort",
      "Loses things necessary for tasks or activities",
      "Is easily distracted by extraneous stimuli",
      "Is forgetful in daily activities",
    ],
  },
  {
    id: "hyperactivity",
    title: "Hyperactivity / Impulsivity",
    range: [10, 18],
    type: "symptom",
    questions: [
      "Fidgets with hands or feet or squirms in seat",
      "Leaves seat in classroom or in other situations in which remaining seated is expected",
      "Runs about or climbs excessively in situations in which it is inappropriate",
      "Has difficulty playing or engaging in leisure activities quietly",
      "Is 'on the go' or often acts as if 'driven by a motor'",
      "Talks excessively",
      "Blurts out answers before questions have been completed",
      "Has difficulty awaiting turn",
      "Interrupts or intrudes on others",
    ],
  },
  {
    id: "oddConduct",
    title: "Oppositional / Conduct",
    range: [19, 28],
    type: "symptom",
    questions: [
      "Loses temper",
      "Actively defies or refuses to comply with adults' requests or rules",
      "Is angry or resentful",
      "Argues with adults",
      "Deliberately annoys people",
      "Blames others for his or her mistakes or misbehavior",
      "Is touchy or easily annoyed by others",
      "Is spiteful or vindictive",
      "Bullies, threatens, or intimidates others",
      "Initiates physical fights",
    ],
  },
  {
    id: "anxiety",
    title: "Anxiety / Depression",
    range: [29, 35],
    type: "symptom",
    questions: [
      "Is fearful, anxious, or worried",
      "Is afraid to try new things for fear of making mistakes",
      "Feels worthless or inferior",
      "Blames self for problems, feels guilty",
      "Feels lonely, unwanted, or unloved",
      "Is sad, unhappy, or depressed",
      "Is self-conscious or easily embarrassed",
    ],
  },
  {
    id: "performance",
    title: "Performance",
    range: [36, 43],
    type: "performance",
    hint: "Rate the child's performance in each area (1 = Excellent, 5 = Problematic)",
    questions: [
      "Reading",
      "Mathematics",
      "Written expression",
      "Relationship with peers",
      "Following directions",
      "Disrupting class",
      "Assignment completion",
      "Organizational skills",
    ],
  },
]

// ── Scoring ──

export function scoreParent(responses) {
  const count = (nums, threshold = 2) =>
    nums.filter((n) => (responses[`q${n}`] ?? -1) >= threshold).length

  const inattention  = count([1,2,3,4,5,6,7,8,9])
  const hyperactivity = count([10,11,12,13,14,15,16,17,18])
  const odd          = count([19,20,21,22,23,24,25,26])
  const conduct      = count([27,28,29,30,31,32,33,34,35,36,37,38,39,40])
  const anxiety      = count([41,42,43,44,45,46,47])

  const perfNums = [48,49,50,51,52,53,54,55]
  const perfVals = perfNums.map((n) => responses[`q${n}`] ?? 0)
  const performanceImpairmentCount = perfVals.filter((v) => v >= 4).length
  const avgPerformance = perfVals.length
    ? Math.round((perfVals.reduce((a, b) => a + b, 0) / perfVals.length) * 100) / 100
    : 0

  return {
    inattention,
    hyperactivity,
    odd,
    conduct,
    anxiety,
    performanceImpairmentCount,
    avgPerformance,
    flags: {
      inattentionPositive:   inattention  >= 6,
      hyperactivityPositive: hyperactivity >= 6,
      oddPositive:           odd           >= 4,
      conductPositive:       conduct       >= 3,
      anxietyPositive:       anxiety       >= 3,
      performanceImpaired:   performanceImpairmentCount > 0,
      overallADHDPositive:
        (inattention >= 6 || hyperactivity >= 6) && performanceImpairmentCount > 0,
    },
  }
}

export function scoreTeacher(responses) {
  const count = (nums, threshold = 2) =>
    nums.filter((n) => (responses[`q${n}`] ?? -1) >= threshold).length

  const inattention   = count([1,2,3,4,5,6,7,8,9])
  const hyperactivity = count([10,11,12,13,14,15,16,17,18])
  const oddConduct    = count([19,20,21,22,23,24,25,26,27,28])
  const anxiety       = count([29,30,31,32,33,34,35])

  const perfNums = [36,37,38,39,40,41,42,43]
  const perfVals = perfNums.map((n) => responses[`q${n}`] ?? 0)
  const performanceImpairmentCount = perfVals.filter((v) => v >= 4).length
  const avgPerformance = perfVals.length
    ? Math.round((perfVals.reduce((a, b) => a + b, 0) / perfVals.length) * 100) / 100
    : 0

  return {
    inattention,
    hyperactivity,
    oddConduct,
    anxiety,
    performanceImpairmentCount,
    avgPerformance,
    flags: {
      inattentionPositive:   inattention   >= 6,
      hyperactivityPositive: hyperactivity >= 6,
      oddConductPositive:    oddConduct    >= 3,
      anxietyPositive:       anxiety       >= 3,
      performanceImpaired:   performanceImpairmentCount > 0,
      overallADHDPositive:
        (inattention >= 6 || hyperactivity >= 6) && performanceImpairmentCount > 0,
    },
  }
}

export function generateToken(prefix) {
  const raw = crypto.randomUUID().replace(/-/g, '')
  return `${prefix}_${raw.slice(0, 12)}`
}
