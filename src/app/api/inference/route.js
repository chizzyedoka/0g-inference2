import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { endpoint, headers, body } = await request.json();

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Proxy request failed' }, { status: 500 });
  }
}