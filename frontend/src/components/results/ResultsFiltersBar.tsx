import { Button } from '../ui/Button';
import { FilterBar } from '../ui/FilterBar';
import type { Judge, ResultsFilters } from '../../types';
import type { Dispatch, SetStateAction } from 'react';
import { getVerdictLabel, VERDICT_FILTERS } from '../../utils/resultsFilters';

interface ResultsFiltersBarProps {
    filters: ResultsFilters;
    judges: Judge[];
    questions: string[];
    setFilters: Dispatch<SetStateAction<ResultsFilters>>;
    onClear: () => void;
}

const toggleValue = (value: string, list: string[]) => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);

export function ResultsFiltersBar({ filters, judges, questions, setFilters, onClear }: ResultsFiltersBarProps) {
    return (
        <FilterBar
            title="Filters"
            actions={
                <Button variant="pill" size="sm" onClick={onClear}>
                    Clear filters
                </Button>
            }
        >
            <div className="flex flex-wrap items-center gap-2 text-xs">
                {judges.map((judge) => {
                    const active = filters.judge_ids.includes(judge.id);
                    return (
                        <Button
                            key={judge.id}
                            variant={active ? 'primary' : 'pill'}
                            size="sm"
                            onClick={() =>
                                setFilters((prev) => ({
                                    ...prev,
                                    page: 1,
                                    judge_ids: toggleValue(judge.id, prev.judge_ids),
                                }))
                            }
                        >
                            {judge.name}
                        </Button>
                    );
                })}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
                {questions.map((questionId) => {
                    const active = filters.question_ids.includes(questionId);
                    return (
                        <Button
                            key={questionId}
                            variant={active ? 'primary' : 'pill'}
                            size="sm"
                            onClick={() =>
                                setFilters((prev) => ({
                                    ...prev,
                                    page: 1,
                                    question_ids: toggleValue(questionId, prev.question_ids),
                                }))
                            }
                        >
                            {questionId}
                        </Button>
                    );
                })}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
                {VERDICT_FILTERS.map((verdictOption) => (
                    <Button
                        key={verdictOption || 'all'}
                        variant={filters.verdict === verdictOption ? 'primary' : 'pill'}
                        size="sm"
                        onClick={() =>
                            setFilters((prev) => ({
                                ...prev,
                                page: 1,
                                verdict: verdictOption,
                            }))
                        }
                    >
                        {getVerdictLabel(verdictOption)}
                    </Button>
                ))}
            </div>
        </FilterBar>
    );
}
