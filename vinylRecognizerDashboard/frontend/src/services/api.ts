import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getVinyls = async () => {
  const response = await api.get('/vinyls');
  return response.data;
};

export const getDeletedVinyls = async () => {
  const response = await api.get('/vinyls/deleted');
  return response.data;
};

export const getVinylById = async (id: number) => {
  const response = await api.get(`/vinyls/${id}`);
  return response.data;
};

export const addVinyl = async (vinylData: any) => {
  const response = await api.post('/vinyls', vinylData);
  return response.data;
};

export const updateVinyl = async (id: number, vinylData: any) => {
  const response = await api.put(`/vinyls/${id}`, vinylData);
  return response.data;
};

export const deleteVinyl = async (id: number) => {
  const response = await api.delete(`/vinyls/${id}`);
  return response.data;
};

export const restoreVinyl = async (id: number) => {
  const response = await api.post(`/vinyls/${id}/restore`);
  return response.data;
};

export const permanentDeleteVinyl = async (id: number) => {
  const response = await api.delete(`/vinyls/${id}/permanent`);
  return response.data;
};

export default api;