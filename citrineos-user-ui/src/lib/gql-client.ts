import { GraphQLClient } from "graphql-request";

// Client-side and server-side compatible - uses Next.js API route
// which proxies to Hasura internal URL
export const client = new GraphQLClient("/api/graphql", {
    headers: {
        "x-hasura-admin-secret": process.env.NEXT_PUBLIC_HASURA_ADMIN_SECRET || "CitrineOS!",
    },
});
