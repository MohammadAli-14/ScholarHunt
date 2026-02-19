import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  name: { type: String, required: true, trim: true },
  phone: { type: String, default: '' },
  profileCompleted: { type: Boolean, default: false }
}, { timestamps: true })

const profileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  education: [Object],
  experience: [Object],
  skills: [String],
  targetCountries: [String],
  fieldOfStudy: [String],
  gpa: { type: Number, default: 0 },
  englishLevel: { type: String, default: 'intermediate' }
}, { timestamps: true })

const scholarshipSchema = new mongoose.Schema({
  id: String,
  title: { type: String, required: true },
  university: { type: String, default: '' },
  partnerUniversities: [String],
  country: { type: String, required: true, index: true },
  fieldOfStudy: [{ type: String, index: true }],
  fundingType: { type: String, default: 'Full Scholarship' },
  amount: { type: String, default: '' },
  deadline: { type: Date, index: true },
  applicationFee: { type: Number, default: 0 },
  ieltsRequired: { type: Boolean, default: true },
  minGPA: { type: Number, default: 0 },
  description: { type: String, default: '' },
  benefits: [String],
  requirements: [String],
  applicationLink: { type: String, default: '' },
  imageUrl: { type: String, default: '' }
}, { timestamps: true })

const savedScholarshipSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scholarshipId: { type: String, required: true },
  status: { type: String, enum: ['saved', 'applied', 'interview', 'accepted', 'rejected'], default: 'saved' },
  scholarship: Object
}, { timestamps: true })

const User = mongoose.models.User || mongoose.model('User', userSchema)
const Profile = mongoose.models.Profile || mongoose.model('Profile', profileSchema)
const Scholarship = mongoose.models.Scholarship || mongoose.model('Scholarship', scholarshipSchema)
const SavedScholarship = mongoose.models.SavedScholarship || mongoose.model('SavedScholarship', savedScholarshipSchema)

export { User, Profile, Scholarship, SavedScholarship }
