import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ error: 'Auth disabled' }, { status: 410 });
}
