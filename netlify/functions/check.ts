// netlify/functions/check.ts
import { neon } from '@neondatabase/serverless';

export const handler = async (event: any) => {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: 'Method Not Allowed' };

  const query = event.queryStringParameters?.q;
  if (!query) return { statusCode: 400, body: 'Missing query parameter' };

  try {
    const sql = neon(process.env.DATABASE_URL!);

    // Search for either the X username OR the wallet address
    const result = await sql`
      SELECT status, ref_points 
      FROM whitelist 
      WHERE x_username = ${query} OR wallet = ${query}
      LIMIT 1
    `;

    // If a user is found, return their data
    if (result.length > 0) {
      return { 
        statusCode: 200, 
        body: JSON.stringify(result[0]) 
      };
    } else {
      // If no user is found
      return { 
        statusCode: 404, 
        body: JSON.stringify({ error: 'Not found' }) 
      };
    }
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Database Error' }) };
  }
};