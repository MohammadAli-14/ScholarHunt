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
