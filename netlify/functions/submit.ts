// netlify/functions/submit.ts
import { neon } from '@neondatabase/serverless';

export const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const data = JSON.parse(event.body);
    const sql = neon(process.env.DATABASE_URL!);

    // Insert the new user, including likert_link
    await sql`
      INSERT INTO whitelist (x_username, wallet, likert_link, comment_link, quote_link, ref_points, status)
      VALUES (${data.username}, ${data.wallet}, ${data.likeRtLink}, ${data.commentLink}, ${data.quoteLink}, 0, 'PENDING')
    `;

    // If there's a referrer, give them a point
    if (data.referrer && data.referrer !== data.username) {
      await sql`
        UPDATE whitelist 
        SET ref_points = ref_points + 1 
        WHERE x_username = ${data.referrer}
      `;
    }

    return { statusCode: 200, body: JSON.stringify({ message: 'Success' }) };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Database Error' }) };
  }
};