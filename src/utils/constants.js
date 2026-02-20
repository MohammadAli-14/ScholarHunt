export const COUNTRIES = [
  'USA',
  'Canada',
  'UK',
  'Australia',
  'Germany',
  'Netherlands',
  'France',
  'Sweden',
  'Switzerland',
  'Japan',
  'Singapore',
  'New Zealand',
  'Ireland',
  'Denmark',
  'Norway',
  'Finland',
  'Austria',
  'Belgium',
  'Italy',
  'Spain',
  'India',
  'Nigeria',
  'Pakistan',
  'China',
]

export const FIELDS_OF_STUDY = [
  'Computer Science',
  'Engineering',
  'Data Science',
  'Artificial Intelligence',
  'Cybersecurity',
  'Cloud Computing',
  'Machine Learning',
  'Software Engineering',
  'Information Systems',
  'Information Technology',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Chemical Engineering',
  'Biomedical Engineering',
  'Environmental Engineering',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
]

export const ENGLISH_LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'native', label: 'Native' },
]

export const APPLICATION_STATUS = [
  { value: 'saved', label: 'Saved', color: 'default' },
  { value: 'applied', label: 'Applied', color: 'warning' },
  { value: 'interview', label: 'Interview', color: 'info' },
  { value: 'accepted', label: 'Accepted', color: 'success' },
  { value: 'rejected', label: 'Rejected', color: 'destructive' },
]

export const SORT_OPTIONS = [
  { value: 'deadline', label: 'Deadline' },
  { value: 'matchScore', label: 'Match Score' },
  { value: 'recent', label: 'Most Recent' },
  { value: 'funding', label: 'Funding Amount' },
]

export const DEADLINE_FILTERS = [
  { value: 'upcoming', label: 'Upcoming (30 days)' },
  { value: '60days', label: 'Next 60 days' },
  { value: '90days', label: 'Next 90 days' },
  { value: 'all', label: 'All' },
]

export const FUNDING_TYPES = [
  { value: 'full', label: 'Full Scholarship' },
  { value: 'partial', label: 'Partial Scholarship' },
  { value: 'all', label: 'All' },
]

export const DEGREE_TYPES = [
  'Bachelor of Science (BSc)',
  'Bachelor of Arts (BA)',
  'Bachelor of Engineering (BEng)',
  'Master of Science (MSc)',
  'Master of Arts (MA)',
  'Master of Engineering (MEng)',
  'Master of Business Administration (MBA)',
  'Doctor of Philosophy (PhD)',
  'Other',
]

export const MATCH_SCORE_FILTERS = [
  { value: 0, label: 'All Matches' },
  { value: 50, label: '50% + Match' },
  { value: 60, label: '60% + Match' },
  { value: 70, label: '70% + Match' },
  { value: 80, label: '80% + Match' },
  { value: 90, label: '90% + Match' },
]

export const MATCH_SCORE_COLORS = {
  high: 'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-amber-100 text-amber-800 border-amber-200',
  low: 'bg-red-100 text-red-800 border-red-200',
}

export const getMatchScoreColor = (score) => {
  if (score >= 70) return 'high'
  if (score >= 50) return 'medium'
  return 'low'
}
