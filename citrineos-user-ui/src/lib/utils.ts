export const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        return hostname === 'localhost' ? 'localhost' : hostname;
    }
    return 'localhost';
};

export const HASURA_URL = `http://${getBaseUrl()}:8090/v1/graphql`;
export const CITRINEOS_API_URL = `http://${getBaseUrl()}:8081`;
