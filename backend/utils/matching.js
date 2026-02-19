// Simple Jaccard similarity implementation to avoid extra dependencies

function calculateJaccardSimilarity(arr1, arr2) {
  const set1 = new Set(arr1.map(x => x.toLowerCase()));
  const set2 = new Set(arr2.map(x => x.toLowerCase()));
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return intersection.size / union.size;
}

function calculateMatchScore(userProfile, scholarship) {
  let score = 0;
  let breakdown = {};

  // 1. Education Level (40%) - Exact Match
  // User profile might have "Bachelor's", scholarship might have ["Bachelor's", "Master's"]
  // Or scholarship requirements might be a string
  const userLevel = userProfile.educationLevel || '';
  const scholarshipReqs = Array.isArray(scholarship.requirements) 
    ? scholarship.requirements.join(' ').toLowerCase() 
    : (scholarship.requirements || '').toLowerCase();
  
  let eduMatch = 0;
  if (scholarshipReqs.includes(userLevel.toLowerCase())) {
    eduMatch = 1;
  } else if (userLevel === "Bachelor's" && scholarshipReqs.includes("undergraduate")) {
    eduMatch = 1;
  } else if (userLevel === "Master's" && scholarshipReqs.includes("graduate")) {
    eduMatch = 1;
  } else if (userLevel === "PhD" && scholarshipReqs.includes("doctoral")) {
    eduMatch = 1;
  }

  score += eduMatch * 40;
  breakdown.education = eduMatch * 40;

  // 2. Country Eligibility (30%)
  // User country vs Scholarship country
  const userCountry = userProfile.country || '';
  const scholarshipCountry = scholarship.country || 'International';
  
  let countryMatch = 0;
  if (scholarshipCountry === 'International' || scholarshipCountry.toLowerCase() === 'various') {
    countryMatch = 1;
  } else if (scholarshipCountry.toLowerCase() === userCountry.toLowerCase()) {
    countryMatch = 1; // Assuming scholarship country is where the student goes?
    // Wait, usually scholarships are for specific countries (destination) or specific citizens (origin).
    // The scraper extracts "Country" which seems to be destination.
    // If the scholarship is for international students, then any country matches.
    // If the scholarship is specific to a country (e.g. "Scholarship for Nigerians"), that's eligibility.
    // But our scraper extracts destination country mostly.
    // Let's assume if it says "International", it's open to all.
    // If it says "USA", it's for studying in USA, usually open to international students.
    // So if user wants to study in USA, it's a match.
    // But the user profile has "Country of Citizenship".
    // This logic is tricky without explicit "Eligible Countries" field.
    // Let's assume "International" means open to all.
    // And let's assume the user has a "Preferred Destination" field?
    // If not, we can only check if the scholarship is open to the user's citizenship.
    // Since we don't extract "Eligible Countries" reliably, we'll assume most are international.
    // But we can check if the description mentions the user's country.
    
    if (scholarship.description.toLowerCase().includes(userCountry.toLowerCase())) {
      countryMatch = 1;
    } else {
      // Default to 0.5 if international
      if (scholarshipCountry === 'International' || scholarshipCountry === 'Various') {
        countryMatch = 1;
      } else {
        // If scholarship is in USA, it's likely open to international.
        countryMatch = 0.8; 
      }
    }
  }

  score += countryMatch * 30;
  breakdown.country = countryMatch * 30;

  // 3. Field of Study (20%)
  const userFields = userProfile.fieldOfStudy || [];
  const scholarshipFields = Array.isArray(scholarship.fieldOfStudy) ? scholarship.fieldOfStudy : [scholarship.fieldOfStudy];
  
  // Calculate overlap
  const fieldSimilarity = calculateJaccardSimilarity(userFields, scholarshipFields);
  score += fieldSimilarity * 20;
  breakdown.field = fieldSimilarity * 20;

  // 4. Additional (10%) - Deadline & Funding
  let additionalScore = 0;
  
  // Deadline
  if (scholarship.deadline) {
    const daysToDeadline = (new Date(scholarship.deadline) - new Date()) / (1000 * 60 * 60 * 24);
    if (daysToDeadline > 30) additionalScore += 5; // Good buffer
    else if (daysToDeadline > 7) additionalScore += 3; // Tight
    else if (daysToDeadline > 0) additionalScore += 1; // Urgent
  }

  // Funding
  if (scholarship.fundingType === 'Full Scholarship') additionalScore += 5;
  else if (scholarship.fundingType === 'Partial Scholarship') additionalScore += 2;

  score += additionalScore; // Max 10
  breakdown.additional = additionalScore;

  return {
    totalScore: Math.round(score),
    breakdown
  };
}

export { calculateMatchScore };
