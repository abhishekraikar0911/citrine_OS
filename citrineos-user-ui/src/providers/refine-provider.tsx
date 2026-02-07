"use client";

import { Refine } from "@refinedev/core";
import dataProvider from "@refinedev/hasura";
import routerProvider from "@refinedev/nextjs-router";
import { client } from "@/lib/gql-client";

export const RefineProvider = ({ children }: { children: React.ReactNode }) => {
    return (
        <Refine
            dataProvider={dataProvider(client)}
            routerProvider={routerProvider}
            options={{
                syncWithLocation: true,
                warnWhenUnsavedChanges: true,
            }}
        >
            {children}
        </Refine>
    );
};
