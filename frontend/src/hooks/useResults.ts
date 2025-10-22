import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:8000';

interface Evaluation {
  id: string;
  submission_id: string;
  question_id: string;
  judge_id: string;
  verdict: string;
  reasoning: string;
  created_at: string;
  judges?: { name: string };
}

export const useResults = () => {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [filters, setFilters] = useState({ judge_id: '', question_id: '', verdict: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEvaluations();
  }, [filters]);

  const fetchEvaluations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.judge_id) params.append('judge_id', filters.judge_id);
      if (filters.question_id) params.append('question_id', filters.question_id);
      if (filters.verdict) params.append('verdict', filters.verdict);
      const response = await axios.get(`${API_BASE}/evaluations?${params}`);
      setEvaluations(response.data);
    } catch (err: any) {
      setError('Failed to fetch evaluations');
    } finally {
      setLoading(false);
    }
  };

  return {
    evaluations,
    filters,
    setFilters,
    loading,
    error,
  };
};