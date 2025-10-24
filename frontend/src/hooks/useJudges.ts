import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:8000';

interface Judge {
  id: string;
  name: string;
  system_prompt: string;
  model: string;
  active: boolean;
  provider: string;
}

export const useJudges = () => {
  const [judges, setJudges] = useState<Judge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchJudges();
  }, []);

  const fetchJudges = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/judges`);
      setJudges(response.data);
    } catch (err: any) {
      setError('Failed to fetch judges');
    } finally {
      setLoading(false);
    }
  };

  const createJudge = async (judge: Omit<Judge, 'id'>) => {
    try {
      await axios.post(`${API_BASE}/judges`, judge);
      fetchJudges();
    } catch (err: any) {
      setError('Failed to create judge');
    }
  };

  const updateJudge = async (id: string, judge: Omit<Judge, 'id'>) => {
    try {
      await axios.put(`${API_BASE}/judges/${id}`, judge);
      fetchJudges();
    } catch (err: any) {
      setError('Failed to update judge');
    }
  };

  const deleteJudge = async (id: string) => {
    try {
      await axios.delete(`${API_BASE}/judges/${id}`);
      fetchJudges();
    } catch (err: any) {
      setError('Failed to delete judge');
    }
  };

  return {
    judges,
    loading,
    error,
    fetchJudges,
    createJudge,
    updateJudge,
    deleteJudge,
  };
};
