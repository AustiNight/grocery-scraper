import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Shopping Lists
export const createShoppingList = async (data) => {
  const response = await api.post('/lists', data);
  return response.data;
};

export const getShoppingLists = async () => {
  const response = await api.get('/lists');
  return response.data;
};

export const getShoppingList = async (id) => {
  const response = await api.get(`/lists/${id}`);
  return response.data;
};

export const updateShoppingList = async (id, data) => {
  const response = await api.put(`/lists/${id}`, data);
  return response.data;
};

export const deleteShoppingList = async (id) => {
  const response = await api.delete(`/lists/${id}`);
  return response.data;
};

// Scraping Jobs
export const startScrapeJob = async (data) => {
  const response = await api.post('/scrape', data);
  return response.data;
};

export const getScrapeJob = async (id) => {
  const response = await api.get(`/scrape/${id}`);
  return response.data;
};

export const getScrapeJobs = async () => {
  const response = await api.get('/scrape');
  return response.data;
};

// Comparison Results
export const getComparisonResult = async (jobId) => {
  const response = await api.get(`/compare/${jobId}`);
  return response.data;
};

export const getAllComparisons = async () => {
  const response = await api.get('/compare');
  return response.data;
};

// Health Check
export const healthCheck = async () => {
  const response = await api.get('/health');
  return response.data;
};

export default api;
