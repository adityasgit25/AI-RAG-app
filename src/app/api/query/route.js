import { NextResponse } from 'next/server';
import axios from 'axios';
import driver from '../../lib/neo4j';

export async function POST(req) {
  const { query } = await req.json();
  const session = driver.session();

  try {
    console.log('Received query:', query);

    // Log the query and parameters
    console.log('Running Neo4j query with parameters:', { query });

    // Query Neo4j for structured knowledge
    const result = await session.run(
      // cypher query language
      `MATCH (c:College)-[r]->(info) WHERE toLower(c.name) CONTAINS toLower($query) RETURN c, r, info LIMIT 5`,
      { query: query.toLowerCase() }
    );

    console.log('Hardcoded query result:', result.records.map(r => r.toObject()));

    console.log('Neo4j query result:', result);

    if (result.records.length === 0) {
      console.log('No records found for the given query.');
    }

    const knowledge = result.records.map(record => ({
      college: record.get('c').properties,
      relation: record.get('r').type,
      info: record.get('info').properties
    }));


    console.log('Structured knowledge:', knowledge);

    // Prepare the payload for the Gemini API
    const payload = {
      contents: [
        {
          parts: [
            {
              text: `Based on this structured knowledge about colleges: ${JSON.stringify(knowledge)}, answer: ${query}`
            }
          ]
        }
      ]
    };

    console.log('Payload for Gemini API:', payload);

    // Send structured data to Gemini API
    const geminiResponse = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, payload);

    console.log('Gemini API response:', geminiResponse.data);

    return NextResponse.json({ response: geminiResponse.data });
  } catch (error) {
    console.error('Error querying Neo4j or Gemini:', error.response ? error.response.data : error.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await session.close();
  }
}