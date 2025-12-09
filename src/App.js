import React, { useState, useMemo } from 'react';
import { Upload, RefreshCw, Trash2, AlertCircle } from 'lucide-react';

const TaskProgressTracker = () => {
  const [baselineData, setBaselineData] = useState([]);
  const [currentData, setCurrentData] = useState([]);
  const [pasteText, setPasteText] = useState('');
  const [error, setError] = useState('');

  const parseTabDelimitedData = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('Data must include headers and at least one row');
    }

    const headers = lines[0].split('\t').map(h => h.trim());
    const rows = lines.slice(1).map(line => {
      const values = line.split('\t');
      const row = {};
      headers.forEach((header, i) => {
        row[header] = values[i]?.trim() || '';
      });
      return row;
    });

    return rows;
  };

  const handleSetBaseline = () => {
    try {
      setError('');
      const parsed = parseTabDelimitedData(pasteText);
      setBaselineData(parsed);
      setCurrentData(parsed);
      setPasteText('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdate = () => {
    try {
      setError('');
      const parsed = parseTabDelimitedData(pasteText);
      setCurrentData(parsed);
      setPasteText('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReset = () => {
    setBaselineData([]);
    setCurrentData([]);
    setPasteText('');
    setError('');
  };

  const progressData = useMemo(() => {
    if (baselineData.length === 0) return [];

    return currentData.map(current => {
      const baseline = baselineData.find(b => b.TaskID === current.TaskID);
      
      if (!baseline) {
        return { ...current, isNew: true, statusChanged: false };
      }

      const statusChanged = baseline.Status !== current.Status;
      
      return {
        ...current,
        isNew: false,
        statusChanged,
        oldStatus: baseline.Status,
        statusChange: statusChanged ? `${baseline.Status} → ${current.Status}` : null
      };
    });
  }, [baselineData, currentData]);

  const changedCount = progressData.filter(item => item.statusChanged).length;
  const newCount = progressData.filter(item => item.isNew).length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Task Progress Tracker</h1>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Paste your tab-delimited data here:
            </label>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste rows including headers (tab-delimited)..."
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          <div className="flex gap-3">
            {baselineData.length === 0 ? (
              <button
                onClick={handleSetBaseline}
                disabled={!pasteText.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <Upload className="w-4 h-4" />
                Set Morning Baseline
              </button>
            ) : (
              <>
                <button
                  onClick={handleUpdate}
                  disabled={!pasteText.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <RefreshCw className="w-4 h-4" />
                  Update Progress
                </button>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  <Trash2 className="w-4 h-4" />
                  Reset All
                </button>
              </>
            )}
          </div>
        </div>

        {baselineData.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Task Status</h2>
              <div className="flex gap-4 text-sm">
                <span className="text-gray-600">Total: {progressData.length}</span>
                {changedCount > 0 && (
                  <span className="text-amber-600 font-medium">Changed: {changedCount}</span>
                )}
                {newCount > 0 && (
                  <span className="text-blue-600 font-medium">New: {newCount}</span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left p-3 font-medium text-gray-700">Project</th>
                    <th className="text-left p-3 font-medium text-gray-700">Task ID</th>
                    <th className="text-left p-3 font-medium text-gray-700">Subject</th>
                    <th className="text-left p-3 font-medium text-gray-700">Status</th>
                    <th className="text-left p-3 font-medium text-gray-700">Assigned</th>
                    <th className="text-left p-3 font-medium text-gray-700">Due Date</th>
                    <th className="text-left p-3 font-medium text-gray-700">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {progressData.map((task, idx) => (
                    <tr 
                      key={task.TaskID || idx}
                      className={`border-b border-gray-100 ${
                        task.statusChanged ? 'bg-amber-50' : 
                        task.isNew ? 'bg-blue-50' : ''
                      }`}
                    >
                      <td className="p-3 text-gray-900">{task.ProjectName}</td>
                      <td className="p-3 text-gray-600 font-mono">{task.TaskID}</td>
                      <td className="p-3 text-gray-900">{task.Subject}</td>
                      <td className="p-3">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          task.Status === 'Complete' ? 'bg-green-100 text-green-800' :
                          task.Status === 'Development' ? 'bg-blue-100 text-blue-800' :
                          task.Status === 'Development QA' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {task.Status}
                        </span>
                      </td>
                      <td className="p-3 text-gray-700">{task.Assigned}</td>
                      <td className="p-3 text-gray-600">{task['Task Due Date']?.split(' ')[0]}</td>
                      <td className="p-3">
                        {task.isNew && (
                          <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            NEW
                          </span>
                        )}
                        {task.statusChanged && (
                          <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-800">
                            {task.statusChange}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {baselineData.length === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <Upload className="w-12 h-12 text-blue-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Get Started</h3>
            <p className="text-gray-600">
              Paste your morning task data above and click "Set Morning Baseline" to begin tracking progress.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskProgressTracker;