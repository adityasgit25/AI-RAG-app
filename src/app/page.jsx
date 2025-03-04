'use client';

import { useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Loader, Send } from 'lucide-react';

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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-900 to-black opacity-75"></div>
      <div className="absolute inset-0 bg-stars bg-cover bg-center"></div>
      <motion.div
        className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md relative z-10"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold mb-6 text-center text-white">CampusCandid AI Knowledge Graph</h1>
        <p className="text-gray-300 mb-6 text-center">
          Ask questions about colleges, placements, and culture, powered by AI and a structured knowledge graph.
        </p>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask about a college..."
          className="border border-gray-700 bg-gray-700 text-white p-3 rounded mb-4 w-full"
        />
        <motion.button
          onClick={handleQuery}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-full flex items-center justify-center"
          disabled={loading}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {loading ? (
            <Loader className="animate-spin mr-2" />
          ) : (
            <Send className="mr-2" />
          )}
          {loading ? 'Loading...' : 'Ask'}
        </motion.button>
        {response && (
          <motion.div
            className="mt-6 p-4 bg-gray-700 border border-gray-600 rounded shadow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <p className="font-semibold text-white">Response:</p>
            <p className="text-gray-300">{response}</p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}