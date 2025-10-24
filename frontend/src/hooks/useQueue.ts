import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:8000';

interface Assignment {
  id: string;
  question_id: string;
  judge_id: string;
  queue_id: string;
  judges: { name: string };
}

interface Judge {
  id: string;
  name: string;
}

export const useQueue = (lastQueueId?: string) => {
  const [questions, setQuestions] = useState<string[]>([]);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [selectedJudges, setSelectedJudges] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchJudges();
  }, []);

  useEffect(() => {
    if (lastQueueId && !questions.length) {
      fetchQuestions(lastQueueId);
    }
  }, [lastQueueId]);

  const fetchJudges = async () => {
    try {
      const response = await axios.get(`${API_BASE}/judges`);
      setJudges(response.data);
    } catch (err: any) {
      setError('Failed to fetch judges');
    }
  };

  const fetchQuestions = async (queueId: string) => {
    if (!queueId) return;
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/questions?queue_id=${queueId}`);
      setQuestions(response.data);
      await fetchAssignments(queueId);
    } catch (err: any) {
      setError('Failed to fetch questions');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async (queueId: string) => {
    try {
      const response = await axios.get(`${API_BASE}/assignments?queue_id=${queueId}`);
      const sel: Record<string, string[]> = {};
      response.data.forEach((a: Assignment) => {
        if (!sel[a.question_id]) sel[a.question_id] = [];
        sel[a.question_id].push(a.judge_id);
      });
      setSelectedJudges(sel);
    } catch (err: any) {
      setError('Failed to fetch assignments');
    }
  };

  const fetchJobStatus = async (queueId: string) => {
    try {
      const response = await axios.get(`${API_BASE}/job_status?queue_id=${queueId}`);
      return response.data;
    } catch (err: any) {
      return { counts: { pending: 0, running: 0, done: 0, failed: 0 }, total: 0 };
    }
  };

  const handleAssign = async () => {
    const assigns = [];
    for (const q of questions) {
      for (const j of selectedJudges[q] || []) {
        assigns.push({ question_id: q, judge_id: j, queue_id: lastQueueId });
      }
    }
    try {
      await axios.post(`${API_BASE}/assignments`, assigns);
      await fetchAssignments(lastQueueId!);
    } catch (err: any) {
      setError('Failed to save assignments');
    }
  };

  const toggleJudge = (q: string, j: string) => {
    setSelectedJudges(prev => {
      const curr = prev[q] || [];
      if (curr.includes(j)) {
        return { ...prev, [q]: curr.filter(id => id !== j) };
      } else {
        return { ...prev, [q]: [...curr, j] };
      }
    });
  };

  return {
    questions,
    judges,
    selectedJudges,
    loading,
    error,
    handleAssign,
    toggleJudge,
    fetchJobStatus,
  };
};
