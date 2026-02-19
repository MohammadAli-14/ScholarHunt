// Constants for profile form dropdowns and validation

export const DEGREE_TYPES = [
  "High School Diploma",
  "Associate's Degree",
  "Bachelor's Degree",
  "Master's Degree",
  "PhD/Doctorate",
  "Postdoctoral",
  "Professional Degree (MD, JD, etc.)",
  "Other"
]

export const FIELDS_OF_STUDY = [
  "Computer Science",
  "Engineering",
  "Business Administration",
  "Medicine",
  "Law",
  "Natural Sciences",
  "Social Sciences",
  "Humanities",
  "Arts",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Economics",
  "Psychology",
  "Education",
  "Architecture",
  "Other"
]

export const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Netherlands",
  "Sweden",
  "Switzerland",
  "Japan",
  "Singapore",
  "China",
  "India",
  "Other"
]

export const YEARS = Array.from({ length: 10 }, (_, i) => (new Date().getFullYear() + i).toString())

export const GPA_MAX = 4.0

// Step definitions for the wizard
export const STEPS = [
  { id: 1, title: 'Personal Info', fields: ['firstName', 'lastName', 'email', 'phone'] },
  { id: 2, title: 'Education', fields: ['degree', 'university', 'fieldOfStudy', 'gpa', 'graduationYear'] },
  { id: 3, title: 'Experience', fields: ['experience', 'skills'] },
  { id: 4, title: 'Preferences', fields: ['preferredCountries', 'fundingType'] },
  { id: 5, title: 'Review', fields: [] }
]

// Validation messages
export const VALIDATION_MESSAGES = {
  required: (field) => `${field} is required`,
  email: 'Please enter a valid email address',
  phone: 'Please enter a valid phone number',
  gpa: `GPA must be between 0 and ${GPA_MAX}`,
  year: 'Please select a valid graduation year'
}
