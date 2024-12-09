export async function authenticatedFetch(url, options = {}) {
    const token = localStorage.getItem('token');
    console.log('Token sendo enviado:', token);

    if (!token) {
        console.log('Token não encontrado no localStorage');
        throw new Error('Usuário não autenticado');
    }

    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };
    console.log('Headers da requisição:', headers);

    const response = await fetch(url, { ...options, headers });
    console.log('Status da resposta:', response.status);

    if (response.status === 401) {
        console.log('Resposta 401 recebida');
        const responseText = await response.text();
        console.log('Detalhes da resposta 401:', responseText);
        throw new Error('Não autorizado');
    }

    return response;
}

export async function publicFetch(url, options = {}) {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro desconhecido');
        }
        return response.json();
    } catch (error) {
        console.error('Erro na requisição:', error);
        throw error;
    }
}