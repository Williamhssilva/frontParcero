function getApiBaseUrl() {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:5000';
    } else if (hostname.includes('github.io')) {
        return 'https://parcero-awz4.onrender.com'; // Substitua pela URL real do seu backend no Glitch
    } else {
        // Para outros ambientes (como o Glitch), use a URL do backend no Glitch
        return 'https://parcero-awz4.onrender.com'; // Substitua pela URL real do seu backend no Glitch
    }
}

export const API_BASE_URL = getApiBaseUrl();