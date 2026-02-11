import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const blockedIps = process.env.BLOCKED_IPS?.split(',').map(ip => ip.trim()) || [];
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip');

  return NextResponse.json({
    isBlocked: clientIp ? blockedIps.includes(clientIp) : false
  });
}
