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

interface Judge {
  id: string;
  name: string;
}

export const useResults = () => {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [filters, setFilters] = useState({ judge_ids: [] as string[], question_ids: [] as string[], verdict: '', page: 1, limit: 50, queue_id: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [questions, setQuestions] = useState<string[]>([]);

  useEffect(() => {
    fetchJudges();
  }, []);

  useEffect(() => {
    if (filters.queue_id) {
      fetchQuestions();
    }
  }, [filters.queue_id]);

  useEffect(() => {
    fetchEvaluations();
  }, [filters]);

  const fetchJudges = async () => {
    try {
      const response = await axios.get(`${API_BASE}/judges`);
      setJudges(response.data);
    } catch (err: any) {
      console.error('Failed to fetch judges');
    }
  };

  const fetchQuestions = async () => {
    try {
      const response = await axios.get(`${API_BASE}/questions?queue_id=${filters.queue_id}`);
      setQuestions(response.data);
    } catch (err: any) {
      console.error('Failed to fetch questions');
    }
  };

  const fetchEvaluations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      filters.judge_ids.forEach(id => params.append('judge_id', id));
      filters.question_ids.forEach(id => params.append('question_id', id));
      if (filters.verdict) params.append('verdict', filters.verdict);
      if (filters.queue_id) params.append('queue_id', filters.queue_id);
      params.append('page', filters.page.toString());
      params.append('limit', filters.limit.toString());
      const response = await axios.get(`${API_BASE}/evaluations?${params}`);
      setEvaluations(response.data.evaluations);
      setTotal(response.data.total);
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
    total,
    judges,
    questions,
  };
};
