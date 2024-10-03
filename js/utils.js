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