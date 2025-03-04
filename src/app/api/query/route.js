import { NextResponse } from 'next/server';
import axios from 'axios';
import driver from '../../lib/neo4j';
import { WordTokenizer } from 'natural';

// In-memory session store
const sessionContexts = new Map();

export async function POST(req) {
  const { query, sessionId = 'default' } = await req.json(); // sessionId to track context
  const session = driver.session();

  try {
    console.log('Received query:', query, 'Session ID:', sessionId);
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Invalid query provided' }, { status: 400 });
    }

    // Load previous context from in-memory store
    let context = sessionContexts.get(sessionId) || { previousColleges: [], previousIntents: [] };
    console.log('Loaded context:', context);

    const lowercaseQuery = query.toLowerCase();

    // Tokenization
    const tokenizer = new WordTokenizer();
    const tokens = tokenizer.tokenize(lowercaseQuery);
    console.log('Tokenized query:', tokens);

    // Define college aliases
    const collegeNameMap = {
      'bms institute of technology': 'BMS Institute of Technology',
      'bmsit': 'BMS Institute of Technology',
      'bms': 'BMS Institute of Technology',
      'b.m.s. institute': 'BMS Institute of Technology',
      'rv college of engineering': 'RV College of Engineering',
      'rvce': 'RV College of Engineering',
      'rv': 'RV College of Engineering',
      'r.v. college': 'RV College of Engineering',
      'pes university': 'PES University',
      'pes': 'PES University',
      'pesu': 'PES University'
    };

    // Intent keywords
    const intentKeywords = {
      placement: ['placement', 'placements', 'job', 'jobs', 'stats', 'career'],
      course: ['course', 'courses', 'program', 'programs', 'degree', 'study'],
      faculty: ['faculty', 'teacher', 'teachers', 'professor', 'professors', 'staff'],
      infrastructure: ['infrastructure', 'facility', 'facilities', 'hostel', 'library', 'campus'],
      event: ['event', 'events', 'festival', 'fest', 'fests', 'activity'],
      compare: ['compare', 'comparison', 'vs', 'versus', 'against']
    };

    // Extract colleges and intents
    let targetColleges = [];
    let intents = [];

    tokens.forEach(token => {
      for (const [alias, fullName] of Object.entries(collegeNameMap)) {
        if (alias.split(' ').some(part => token === part.toLowerCase()) && !targetColleges.includes(fullName)) {
          targetColleges.push(fullName);
        }
      }
      for (const [intent, keywords] of Object.entries(intentKeywords)) {
        if (keywords.includes(token) && !intents.includes(intent)) {
          intents.push(intent);
        }
      }
    });

    // Apply context if no colleges or intents are found
    if (targetColleges.length === 0 && context.previousColleges.length > 0) {
      targetColleges = context.previousColleges;
      console.log('Using previous colleges from context:', targetColleges);
    }
    if (intents.length === 0 && context.previousIntents.length > 0) {
      intents = context.previousIntents;
      console.log('Using previous intents from context:', intents);
    }
    if (intents.length === 0 && targetColleges.length > 0) {
      intents.push('placement');
      console.log('No intents detected, defaulting to "placement"');
    }

    // Gemini fallback for complex parsing
    if (intents.length === 0 || intents.includes('compare') || intents.length > 1) {
      const geminiPayload = {
        contents: [{
          parts: [{
            text: `Parse this query and identify the intent and entities with context from previous query (colleges: ${context.previousColleges}, intents: ${context.previousIntents}): "${query}"`
          }]
        }]
      };
      const geminiResponse = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        geminiPayload
      );
      const geminiText = geminiResponse.data.candidates[0].content.parts[0].text;
      console.log('Gemini parsed:', geminiText);

      const geminiIntents = geminiText.match(/intent: (\w+)/g)?.map(i => i.split(': ')[1]) || intents;
      const geminiColleges = geminiText.match(/college: ([\w\s]+)/g)?.map(c => c.split(': ')[1].trim()) || targetColleges;
      intents.push(...geminiIntents.filter(i => !intents.includes(i)));
      targetColleges.push(...geminiColleges.map(c => collegeNameMap[c.toLowerCase()] || c).filter(c => !targetColleges.includes(c)));
    }

    console.log('Parsed - Colleges:', targetColleges, 'Intents:', intents);

    if (targetColleges.length === 0) {
      return NextResponse.json({ error: 'No college recognized in query or context' }, { status: 400 });
    }

    // Map intents to relationship types
    const intentToRelationship = {
      placement: 'HAS_PLACEMENT',
      course: 'OFFERS_COURSE',
      faculty: 'HAS_FACULTY',
      infrastructure: 'HAS_INFRASTRUCTURE',
      event: 'HOSTS_EVENT'
    };

    // Query Neo4j
    const results = [];
    for (const college of targetColleges) {
      const collegeResults = { college, data: [] };
      const intentsToQuery = intents.includes('compare') ? intents.filter(i => i !== 'compare') : intents;

      for (const intent of intentsToQuery) {
        const relationshipType = intentToRelationship[intent];
        if (!relationshipType) continue;

        const cypherQuery = `
          MATCH (c:College)-[r:${relationshipType}]->(info)
          WHERE toLower(c.name) = toLower($collegeName)
          RETURN c, r, info
        `;
        const params = { collegeName: college };

        console.log('Running Neo4j query:', cypherQuery, 'Params:', params);
        const result = await session.run(cypherQuery, params);
        console.log('Query result:', result.records.map(r => ({ college: r.get('c').properties, info: r.get('info').properties })));

        const knowledge = result.records.map(record => ({
          college: record.get('c').properties,
          relation: record.get('r').type,
          info: record.get('info').properties
        }));

        collegeResults.data.push({ intent, knowledge });
      }
      results.push(collegeResults);
    }

    // Format response
    let formattedResponse = '';
    if (intents.includes('compare') && targetColleges.length > 1) {
      formattedResponse = results.map(r => {
        const intentData = r.data.map(d => {
          const info = d.knowledge[0]?.info || {};
          return `${d.intent.charAt(0).toUpperCase() + d.intent.slice(1)}: ${Object.entries(info).map(([k, v]) => `${k}: ${v}`).join(', ')}`;
        }).join('\n');
        return `${r.college}:\n${intentData}`;
      }).join('\n\n');
    } else {
      formattedResponse = results.map(r => {
        const intentData = r.data.map(d => {
          if (d.knowledge.length === 0) return `${d.intent}: No data found`;
          const info = d.knowledge[0].info;
          if (d.intent === 'placement') {
            return `Placement stats for ${r.college}: Rate: ${info.rate}, Average Package: ${info.avgPackage}`;
          }
          return `${d.intent.charAt(0).toUpperCase() + d.intent.slice(1)}: ${Object.entries(info).map(([k, v]) => `${k}: ${v}`).join(', ')}`;
        }).join('\n');
        return `${r.college}:\n${intentData}`;
      }).join('\n\n');
    }

    console.log('Formatted response:', formattedResponse);

    // Update context
    context.previousColleges = targetColleges;
    context.previousIntents = intents;
    sessionContexts.set(sessionId, context);
    console.log('Updated context:', context);

    const payload = {
      contents: [{
        parts: [{
          text: `Based on this structured knowledge about colleges: \n\n${JSON.stringify(formattedResponse)}\n\nAnswer: ${query}`
        }]
      }]
    };

    const geminiResponse = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      payload
    );

    return NextResponse.json({ response: geminiResponse.data.candidates[0].content.parts[0].text });
  } catch (error) {
    console.error('Error querying Neo4j or Gemini:', error.message, error.stack);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await session.close();
  }
}