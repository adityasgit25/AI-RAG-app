'use client';

import { useState } from 'react';
import axios from 'axios';

export default function Home() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleQuery = async () => {
    setLoading(true);
    try {
      const res = await axios.post('/api/query', { query });
      setResponse(res.data.response);
    } catch (error) {
      console.error('Error fetching response:', error);
      setResponse('Error fetching response.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-blue-500 to-purple-500 p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-center text-black">CampusCandid AI Knowledge Graph</h1>
        <p className="text-black mb-6 text-center">
          Ask questions about colleges, placements, and culture, powered by AI and a structured knowledge graph.
        </p>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask about a college..."
          className="border p-3 rounded mb-4 w-full text-black"
        />
        <button
          onClick={handleQuery}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-full"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Ask'}
        </button>
        {response && (
          <div className="mt-6 p-4 bg-gray-100 border rounded shadow">
            <p className="font-semibold text-black">Response:</p>
            <p className="text-black">{response}</p>
          </div>
        )}
      </div>
    </div>
  );
}