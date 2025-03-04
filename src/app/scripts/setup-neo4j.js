import driver from '../lib/neo4j.js';

async function setupDatabase() {
  const session = driver.session();

  try {
    await session.run(`
      MATCH (n)
      DETACH DELETE n
      
      CREATE (bms:College {name: "BMS Institute of Technology", city: "Bangalore", established: 2002, rank: 45})
      CREATE (rv:College {name: "RV College of Engineering", city: "Bangalore", established: 1963, rank: 10})
      CREATE (pes:College {name: "PES University", city: "Bangalore", established: 1972, rank: 6})
      
      CREATE (course1:Course {name: "Electronics and Communication Engineering", duration: "4 years"})
      CREATE (course2:Course {name: "Computer Science Engineering", duration: "4 years"})
      CREATE (course3:Course {name: "Mechanical Engineering", duration: "4 years"})
      
      CREATE (placement1:Placement {rate: "85%", avgPackage: "8 LPA"})
      CREATE (placement2:Placement {rate: "90%", avgPackage: "12 LPA"})
      CREATE (placement3:Placement {rate: "92%", avgPackage: "15 LPA"})
      
      CREATE (faculty1:Faculty {count: 200, researchFocus: "AI & ML"})
      CREATE (faculty2:Faculty {count: 300, researchFocus: "Cybersecurity"})
      
      CREATE (infra1:Infrastructure {hostels: "Yes", library: "Large digital library"})
      CREATE (infra2:Infrastructure {hostels: "Yes", library: "24x7 Open Library"})
      
      CREATE (fest1:Event {name: "Utsav", type: "Cultural Festival"})
      CREATE (fest2:Event {name: "TechFest", type: "Technical Festival"})
      
      CREATE (bms)-[:OFFERS_COURSE]->(course1)
      CREATE (bms)-[:OFFERS_COURSE]->(course2)
      CREATE (bms)-[:HAS_PLACEMENT]->(placement1)
      CREATE (bms)-[:HAS_FACULTY]->(faculty1)
      CREATE (bms)-[:HAS_INFRASTRUCTURE]->(infra1)
      CREATE (bms)-[:HOSTS_EVENT]->(fest1)
      
      CREATE (rv)-[:OFFERS_COURSE]->(course2)
      CREATE (rv)-[:OFFERS_COURSE]->(course3)
      CREATE (rv)-[:HAS_PLACEMENT]->(placement2)
      CREATE (rv)-[:HAS_FACULTY]->(faculty2)
      CREATE (rv)-[:HAS_INFRASTRUCTURE]->(infra2)
      CREATE (rv)-[:HOSTS_EVENT]->(fest2)
      
      CREATE (pes)-[:OFFERS_COURSE]->(course1)
      CREATE (pes)-[:HAS_PLACEMENT]->(placement3)
      CREATE (pes)-[:HAS_FACULTY]->(faculty1)
      CREATE (pes)-[:HAS_INFRASTRUCTURE]->(infra1);
    `);

    console.log('Neo4j knowledge graph initialized successfully!');
  } catch (error) {
    console.error('Error setting up Neo4j database:', error);
  } finally {
    await session.close();
    await driver.close();
  }
}

setupDatabase().then(() => console.log('Setup complete, test your API now!'));
