// Validation utility for profile form

export const validateRequired = (value) => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return 'This field is required'
  }
  return null
}

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email) return 'Email is required'
  if (!emailRegex.test(email)) return 'Please enter a valid email address'
  return null
}

export const validatePhone = (phone) => {
  if (!phone) return null // Phone is optional
  const phoneRegex = /^[+]?[\d\s-()]{10,20}$/
  if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
    return 'Please enter a valid phone number'
  }
  return null
}

export const validateGPA = (gpa) => {
  if (!gpa && gpa !== 0) return 'GPA is required'
  const numGpa = parseFloat(gpa)
  if (isNaN(numGpa) || numGpa < 0 || numGpa > 4.0) {
    return 'GPA must be between 0 and 4.0'
  }
  return null
}

export const validateYear = (year) => {
  if (!year) return 'Graduation year is required'
  const currentYear = new Date().getFullYear()
  const yearNum = parseInt(year)
  if (yearNum < currentYear - 50 || yearNum > currentYear + 20) {
    return 'Please enter a valid graduation year'
  }
  return null
}

// Step validation functions
export const validateStep = (stepId, data) => {
  const errors = {}
  
  switch (stepId) {
    case 1: // Personal Info
      errors.firstName = validateRequired(data.firstName)
      errors.lastName = validateRequired(data.lastName)
      errors.email = validateEmail(data.email)
      errors.phone = validatePhone(data.phone)
      break
      
    case 2: // Education
      errors.degree = validateRequired(data.degree)
      errors.university = validateRequired(data.university)
      errors.fieldOfStudy = validateRequired(data.fieldOfStudy)
      errors.gpa = validateGPA(data.gpa)
      errors.graduationYear = validateYear(data.graduationYear)
      break
      
    case 3: // Experience
      // Experience and skills are optional
      break
      
    case 4: // Preferences
      // Preferences are optional
      break
      
    case 5: // Review
      // No validation needed for review step
      break
      
    default:
      break
  }
  
  // Remove null errors
  Object.keys(errors).forEach(key => {
    if (errors[key] === null) {
      delete errors[key]
    }
  })
  
  return errors
}

export const hasErrors = (errors) => {
  return Object.keys(errors).length > 0
}
