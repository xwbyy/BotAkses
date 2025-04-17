const axios = require('axios');
const dayjs = require('dayjs');

class SheetDB {
  constructor(url, token) {
    this.client = axios.create({
      baseURL: url,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async create(data) {
    try {
      const response = await this.client.post('', data);
      return response.data;
    } catch (error) {
      console.error('SheetDB create error:', error.response?.data || error.message);
      throw error;
    }
  }

  async find(query = {}) {
    try {
      const response = await this.client.get('', { params: { search: JSON.stringify(query) } });
      return response.data;
    } catch (error) {
      console.error('SheetDB find error:', error.response?.data || error.message);
      throw error;
    }
  }

  async update(id, data) {
    try {
      const response = await this.client.patch(`/id/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('SheetDB update error:', error.response?.data || error.message);
      throw error;
    }
  }

  async delete(id) {
    try {
      const response = await this.client.delete(`/id/${id}`);
      return response.data;
    } catch (error) {
      console.error('SheetDB delete error:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = SheetDB;
