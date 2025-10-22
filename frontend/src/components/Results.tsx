import { useResults } from "../hooks/useResults";

export default function Results() {
  const { evaluations, filters, setFilters, loading, error, total } = useResults();

  const passRate = evaluations.length ? (evaluations.filter(e => e.verdict === 'pass').length / evaluations.length * 100).toFixed(1) : 0;

  const totalPages = Math.ceil(total / filters.limit);

  if (loading) return <p>Loading results...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div className="results-container">
      <h2>Results</h2>
      <div className="filters">
        <select value={filters.verdict} onChange={e => setFilters({ ...filters, verdict: e.target.value, page: 1 })}>
          <option value="">All Verdicts</option>
          <option value="pass">Pass</option>
          <option value="fail">Fail</option>
          <option value="inconclusive">Inconclusive</option>
        </select>
        <input type="number" value={filters.limit} onChange={e => setFilters({ ...filters, limit: parseInt(e.target.value), page: 1 })} min="10" max="100" />
      </div>
      <p>Pass Rate: {passRate}% of {evaluations.length} evaluations (Total: {total})</p>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-600 table-auto">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Submission</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Question</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Judge</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Verdict</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Reasoning</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Created</th>
            </tr>
          </thead>
          <tbody className="bg-white/5 divide-y divide-gray-600">
            {evaluations.map(e => (
              <tr key={e.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-100">{e.submission_id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-100">{e.question_id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-100">{e.judges?.name || e.judge_id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-100">{e.verdict}</td>
                <td className="px-6 py-4 text-sm text-gray-100 break-words max-w-xs">{e.reasoning}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-100">{new Date(e.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pagination">
        <button disabled={filters.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>Prev</button>
        <span>Page {filters.page} of {totalPages}</span>
        <button disabled={filters.page >= totalPages} onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>Next</button>
      </div>
    </div>
  );
}