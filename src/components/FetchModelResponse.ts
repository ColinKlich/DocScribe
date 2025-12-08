import { Component, MarkdownRenderer, requestUrl, setIcon } from 'obsidian';
import BMOGPT, { DocscribeSettings } from '../main';
import { messageHistory } from '../view';
import { addMessage, addParagraphBreaks, updateUnresolvedInternalLinks } from './chat/Message';
import { displayErrorBotMessage, displayLoadingBotMessage } from './chat/BotMessage';
import { getActiveFileContent, getCurrentNoteContent } from './editor/ReferenceCurrentNote';
import { getPrompt } from './chat/Prompt';
import { GoogleGenAI } from '@google/genai';

// Fetch response from Ollama
// NOTE: Abort does not work for requestUrl
export async function fetchOllamaResponse(plugin: BMOGPT, settings: DocscribeSettings, index: number, component: Component) {
    const ollamaRESTAPIURL = settings.OllamaConnection.RESTAPIURL;

    if (!ollamaRESTAPIURL) {
        return;
    }

    const prompt = await getPrompt(plugin, settings);

    const messageHistoryAtIndex = filterMessageHistory(messageHistory);

    const messageContainerEl = document.querySelector('#messageContainer');
    const messageContainerElDivs = document.querySelectorAll('#messageContainer div.userMessage, #messageContainer div.botMessage');

    const botMessageDiv = displayLoadingBotMessage(settings);

    messageContainerEl?.insertBefore(botMessageDiv, messageContainerElDivs[index+1]);
    botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    await getActiveFileContent(plugin, settings);
    const referenceCurrentNoteContent = getCurrentNoteContent() || '';

    try {
        const response = await requestUrl({
            url: ollamaRESTAPIURL + '/api/chat',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: settings.general.model,
                messages: [
                    { role: 'system', content: referenceCurrentNoteContent + settings.general.system_role + prompt + referenceCurrentNoteContent },
                    ...messageHistoryAtIndex
                ],
                stream: false,
                options: ollamaParametersOptions(settings),
            }),
        });

        const responseData = response.json;
        let message = responseData.message.content;

        if (messageContainerEl) {
            const targetUserMessage = messageContainerElDivs[index];
            const targetBotMessage = targetUserMessage.nextElementSibling;

            const messageBlock = targetBotMessage?.querySelector('.messageBlock');
            const loadingEl = targetBotMessage?.querySelector('#loading');

            if (messageBlock) {
                if (loadingEl) {
                    targetBotMessage?.removeChild(loadingEl);
                }

                await MarkdownRenderer.render(plugin.app, message || '', messageBlock as HTMLElement, '/', component);
                
                addParagraphBreaks(messageBlock);
                updateUnresolvedInternalLinks(plugin, messageBlock);

                const copyCodeBlocks: NodeListOf<HTMLElement> = messageBlock.querySelectorAll('.copy-code-button');
                copyCodeBlocks.forEach((copyCodeBlock) => {
                    copyCodeBlock.textContent = 'Copy';
                    setIcon(copyCodeBlock, 'copy');
                });
                
                targetBotMessage?.appendChild(messageBlock);
            }
            targetBotMessage?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        // Define regex patterns for the unwanted tags and their content
        const regexPatterns = [
            /<block-rendered>[\s\S]*?<\/block-rendered>/g,
            /<note-rendered>[\s\S]*?<\/note-rendered>/g
        ];

        // Clean the message content by removing the unwanted tags and their content
        regexPatterns.forEach(pattern => {
            message = message.replace(pattern, '').trim();
        });

        const messageDiv = document.createElement('div');
        messageDiv.textContent = message.trim();
        addMessage(plugin, messageDiv, 'botMessage', settings, index).catch((error) => {
            console.error('Error adding message:', error);
        });

    } catch (error) {
        // Handle other errors
        const targetUserMessage = messageContainerElDivs[index];
        const targetBotMessage = targetUserMessage.nextElementSibling;
        targetBotMessage?.remove();

        const messageContainer = document.querySelector('#messageContainer') as HTMLDivElement;
        const botMessageDiv = displayErrorBotMessage(plugin, settings, messageHistory, error);
        messageContainer.appendChild(botMessageDiv);
    }
}



// Fetch response from openai-based rest api url
export async function fetchRESTAPIURLResponse(plugin: BMOGPT, settings: DocscribeSettings, index: number, component: Component) {
    const prompt = await getPrompt(plugin, settings);
    const noImageMessageHistory = messageHistory.map(({ role, content }) => ({ role, content: typeof content === 'string' ? content.replace(/<[^>]*>/g, '') : content }));
    const filteredMessageHistory = filterMessageHistory(noImageMessageHistory);
    const messageHistoryAtIndex = removeConsecutiveUserRoles(filteredMessageHistory);
    
    const messageContainerEl = document.querySelector('#messageContainer');
    const messageContainerElDivs = document.querySelectorAll('#messageContainer div.userMessage, #messageContainer div.botMessage');

    const botMessageDiv = displayLoadingBotMessage(settings);

    messageContainerEl?.insertBefore(botMessageDiv, messageContainerElDivs[index+1]);
    botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    await getActiveFileContent(plugin, settings);
    const referenceCurrentNoteContent = getCurrentNoteContent();
 
    try {
        const response = await requestUrl({
            url: settings.RESTAPIURLConnection.RESTAPIURL + '/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.RESTAPIURLConnection.APIKey}`
            },
            body: JSON.stringify({
                model: settings.general.model,
                messages: [
                    { role: 'system', content: settings.general.system_role + prompt + referenceCurrentNoteContent || 'You are a helpful assistant.'},
                    ...messageHistoryAtIndex
                ],
                max_tokens: parseInt(settings.general.max_tokens) || -1,
                temperature: parseInt(settings.general.temperature),
            }),
        });

        let message = response.json.choices[0].message.content;

        const messageContainerEl = document.querySelector('#messageContainer');
        if (messageContainerEl) {
            const targetUserMessage = messageContainerElDivs[index];
            const targetBotMessage = targetUserMessage.nextElementSibling;

            const messageBlock = targetBotMessage?.querySelector('.messageBlock');
            const loadingEl = targetBotMessage?.querySelector('#loading');
        
            if (messageBlock) {
                if (loadingEl) {
                    targetBotMessage?.removeChild(loadingEl);
                }

                await MarkdownRenderer.render(plugin.app, message || '', messageBlock as HTMLElement, '/', component);
                
                addParagraphBreaks(messageBlock);
                updateUnresolvedInternalLinks(plugin, messageBlock);

                const copyCodeBlocks : NodeListOf<HTMLElement> = messageBlock.querySelectorAll('.copy-code-button');
                copyCodeBlocks.forEach((copyCodeBlock) => {
                    copyCodeBlock.textContent = 'Copy';
                    setIcon(copyCodeBlock, 'copy');
                });
                
                targetBotMessage?.appendChild(messageBlock);
            }
            targetBotMessage?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
        }

        // Define regex patterns for the unwanted tags and their content
        const regexPatterns = [
            /<block-rendered>[\s\S]*?<\/block-rendered>/g,
            /<note-rendered>[\s\S]*?<\/note-rendered>/g
        ];

        // Clean the message content by removing the unwanted tags and their content
        regexPatterns.forEach(pattern => {
            message = message.replace(pattern, '').trim();
        });

        addMessage(plugin, message.trim(), 'botMessage', settings, index).catch((error) => {
            console.error('Error adding message:', error);
        });
        return;

    } catch (error) {
        const targetUserMessage = messageContainerElDivs[index];
        const targetBotMessage = targetUserMessage.nextElementSibling;
        targetBotMessage?.remove();

        const messageContainer = document.querySelector('#messageContainer') as HTMLDivElement;
        const botMessageDiv = displayErrorBotMessage(plugin, settings, messageHistory, error);
        messageContainer.appendChild(botMessageDiv);

    }
}


// Fetch response from Anthropic
export async function fetchAnthropicResponse(plugin: BMOGPT, settings: DocscribeSettings, index: number, component: Component) {
    const prompt = await getPrompt(plugin, settings);

    const noImageMessageHistory = messageHistory.map(({ role, content }) => ({ role, content: typeof content === 'string' ? content.replace(/<[^>]*>/g, '') : content }));
    const filteredMessageHistory = filterMessageHistory(noImageMessageHistory);
    const messageHistoryAtIndex = removeConsecutiveUserRoles(filteredMessageHistory);
    
    const messageContainerEl = document.querySelector('#messageContainer');
    const messageContainerElDivs = document.querySelectorAll('#messageContainer div.userMessage, #messageContainer div.botMessage');

    const botMessageDiv = displayLoadingBotMessage(settings);

    messageContainerEl?.insertBefore(botMessageDiv, messageContainerElDivs[index+1]);
    botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    await getActiveFileContent(plugin, settings);
    const referenceCurrentNoteContent = getCurrentNoteContent();

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
                model: settings.general.model,
                system: settings.general.system_role + prompt + referenceCurrentNoteContent,
                messages: [
                    ...messageHistoryAtIndex
                ],
                max_tokens: parseInt(settings.general.max_tokens) || 4096,
                temperature: parseInt(settings.general.temperature),
            }),
        });

        let message = response.json.content[0].text;

        const messageContainerEl = document.querySelector('#messageContainer');
        if (messageContainerEl) {
            const targetUserMessage = messageContainerElDivs[index];
            const targetBotMessage = targetUserMessage.nextElementSibling;

            const messageBlock = targetBotMessage?.querySelector('.messageBlock');
            const loadingEl = targetBotMessage?.querySelector('#loading');
        
            if (messageBlock) {
                if (loadingEl) {
                    targetBotMessage?.removeChild(loadingEl);
                }

                await MarkdownRenderer.render(plugin.app, message || '', messageBlock as HTMLElement, '/', component);

                addParagraphBreaks(messageBlock);
                updateUnresolvedInternalLinks(plugin, messageBlock);

                const copyCodeBlocks: NodeListOf<HTMLElement> = messageBlock.querySelectorAll('.copy-code-button');
                copyCodeBlocks.forEach((copyCodeBlock) => {
                    copyCodeBlock.textContent = 'Copy';
                    setIcon(copyCodeBlock, 'copy');
                });
                
                targetBotMessage?.appendChild(messageBlock);
            }
            targetBotMessage?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
        }

        // Define regex patterns for the unwanted tags and their content
        const regexPatterns = [
            /<block-rendered>[\s\S]*?<\/block-rendered>/g,
            /<note-rendered>[\s\S]*?<\/note-rendered>/g
        ];

        // Clean the message content by removing the unwanted tags and their content
        regexPatterns.forEach(pattern => {
            message = message.replace(pattern, '').trim();
        });

        addMessage(plugin, message.trim(), 'botMessage', settings, index).catch((error) => {
            console.error('Error adding message:', error);
        });
        return;

    } catch (error) {
        const targetUserMessage = messageContainerElDivs[index];
        const targetBotMessage = targetUserMessage.nextElementSibling;
        targetBotMessage?.remove();

        const messageContainer = document.querySelector('#messageContainer') as HTMLDivElement;
        const botMessageDiv = displayErrorBotMessage(plugin, settings, messageHistory, error);
        messageContainer.appendChild(botMessageDiv);
    }

}

// Convert internal history to Gemini format
function convertToGeminiHistory(messages: { role: string; content: string }[]) {
  return messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content.trim() }]
  }));
}

// Fetch response from Google Gemini
export async function fetchGoogleGeminiResponse(
  plugin: BMOGPT,
  settings: DocscribeSettings,
  index: number,
  component: Component
) {
  const prompt = await getPrompt(plugin, settings);
  const filteredMessageHistory = filterMessageHistory(messageHistory);
  const messageHistoryAtIndex = removeConsecutiveUserRoles(filteredMessageHistory).map(msg => ({...msg, content: typeof msg.content === 'string' ? msg.content.replace(/<[^>]*>/g, '') : msg.content}));

  const messageContainerEl = document.querySelector('#messageContainer');
  const messageContainerElDivs = document.querySelectorAll(
    '#messageContainer div.userMessage, #messageContainer div.botMessage'
  );

  const botMessageDiv = displayLoadingBotMessage(settings);
  messageContainerEl?.insertBefore(botMessageDiv, messageContainerElDivs[index + 1]);
  botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

  await getActiveFileContent(plugin, settings);
  const referenceCurrentNoteContent = getCurrentNoteContent();

  const fullSystemPrompt = `${plugin.settings.general.system_role} ${prompt} ${referenceCurrentNoteContent}`;
  const geminiHistory = convertToGeminiHistory(messageHistoryAtIndex);

  try {
    const API_KEY = settings.APIConnections.googleGemini.APIKey;
    const MODEL_NAME = settings.general.model.replace('models/', '');

    const ai = new GoogleGenAI({ apiKey: API_KEY });

    // const generationConfig = {
    //   temperature: parseFloat(settings.general.temperature) || 0.7,
    //   maxOutputTokens: settings.general.max_tokens || 4096,
    //   topP: 0.8,
    //   topK: 10,
    //   // Optional: disable "thinking" for 2.5 models
    //   // thinkingConfig: { thinkingBudget: 0 }
    // };

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: geminiHistory,
      config: {
        systemInstruction: fullSystemPrompt,
      },
    });

    let message = response.text || '';

    // Clean unwanted tags
    const regexPatterns = [
      /<block-rendered>[\s\S]*?<\/block-rendered>/g,
      /<note-rendered>[\s\S]*?<\/note-rendered>/g
    ];
    regexPatterns.forEach(pattern => {
      message = message.replace(pattern, '').trim();
    });

    // Update UI
    const targetUserMessage = messageContainerElDivs[index];
    const targetBotMessage = targetUserMessage.nextElementSibling;
    const messageBlock = targetBotMessage?.querySelector('.messageBlock');
    const loadingEl = targetBotMessage?.querySelector('#loading');

    if (messageBlock) {
      if (loadingEl) targetBotMessage?.removeChild(loadingEl);
      await MarkdownRenderer.render(plugin.app, message, messageBlock as HTMLElement, '/', component);
      addParagraphBreaks(messageBlock);
      updateUnresolvedInternalLinks(plugin, messageBlock);

      const copyCodeBlocks: NodeListOf<HTMLElement> = messageBlock.querySelectorAll('.copy-code-button');
      copyCodeBlocks.forEach(btn => {
        btn.textContent = 'Copy';
        setIcon(btn, 'copy');
      });
      targetBotMessage?.appendChild(messageBlock);
    }

    targetBotMessage?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const messageDiv = document.createElement('div');
    messageDiv.textContent = message.trim();
    addMessage(plugin, messageDiv, 'botMessage', settings, index).catch((error) => {
      console.error('Error adding message:', error);
    });

  } catch (error) {
    console.error('Error fetching Google Gemini response:', error);
  }
}

// Fetch Mistral AI Response
export async function fetchMistralResponse(plugin: BMOGPT, settings: DocscribeSettings, index: number, component: Component) {
    const prompt = await getPrompt(plugin, settings);
    const noImageMessageHistory = messageHistory.map(({ role, content }) => ({ role, content: typeof content === 'string' ? content.replace(/<[^>]*>/g, '') : content }));
    const filteredMessageHistory = filterMessageHistory(noImageMessageHistory);
    const messageHistoryAtIndex = removeConsecutiveUserRoles(filteredMessageHistory);
    
    
    const messageContainerEl = document.querySelector('#messageContainer');
    const messageContainerElDivs = document.querySelectorAll('#messageContainer div.userMessage, #messageContainer div.botMessage');

    const botMessageDiv = displayLoadingBotMessage(settings);

    messageContainerEl?.insertBefore(botMessageDiv, messageContainerElDivs[index+1]);
    botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    await getActiveFileContent(plugin, settings);
    const referenceCurrentNoteContent = getCurrentNoteContent();

    try {
        const response = await requestUrl({
            url: 'https://api.mistral.ai/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.APIConnections.mistral.APIKey}`
            },
            body: JSON.stringify({
                model: settings.general.model,
                messages: [
                { role: 'system', content: settings.general.system_role + prompt + referenceCurrentNoteContent },
                ...messageHistoryAtIndex
                ],
                max_tokens: parseInt(settings.general.max_tokens) || 4096,
                temperature: parseInt(settings.general.temperature),
            }),
        });
            
        const data = response.json;
        let message = data.choices[0].message.content;

        const messageContainerEl = document.querySelector('#messageContainer');
        if (messageContainerEl) {
            const targetUserMessage = messageContainerElDivs[index];
            const targetBotMessage = targetUserMessage.nextElementSibling;

            const messageBlock = targetBotMessage?.querySelector('.messageBlock');
            const loadingEl = targetBotMessage?.querySelector('#loading');
        
            if (messageBlock) {
                if (loadingEl) {
                    targetBotMessage?.removeChild(loadingEl);
                }
                
                await MarkdownRenderer.render(plugin.app, message || '', messageBlock as HTMLElement, '/', component);
                
                addParagraphBreaks(messageBlock);
                updateUnresolvedInternalLinks(plugin, messageBlock);

                const copyCodeBlocks: NodeListOf<HTMLElement> = messageBlock.querySelectorAll('.copy-code-button');
                copyCodeBlocks.forEach((copyCodeBlock) => {
                    copyCodeBlock.textContent = 'Copy';
                    setIcon(copyCodeBlock, 'copy');
                });
                
                targetBotMessage?.appendChild(messageBlock);
            }
            targetBotMessage?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
        }

        // Define regex patterns for the unwanted tags and their content
        const regexPatterns = [
            /<block-rendered>[\s\S]*?<\/block-rendered>/g,
            /<note-rendered>[\s\S]*?<\/note-rendered>/g
        ];

        // Clean the message content by removing the unwanted tags and their content
        regexPatterns.forEach(pattern => {
            message = message.replace(pattern, '').trim();
        });

        addMessage(plugin, message.trim(), 'botMessage', settings, index).catch((error) => {
            console.error('Error adding message:', error);
        });
        return;

    } catch (error) {
        // Handle other errors
        const targetUserMessage = messageContainerElDivs[index];
        const targetBotMessage = targetUserMessage.nextElementSibling;
        targetBotMessage?.remove();

        const messageContainer = document.querySelector('#messageContainer') as HTMLDivElement;
        const botMessageDiv = displayErrorBotMessage(plugin, settings, messageHistory, error);
        messageContainer.appendChild(botMessageDiv);
    }
}

// Fetch OpenAI-Based API
export async function fetchOpenAIAPIResponse(plugin: BMOGPT, settings: DocscribeSettings, index: number, component: Component) {

    const prompt = await getPrompt(plugin, settings);

    const filteredMessageHistory = filterMessageHistory(messageHistory);
    const messageHistoryAtIndex = removeConsecutiveUserRoles(filteredMessageHistory).map(msg => ({...msg, content: typeof msg.content === 'string' ? msg.content.replace(/<[^>]*>/g, '') : msg.content}));

    const messageContainerEl = document.querySelector('#messageContainer');
    const messageContainerElDivs = document.querySelectorAll('#messageContainer div.userMessage, #messageContainer div.botMessage');

    const botMessageDiv = displayLoadingBotMessage(settings);
    
    messageContainerEl?.insertBefore(botMessageDiv, messageContainerElDivs[index+1]);
    botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    await getActiveFileContent(plugin, settings);
    const referenceCurrentNoteContent = getCurrentNoteContent();

    try {
        const response = await requestUrl({
            url: `${plugin.settings.APIConnections.openAI.openAIBaseUrl}/chat/completions`,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${plugin.settings.APIConnections.openAI.APIKey}`,
            },
            body: JSON.stringify({
              model: settings.general.model,
              max_tokens: parseInt(settings.general.max_tokens),
              stream: false,
              messages: [
                { role: 'system', content: settings.general.system_role + prompt + referenceCurrentNoteContent },
                ...messageHistoryAtIndex,
              ],
            }),
        });
          
        const data = response.json;
        let message = data.choices[0].message.content || '';
        
        if (messageContainerEl) {
            const targetUserMessage = messageContainerElDivs[index];
            const targetBotMessage = targetUserMessage.nextElementSibling;

            const messageBlock = targetBotMessage?.querySelector('.messageBlock');
            const loadingEl = targetBotMessage?.querySelector('#loading');

            if (messageBlock) {
                if (loadingEl) {
                    targetBotMessage?.removeChild(loadingEl);
                }

                await MarkdownRenderer.render(plugin.app, message || '', messageBlock as HTMLElement, '/', component);

                addParagraphBreaks(messageBlock);
                updateUnresolvedInternalLinks(plugin, messageBlock);

                const copyCodeBlocks: NodeListOf<HTMLElement> = messageBlock.querySelectorAll('.copy-code-button');
                copyCodeBlocks.forEach((copyCodeBlock) => {
                    copyCodeBlock.textContent = 'Copy';
                    setIcon(copyCodeBlock, 'copy');
                });
                
                targetBotMessage?.appendChild(messageBlock);
            }
            targetBotMessage?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        if (message != null) {
            // Define regex patterns for the unwanted tags and their content
            const regexPatterns = [
                /<block-rendered>[\s\S]*?<\/block-rendered>/g,
                /<note-rendered>[\s\S]*?<\/note-rendered>/g,
                /<note-rendered>[\s\S]*?<\/note-rendered>/g
            ];

            // Clean the message content by removing the unwanted tags and their content
            regexPatterns.forEach(pattern => {
                message = message.replace(pattern, '').trim();
            });
            addMessage(plugin, message.trim(), 'botMessage', settings, index).catch((error) => {
                console.error('Error adding message:', error);
            });
            return;
        }

    } catch (error) {
        // Handle other errors
        const targetUserMessage = messageContainerElDivs[index];
        const targetBotMessage = targetUserMessage.nextElementSibling;
        targetBotMessage?.remove();

        const messageContainer = document.querySelector('#messageContainer') as HTMLDivElement;
        const botMessageDiv = displayErrorBotMessage(plugin, settings, messageHistory, error);
        messageContainer.appendChild(botMessageDiv);
    }
}

// Fetch response from OpenRouter
export async function fetchOpenRouterResponse(plugin: BMOGPT, settings: DocscribeSettings, index: number, component: Component) {
    const prompt = await getPrompt(plugin, settings);  
    const filteredMessageHistory = filterMessageHistory(messageHistory);
    const messageHistoryAtIndex = removeConsecutiveUserRoles(filteredMessageHistory);
    
    const messageContainerEl = document.querySelector('#messageContainer');
    const messageContainerElDivs = document.querySelectorAll('#messageContainer div.userMessage, #messageContainer div.botMessage');

    const botMessageDiv = displayLoadingBotMessage(settings);

    messageContainerEl?.insertBefore(botMessageDiv, messageContainerElDivs[index+1]);
    botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    await getActiveFileContent(plugin, settings);
    const referenceCurrentNoteContent = getCurrentNoteContent();
 
    try {
        const response = await requestUrl({
            url: 'https://openrouter.ai/api/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.APIConnections.openRouter.APIKey}`
            },
            body: JSON.stringify({
                model: settings.general.model,
                messages: [
                    { role: 'system', content: settings.general.system_role + prompt + referenceCurrentNoteContent || 'You are a helpful assistant.'},
                    ...messageHistoryAtIndex
                ],
                max_tokens: parseInt(settings.general.max_tokens) || 4096,
                temperature: parseInt(settings.general.temperature),
            }),
        });
        
        const data = response.json;
        let message = data.choices[0].message.content;

        const messageContainerEl = document.querySelector('#messageContainer');
        if (messageContainerEl) {
            const targetUserMessage = messageContainerElDivs[index];
            const targetBotMessage = targetUserMessage.nextElementSibling;

            const messageBlock = targetBotMessage?.querySelector('.messageBlock');
            const loadingEl = targetBotMessage?.querySelector('#loading');
        
            if (messageBlock) {
                if (loadingEl) {
                    targetBotMessage?.removeChild(loadingEl);
                }

                await MarkdownRenderer.render(plugin.app, message || '', messageBlock as HTMLElement, '/', component);
                
                addParagraphBreaks(messageBlock);
                updateUnresolvedInternalLinks(plugin, messageBlock);

                const copyCodeBlocks: NodeListOf<HTMLElement> = messageBlock.querySelectorAll('.copy-code-button');
                copyCodeBlocks.forEach((copyCodeBlock) => {
                    copyCodeBlock.textContent = 'Copy';
                    setIcon(copyCodeBlock, 'copy');
                });
                
                targetBotMessage?.appendChild(messageBlock);
            }
            targetBotMessage?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
        }

        // Define regex patterns for the unwanted tags and their content
        const regexPatterns = [
            /<block-rendered>[\s\S]*?<\/block-rendered>/g,
            /<note-rendered>[\s\S]*?<\/note-rendered>/g
        ];

        // Clean the message content by removing the unwanted tags and their content
        regexPatterns.forEach(pattern => {
            message = message.replace(pattern, '').trim();
        });

        addMessage(plugin, message.trim(), 'botMessage', settings, index).catch((error) => {
            console.error('Error adding message:', error);
        });
        return;

    } catch (error) {
        // Handle other errors
        const targetUserMessage = messageContainerElDivs[index];
        const targetBotMessage = targetUserMessage.nextElementSibling;
        targetBotMessage?.remove();

        const messageContainer = document.querySelector('#messageContainer') as HTMLDivElement;
        const botMessageDiv = displayErrorBotMessage(plugin, settings, messageHistory, error);
        messageContainer.appendChild(botMessageDiv);
    }
}

function ollamaParametersOptions(settings: DocscribeSettings) {
    return {
        mirostat: parseInt(settings.OllamaConnection.ollamaParameters.mirostat),
        mirostat_eta: parseFloat(settings.OllamaConnection.ollamaParameters.mirostat_eta),
        mirostat_tau: parseFloat(settings.OllamaConnection.ollamaParameters.mirostat_tau),
        num_ctx: parseInt(settings.OllamaConnection.ollamaParameters.num_ctx),
        num_gqa: parseInt(settings.OllamaConnection.ollamaParameters.num_gqa),
        num_thread: parseInt(settings.OllamaConnection.ollamaParameters.num_thread),
        repeat_last_n: parseInt(settings.OllamaConnection.ollamaParameters.repeat_last_n),
        repeat_penalty: parseFloat(settings.OllamaConnection.ollamaParameters.repeat_penalty),
        temperature: parseInt(settings.general.temperature),
        seed: parseInt(settings.OllamaConnection.ollamaParameters.seed),
        stop: settings.OllamaConnection.ollamaParameters.stop,
        tfs_z: parseFloat(settings.OllamaConnection.ollamaParameters.tfs_z),
        num_predict: parseInt(settings.general.max_tokens) || -1,
        top_k: parseInt(settings.OllamaConnection.ollamaParameters.top_k),
        top_p: parseFloat(settings.OllamaConnection.ollamaParameters.top_p),
        min_p: parseFloat(settings.OllamaConnection.ollamaParameters.min_p),
    };
}

function filterMessageHistory(messageHistory: { role: string; content: string; images?: Uint8Array[] | string[] }[]) {
    const skipIndexes = new Set(); // Store indexes of messages to skip

    messageHistory.forEach((message, index,  array) => {
        // Check for user message with slash
        if (message.role === 'user' && message.content.startsWith('/')) {
            skipIndexes.add(index); // Skip this message
            // Check if next message is from the assistant and skip it as well
            if (index + 1 < array.length && array[index + 1].role === 'assistant') {
                skipIndexes.add(index + 1);
            }
        }
        // Check for assistant message with displayErrorBotMessage
        else if (message.role === 'assistant' && message.content.includes('errorBotMessage')) {
            skipIndexes.add(index); // Skip this message
            if (index > 0) {
                skipIndexes.add(index - 1); // Also skip previous message if it exists
            }
        }
    });

    // Filter the message history, skipping marked messages
    const filteredMessageHistory = messageHistory.filter((_, index) => !skipIndexes.has(index));

    // // console.log('Filtered message history:', filteredMessageHistory);

    return filteredMessageHistory;
}

function removeConsecutiveUserRoles(messageHistory: { role: string; content: string; }[]) {
    const result = [];
    let foundUserMessage = false;

    for (let i = 0; i < messageHistory.length; i++) {
        if (messageHistory[i].role === 'user') {
            if (!foundUserMessage) {
                // First user message, add to result
                result.push(messageHistory[i]);
                foundUserMessage = true;
            } else {
                // Second consecutive user message found, stop adding to result
                break;
            }
        } else {
            // Non-user message, add to result
            result.push(messageHistory[i]);
            foundUserMessage = false;
        }
    }
    return result;
}
