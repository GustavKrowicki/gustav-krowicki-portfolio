import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const blockedIp = process.env.BLOCKED_IP;
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip');

  return NextResponse.json({
    isBlocked: clientIp === blockedIp
  });
}
