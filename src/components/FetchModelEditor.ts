import { requestUrl } from 'obsidian';
import { DocscribeSettings } from 'src/main';

// Request response from Ollama REST API URL (editor)
export async function fetchOllamaResponseEditor(settings: DocscribeSettings, prompt: string, model?: string, temperature?: string, maxTokens?: string, signal?: AbortSignal) {
    const ollamaRESTAPIURL = settings.OllamaConnection.RESTAPIURL;

    if (!ollamaRESTAPIURL) {
        return;
    }

    try {
        const response = await requestUrl({
            url: ollamaRESTAPIURL + '/api/generate',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model || settings.general.model,
                system: settings.editor.system_role,
                prompt: prompt,
                stream: false,
                keep_alive: parseInt(settings.OllamaConnection.ollamaParameters.keep_alive),
                options: {
                    temperature: temperature ? parseFloat(temperature) : parseFloat(settings.general.temperature),
                    num_predict: maxTokens ? parseInt(maxTokens) : parseInt(settings.general.max_tokens),
                },
            }),
        });
        const data: { response: string; } = JSON.parse(response.text);
        const message = data.response.trim();

        return message;
    } catch (error) {
        throw Error('Error making API request: ' + error);
    }
}

// Request response from openai-based rest api url (editor)
export async function fetchRESTAPIURLDataEditor(settings: DocscribeSettings, prompt: string, model?: string, temperature?: string, maxTokens?: string, signal?: AbortSignal) {
    try {
        const response = await requestUrl({
            url: settings.RESTAPIURLConnection.RESTAPIURL + '/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.RESTAPIURLConnection.APIKey}`
            },
            body: JSON.stringify({
                model: model || settings.general.model,
                messages: [
                    { role: 'system', content: settings.editor.system_role || 'You are a helpful assistant.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: parseInt(maxTokens || settings.general.max_tokens || '-1'),
                temperature: parseFloat(temperature || settings.general.temperature),
            }),
        });

        if (response.status !== 200) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: { choices: { message: { content: string; }; }[]; } = response.json;
        const message = data.choices[0]?.message.content.trim();
        return message;

    } catch (error) {
        throw Error('Error making API request: '+ error);
    }
}

// Fetch Anthropic API Editor
export async function fetchAnthropicResponseEditor(settings: DocscribeSettings, prompt: string, model?: string, temperature?: string, maxTokens?: string, signal?: AbortSignal) {
    try {
        const response = await requestUrl({
            url: 'https://api.anthropic.com/v1/messages',
            method: 'POST',
            headers: {
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
                'x-api-key': settings.APIConnections.anthropic.APIKey,
            },
            body: JSON.stringify({
                model: model || settings.general.model,
                system: settings.editor.system_role,
                messages: [
                    { role: 'user', content: prompt}
                ],
                max_tokens: parseInt(maxTokens || settings.general.max_tokens) || 4096,
                temperature: parseFloat(temperature || settings.general.temperature),
            }),
        });

        const data: { content: { text: string; }[]; } = response.json;
        const message = data.content[0]?.text.trim();
        return message;

    } catch (error) {
        console.error(error);
    }
}

// Fetch Google Gemini API Editor
export async function fetchGoogleGeminiDataEditor(settings: DocscribeSettings, prompt: string, model?: string, temperature?: string, maxTokens?: string, signal?: AbortSignal) {
    try {
        const response = await requestUrl({
            url: `https://generativelanguage.googleapis.com/v1beta/models/${model || settings.general.model}:generateContent?key=${settings.APIConnections.googleGemini.APIKey}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            { text: settings.editor.system_role + prompt },
                            { text: `\n\n[cache_buster: ${Date.now()}]` }
                        ]
                    }
                ],
                model: model || settings.general.model,
                generationConfig: {
                    temperature: parseFloat(temperature || settings.general.temperature),
                    maxOutputTokens: parseInt(maxTokens || settings.general.max_tokens) || 4096,
                }
            }),
        });

        const data: { candidates: { content: { parts: { text: string; }[]; }; }[]; } = response.json;
        const message = data.candidates[0]?.content.parts[0]?.text.trim();
        return message;
    } catch (error) {
        console.error(error);
    }
}

// Fetch Mistral API Editor
export async function fetchMistralDataEditor(settings: DocscribeSettings, prompt: string, model?: string, temperature?: string, maxTokens?: string, signal?: AbortSignal) {
    try {
        const response = await requestUrl({
            url: 'https://api.mistral.ai/v1/chat/completions',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${settings.APIConnections.mistral.APIKey}`
            },
            body: JSON.stringify({
              model: model || settings.general.model,
              messages: [
                { role: 'system', content: settings.editor.system_role },
                { role: 'user', content: prompt }
              ],
              max_tokens: parseInt(maxTokens || settings.general.max_tokens),
              temperature: parseFloat(temperature || settings.general.temperature),
            }),
        });
        
        const data: { choices: { message: { content: string; }; }[]; } = response.json;
        const message = data.choices[0]?.message.content.trim();
        return message;

    } catch (error) {
        console.error(error);
    }
}

// Fetch OpenAI-Based API Editor
export async function fetchOpenAIBaseAPIResponseEditor(settings: DocscribeSettings, prompt: string, model?: string, temperature?: string, maxTokens?: string, signal?: AbortSignal) {
    const response = await requestUrl({
        url: `${settings.APIConnections.openAI.openAIBaseUrl}/chat/completions`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.APIConnections.openAI.APIKey}`,
        },
        body: JSON.stringify({
          model: model || settings.general.model,
          max_tokens: parseInt(maxTokens || settings.general.max_tokens),
          temperature: parseFloat(temperature || settings.general.temperature),
          stream: false,
          messages: [
            { role: 'system', content: settings.editor.system_role },
            { role: 'user', content: prompt}
        ],
        }),
    });
      
    const data: { choices: { message: { content: string; }; }[]; } = response.json;
    const message = data.choices[0]?.message.content || '';

    return message;
}

// Request response from openai-based rest api url (editor)
export async function fetchOpenRouterEditor(settings: DocscribeSettings, prompt: string, model?: string, temperature?: string, maxTokens?: string, signal?: AbortSignal) {
    try {
        const response = await requestUrl({
            url: 'https://openrouter.ai/api/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.APIConnections.openRouter.APIKey}`
            },
            body: JSON.stringify({
                model: model || settings.general.model,
                messages: [
                    { role: 'system', content: settings.editor.system_role },
                    { role: 'user', content: prompt}
                ],
                max_tokens: parseInt(maxTokens || settings.general.max_tokens),
                temperature: parseFloat(temperature || settings.general.temperature),
            }),
        });
        
        const data: { choices: { message: { content: string; }; }[]; } = response.json;
        const message = data.choices[0]?.message.content.trim();
        return message;

    } catch (error) {
        console.error('Error making API request:', error);
        throw error;
    }
}
