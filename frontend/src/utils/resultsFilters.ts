import type { ResultsFilters, Verdict } from '../types';

export const DEFAULT_RESULTS_FILTERS: ResultsFilters = {
    queue_id: undefined,
    judge_ids: [],
    question_ids: [],
    verdict: '',
    page: 1,
    limit: 50,
};

export const VERDICT_FILTERS: Array<'' | Verdict> = ['', 'pass', 'fail', 'inconclusive'];

export const VERDICT_LABELS: Record<'' | Verdict, string> = {
    '': 'All verdicts',
    pass: 'Pass',
    fail: 'Fail',
    inconclusive: 'Inconclusive',
};

export const getVerdictLabel = (verdict: '' | Verdict): string => VERDICT_LABELS[verdict];

export const normalizeFilterValues = (values: string[]): string[] => Array.from(new Set(values)).sort();

export const filtersEqual = (a: ResultsFilters, b: ResultsFilters): boolean =>
    (a.queue_id ?? '') === (b.queue_id ?? '') &&
    a.verdict === b.verdict &&
    a.page === b.page &&
    a.limit === b.limit &&
    normalizeFilterValues(a.judge_ids).join('|') === normalizeFilterValues(b.judge_ids).join('|') &&
    normalizeFilterValues(a.question_ids).join('|') === normalizeFilterValues(b.question_ids).join('|');

export const parseFiltersFromSearch = (params: URLSearchParams): ResultsFilters => {
    const queueParam = params.get('queue_id');
    const judgeIds = normalizeFilterValues(params.getAll('judge_id').filter(Boolean));
    const questionIds = normalizeFilterValues(params.getAll('question_id').filter(Boolean));
    const verdictParam = params.get('verdict') ?? '';
    const pageParam = Number(params.get('page'));
    const limitParam = Number(params.get('limit'));

    return {
        queue_id: queueParam || undefined,
        judge_ids: judgeIds,
        question_ids: questionIds,
        verdict: VERDICT_FILTERS.includes(verdictParam as Verdict) ? (verdictParam as Verdict | '') : '',
        page: Number.isFinite(pageParam) && pageParam > 0 ? pageParam : DEFAULT_RESULTS_FILTERS.page,
        limit: Number.isFinite(limitParam) && limitParam > 0 ? limitParam : DEFAULT_RESULTS_FILTERS.limit,
    };
};

export const buildSearchParams = (filters: ResultsFilters): URLSearchParams => {
    const params = new URLSearchParams();
    if (filters.queue_id) {
        params.set('queue_id', filters.queue_id);
    }
    normalizeFilterValues(filters.judge_ids).forEach((id) => params.append('judge_id', id));
    normalizeFilterValues(filters.question_ids).forEach((id) => params.append('question_id', id));
    if (filters.verdict) {
        params.set('verdict', filters.verdict);
    }
    if (filters.page !== DEFAULT_RESULTS_FILTERS.page) {
        params.set('page', String(filters.page));
    }
    if (filters.limit !== DEFAULT_RESULTS_FILTERS.limit) {
        params.set('limit', String(filters.limit));
    }
    return params;
};
