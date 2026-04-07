function get_token(r) {
    try {
        // Only fetch token if target is GCP (https)
        // For local development (http://...), skip immediately.
        const audience = r.variables.target_service_url;
        if (!audience || !audience.startsWith('https://')) {
            return "";
        }

        // NOTE: Standard njs js_set does not support async operations like ngx.fetch.
        // For GCP deployment, we will use the Authorization header injected by 
        // the Metadata server or a subrequest pattern if needed.
        // For now, we return empty to ensure local dev stability.
        return "";
    } catch (e) {
        return "";
    }
}

export default { get_token };
