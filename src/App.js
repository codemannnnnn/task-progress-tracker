import React, { useState, useMemo, useEffect } from 'react';
import { Upload, RefreshCw, Trash2, AlertCircle, Search, ArrowUpDown, Database } from 'lucide-react';

const TaskProgressTracker = () => {
  const [baselineData, setBaselineData] = useState([]);
  const [currentData, setCurrentData] = useState([]);
  const [pasteText, setPasteText] = useState('');
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [headers, setHeaders] = useState([]);
  const [uniqueStatuses, setUniqueStatuses] = useState([]);

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      const savedBaseline = localStorage.getItem('taskTracker_baseline');
      const savedCurrent = localStorage.getItem('taskTracker_current');
      const savedHeaders = localStorage.getItem('taskTracker_headers');
      
      if (savedBaseline) {
        setBaselineData(JSON.parse(savedBaseline));
      }
      if (savedCurrent) {
        setCurrentData(JSON.parse(savedCurrent));
      }
      if (savedHeaders) {
        setHeaders(JSON.parse(savedHeaders));
      }
    } catch (err) {
      console.error('Error loading saved data:', err);
    }
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    try {
      if (baselineData.length > 0) {
        localStorage.setItem('taskTracker_baseline', JSON.stringify(baselineData));
      }
      if (currentData.length > 0) {
        localStorage.setItem('taskTracker_current', JSON.stringify(currentData));
      }
      if (headers.length > 0) {
        localStorage.setItem('taskTracker_headers', JSON.stringify(headers));
      }
    } catch (err) {
      console.error('Error saving data:', err);
    }
  }, [baselineData, currentData, headers]);

  const parseTabDelimitedData = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('Data must include headers and at least one row');
    }

    const headers = lines[0].split('\t').map(h => h.trim());
    setHeaders(headers);
    
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
    setSearchTerm('');
    setSortConfig({ key: null, direction: 'asc' });
  };

  const handleClearStorage = () => {
    if (window.confirm('Are you sure you want to clear all saved data? This cannot be undone.')) {
      localStorage.removeItem('taskTracker_baseline');
      localStorage.removeItem('taskTracker_current');
      localStorage.removeItem('taskTracker_headers');
      handleReset();
    }
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const progressData = useMemo(() => {
    if (baselineData.length === 0 || headers.length === 0) return [];

    // Find the ID column (prioritize TaskID, then first column)
    const idColumn = headers.find(h => h.toLowerCase().includes('id')) || headers[0];
    // Find the Status column
    const statusColumn = headers.find(h => h.toLowerCase().includes('status')) || 'Status';

    // Collect unique statuses
    const statuses = new Set();
    currentData.forEach(item => {
      if (item[statusColumn]) {
        statuses.add(item[statusColumn]);
      }
    });
    baselineData.forEach(item => {
      if (item[statusColumn]) {
        statuses.add(item[statusColumn]);
      }
    });
    setUniqueStatuses(Array.from(statuses));

    return currentData.map(current => {
      const baseline = baselineData.find(b => b[idColumn] === current[idColumn]);
      
      if (!baseline) {
        return { ...current, isNew: true, statusChanged: false };
      }

      const statusChanged = baseline[statusColumn] !== current[statusColumn];
      
      return {
        ...current,
        isNew: false,
        statusChanged,
        oldStatus: baseline[statusColumn],
        statusChange: statusChanged ? `${baseline[statusColumn]} → ${current[statusColumn]}` : null
      };
    });
  }, [baselineData, currentData, headers]);

  const filteredAndSortedData = useMemo(() => {
    let filtered = progressData;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(task => 
        Object.values(task).some(value => 
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply sorting
    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = String(a[sortConfig.key] || '');
        const bVal = String(b[sortConfig.key] || '');
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [progressData, searchTerm, sortConfig]);

  const changedCount = progressData.filter(item => item.statusChanged).length;
  const newCount = progressData.filter(item => item.isNew).length;

  const SortableHeader = ({ label, sortKey }) => (
    <th 
      className="text-left p-3 font-medium text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
      onClick={() => handleSort(sortKey)}
    >
      <div className="flex items-center gap-2">
        {label}
        <ArrowUpDown className={`w-4 h-4 ${sortConfig.key === sortKey ? 'text-blue-600' : 'text-gray-400'}`} />
      </div>
    </th>
  );

  // Generate consistent color for each status
  const getStatusColor = (status) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    
    const statusLower = status.toLowerCase();
    
    // Common status patterns
    if (statusLower.includes('complete') || statusLower.includes('done') || statusLower.includes('closed')) {
      return 'bg-green-100 text-green-800';
    }
    if (statusLower.includes('progress') || statusLower.includes('development') || statusLower.includes('active')) {
      return 'bg-blue-100 text-blue-800';
    }
    if (statusLower.includes('qa') || statusLower.includes('test') || statusLower.includes('review')) {
      return 'bg-purple-100 text-purple-800';
    }
    if (statusLower.includes('blocked') || statusLower.includes('issue') || statusLower.includes('problem')) {
      return 'bg-red-100 text-red-800';
    }
    if (statusLower.includes('pending') || statusLower.includes('waiting') || statusLower.includes('hold')) {
      return 'bg-yellow-100 text-yellow-800';
    }
    if (statusLower.includes('new') || statusLower.includes('open')) {
      return 'bg-cyan-100 text-cyan-800';
    }
    
    // Generate color based on status string hash for consistency
    const hash = status.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      'bg-indigo-100 text-indigo-800',
      'bg-pink-100 text-pink-800',
      'bg-orange-100 text-orange-800',
      'bg-teal-100 text-teal-800',
      'bg-lime-100 text-lime-800',
    ];
    return colors[hash % colors.length];
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Task Progress Tracker</h1>
            {baselineData.length > 0 && (
              <button
                onClick={handleClearStorage}
                className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
              >
                <Database className="w-4 h-4" />
                Clear Saved Data
              </button>
            )}
          </div>
          
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

          <div className="flex gap-3 flex-wrap">
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
                  Reset Session
                </button>
              </>
            )}
          </div>

          {baselineData.length > 0 && (
            <div className="mt-3 text-xs text-gray-500 flex items-center gap-2">
              <Database className="w-4 h-4" />
              Data is automatically saved and will persist after page refresh
            </div>
          )}
        </div>

        {baselineData.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="mb-4 flex items-center justify-between flex-wrap gap-4">
              <h2 className="text-xl font-semibold text-gray-900">Task Status</h2>
              <div className="flex gap-4 text-sm">
                <span className="text-gray-600">Total: {progressData.length}</span>
                <span className="text-gray-600">Showing: {filteredAndSortedData.length}</span>
                {changedCount > 0 && (
                  <span className="text-amber-600 font-medium">Changed: {changedCount}</span>
                )}
                {newCount > 0 && (
                  <span className="text-blue-600 font-medium">New: {newCount}</span>
                )}
              </div>
            </div>

            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search tasks..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {headers.map((header) => (
                      <SortableHeader key={header} label={header} sortKey={header} />
                    ))}
                    <th className="text-left p-3 font-medium text-gray-700">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedData.map((task, idx) => (
                    <tr 
                      key={task[headers[0]] || idx}
                      className={`border-b border-gray-100 ${
                        task.statusChanged ? 'bg-amber-50' : 
                        task.isNew ? 'bg-blue-50' : ''
                      }`}
                    >
                      {headers.map((header) => (
                        <td key={header} className="p-3 text-gray-900">
                          {header === 'Status' || header.toLowerCase().includes('status') ? (
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusColor(task[header])}`}>
                              {task[header]}
                            </span>
                          ) : header.toLowerCase().includes('date') ? (
                            task[header]?.split(' ')[0]
                          ) : (
                            task[header]
                          )}
                        </td>
                      ))}
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

            {filteredAndSortedData.length === 0 && searchTerm && (
              <div className="text-center py-8 text-gray-500">
                No tasks found matching "{searchTerm}"
              </div>
            )}
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
