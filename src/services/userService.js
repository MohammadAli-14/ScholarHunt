import apiClient from './apiClient'

export const userService = {
  async updateProfile(profileData) {
    try {
      const response = await apiClient.put('/users/profile', profileData)
      return response.data
    } catch (error) {
      console.error('Update profile error:', error)
      return profileData
    }
  },

  async uploadResume(file) {
    try {
      // Convert file to base64
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      
      const response = await apiClient.post('/users/upload-resume', {
        resumeData: base64Data
      })
      return response.data
    } catch (error) {
      console.error('Error uploading resume:', error)
      throw error
    }
  },

  async getProfile() {
    try {
      const response = await apiClient.get('/users/profile')
      return response.data
    } catch (error) {
      console.error('Get profile error:', error)
      const saved = localStorage.getItem('profile')
      return saved ? JSON.parse(saved) : null
    }
  },
}
