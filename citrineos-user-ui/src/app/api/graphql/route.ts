import { NextRequest, NextResponse } from 'next/server';
import { GraphQLClient } from 'graphql-request';

// Use localhost since Next.js runs on the host, not in Docker
const HASURA_URL = 'http://localhost:8090/v1/graphql';

const client = new GraphQLClient(HASURA_URL, {
    headers: {
        'x-hasura-admin-secret': process.env.NEXT_PUBLIC_HASURA_ADMIN_SECRET || 'CitrineOS!',
    },
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { query, variables } = body;

        const result: any = await client.request(query, variables);

        // Wrap in data property to match standard GraphQL response structure expected by client
        return NextResponse.json({ data: result }, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Hasura-Admin-Secret',
            },
        });
    } catch (error: any) {
        console.error('GraphQL API Error:', error);
        return NextResponse.json(
            { error: error.message || 'GraphQL request failed' },
            { status: 500 }
        );
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Hasura-Admin-Secret',
        },
    });
}
