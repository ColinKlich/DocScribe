import { MarkdownRenderer, Notice, requestUrl, setIcon } from 'obsidian';
import BMOGPT, { DocscribeSettings } from '../main';
import { messageHistory } from '../view';
import { addMessage, addParagraphBreaks, updateUnresolvedInternalLinks } from './chat/Message';
import { displayErrorBotMessage, displayLoadingBotMessage } from './chat/BotMessage';
import { getActiveFileContent, getCurrentNoteContent } from './editor/ReferenceCurrentNote';
import { getPrompt } from './chat/Prompt';
import { GoogleGenAI } from '@google/genai';

let abortController: AbortController | null = null;

// Fetch response from Ollama
// NOTE: Abort does not work for requestUrl
export async function fetchOllamaResponse(plugin: BMOGPT, settings: DocscribeSettings, index: number) {
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
    const referenceCurrentNoteContent = getCurrentNoteContent();

    abortController = new AbortController();

    const submitButton = document.querySelector('.submit-button') as HTMLElement;

    // Change button text to "Cancel"
    setIcon(submitButton, 'square');
    submitButton.title = 'stop';

    submitButton.addEventListener('click', async () => {
        if (submitButton.title === 'stop') {
            const controller = getAbortController();
            if (controller) {
                controller.abort();
            }
        }
    });

    try {
        const response = await fetch(ollamaRESTAPIURL + '/api/chat', {
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
            signal: abortController.signal,
        });

        const responseData = await response.json();
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

                await MarkdownRenderer.render(plugin.app, message || '', messageBlock as HTMLElement, '/', plugin);
                
                addParagraphBreaks(messageBlock);
                updateUnresolvedInternalLinks(plugin, messageBlock);

                const copyCodeBlocks = messageBlock.querySelectorAll('.copy-code-button') as NodeListOf<HTMLElement>;
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
        addMessage(plugin, messageDiv, 'botMessage', settings, index);

    } catch (error) {
        if (error.name === 'AbortError') {
            // Request was aborted, handle accordingly
            // console.log('Request aborted');
            setIcon(submitButton, 'arrow-up');
            submitButton.title = 'send';

                        // Request was aborted
                        if (messageContainerEl) {
                            const targetUserMessage = messageContainerElDivs[index];
                            const targetBotMessage = targetUserMessage.nextElementSibling;
            
                            const messageBlock = targetBotMessage?.querySelector('.messageBlock');
                            const loadingEl = targetBotMessage?.querySelector('#loading');
            
                            if (messageBlock && loadingEl) {
                                targetBotMessage?.removeChild(loadingEl);
                                messageBlock.textContent = 'SYSTEM: Response aborted.';
                                const messageDiv = document.createElement('div');
                                messageDiv.textContent = 'SYSTEM: Response aborted.';
                                addMessage(plugin, messageDiv, 'botMessage', settings, index); // This will save mid-stream conversation.
                            }
                        }
        } else {
            // Handle other errors
            const targetUserMessage = messageContainerElDivs[index];
            const targetBotMessage = targetUserMessage.nextElementSibling;
            targetBotMessage?.remove();

            const messageContainer = document.querySelector('#messageContainer') as HTMLDivElement;
            const botMessageDiv = displayErrorBotMessage(plugin, settings, messageHistory, error);
            messageContainer.appendChild(botMessageDiv);
        }
    } finally {
        // Reset the abort controller
        abortController = null;
    }
}

// Fetch response from Ollama (stream)
export async function fetchOllamaResponseStream(plugin: BMOGPT, settings: DocscribeSettings, index: number) {
    const ollamaRESTAPIURL = settings.OllamaConnection.RESTAPIURL;

    if (!ollamaRESTAPIURL) {
        return;
    }

    const prompt = await getPrompt(plugin, settings);

    const url = ollamaRESTAPIURL + '/api/chat';

    abortController = new AbortController();

    let message = '';

    let isScroll = false;

    const messageHistoryAtIndex = filterMessageHistory(messageHistory);
    
    const messageContainerEl = document.querySelector('#messageContainer');
    const messageContainerElDivs = document.querySelectorAll('#messageContainer div.userMessage, #messageContainer div.botMessage');

    const botMessageDiv = displayLoadingBotMessage(settings);

    messageContainerEl?.insertBefore(botMessageDiv, messageContainerElDivs[index+1]);
    botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    await getActiveFileContent(plugin, settings);
    const referenceCurrentNoteContent = getCurrentNoteContent();

    const submitButton = document.querySelector('.submit-button') as HTMLElement;
    // Change the submit button to a stop button
    setIcon(submitButton, 'square');
    submitButton.title = 'stop';
    submitButton.addEventListener('click', () => {
        if (submitButton.title === 'stop') {
            const controller = getAbortController();
            if (controller) {
                controller.abort();
            }
        }
    });

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: settings.general.model,
                messages: [
                    { role: 'system', content: settings.general.system_role + prompt + referenceCurrentNoteContent},
                    ...messageHistoryAtIndex
                ],
                stream: true,
                keep_alive: parseInt(settings.OllamaConnection.ollamaParameters.keep_alive),
                options: ollamaParametersOptions(settings),
            }),
            signal: abortController.signal
        })

        if (!response.ok) {
            new Notice(`HTTP error! Status: ${response.status}`);
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        if (!response.body) {
            new Notice('Response body is null or undefined.');
            throw new Error('Response body is null or undefined.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let reading = true;

        while (reading) {
            const { done, value } = await reader.read();
            if (done) {
                reading = false;
                break;
            }

            const chunk = decoder.decode(value, { stream: true }) || '';
            // Splitting the chunk to parse JSON messages separately
            const parts = chunk.split('\n');
            for (const part of parts.filter(Boolean)) { // Filter out empty parts
                let parsedChunk;
                try {
                    parsedChunk = JSON.parse(part);
                    if (parsedChunk.done !== true) {
                        const content = parsedChunk.message.content;
                        message += content;
                        }
                    } catch (err) {
                        console.error('Error parsing JSON:', err);
                        // console.log('Part with error:', part);
                        parsedChunk = {response: '{_e_}'};
                    }
                }

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
        
                    // Clear the messageBlock for re-rendering
                    while (messageBlock.firstChild) {
                        messageBlock.removeChild(messageBlock.firstChild);
                    }
                    // DocumentFragment to render markdown off-DOM
                    const fragment = document.createDocumentFragment();
                    const tempContainer = document.createElement('div');
                    fragment.appendChild(tempContainer);
        
                    // Render the accumulated message to the temporary container
                    await MarkdownRenderer.render(plugin.app, message, tempContainer, '/', plugin);
        
                    // Once rendering is complete, move the content to the actual message block
                    while (tempContainer.firstChild) {
                        messageBlock.appendChild(tempContainer.firstChild);
                    }
        
                    addParagraphBreaks(messageBlock);
                    updateUnresolvedInternalLinks(plugin, messageBlock);

                    const copyCodeBlocks = messageBlock.querySelectorAll('.copy-code-button') as NodeListOf<HTMLElement>;
                    copyCodeBlocks.forEach((copyCodeBlock) => {
                        copyCodeBlock.textContent = 'Copy';
                        setIcon(copyCodeBlock, 'copy');
                    });
                }

                messageContainerEl.addEventListener('wheel', (event: WheelEvent) => {
                    // If the user scrolls up or down, stop auto-scrolling
                    if (event.deltaY < 0 || event.deltaY > 0) {
                        isScroll = true;
                    }
                });

                if (!isScroll) {
                    targetBotMessage?.scrollIntoView({ behavior: 'auto', block: 'start' });
                }
            }
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
        addMessage(plugin, messageDiv, 'botMessage', settings, index); 
    } catch (error) {
        if (error.name === 'AbortError') {
            // Request was aborted
            if (messageContainerEl) {
                const targetUserMessage = messageContainerElDivs[index];
                const targetBotMessage = targetUserMessage.nextElementSibling;

                const messageBlock = targetBotMessage?.querySelector('.messageBlock');
                const loadingEl = targetBotMessage?.querySelector('#loading');

                if (messageBlock && loadingEl) {
                    targetBotMessage?.removeChild(loadingEl);
                    messageBlock.textContent = 'SYSTEM: Response aborted.';
                }
            }
        } else {
            // Handle other errors
            const targetUserMessage = messageContainerElDivs[index];
            const targetBotMessage = targetUserMessage.nextElementSibling;
            targetBotMessage?.remove();

            const messageContainer = document.querySelector('#messageContainer') as HTMLDivElement;
            const botMessageDiv = displayErrorBotMessage(plugin, settings, messageHistory, error);
            messageContainer.appendChild(botMessageDiv);
        }

        if (message.trim() === '') {
            const systemDiv = document.createElement('div');
            systemDiv.textContent = 'SYSTEM: Response aborted.';
            addMessage(plugin, systemDiv, 'botMessage', settings, index); // This will save mid-stream conversation.        } else {
            const messageDiv = document.createElement('div');
            messageDiv.textContent = message.trim();
            addMessage(plugin, messageDiv, 'botMessage', settings, index); // This will save mid-stream conversation.
        }
        new Notice('Stream stopped.');
        console.error('Error fetching chat response from Ollama:', error);
    } finally {
        // Reset the abort controller
        abortController = null;
    }

    // Change the submit button back to a send button
    submitButton.textContent = 'send';
    setIcon(submitButton, 'arrow-up');
    submitButton.title = 'send';
}

// Fetch response from openai-based rest api url
export async function fetchRESTAPIURLResponse(plugin: BMOGPT, settings: DocscribeSettings, index: number) {
    const prompt = await getPrompt(plugin, settings);
    const noImageMessageHistory = messageHistory.map(({ role, content }) => ({ role, content }));
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

                await MarkdownRenderer.render(plugin.app, message || '', messageBlock as HTMLElement, '/', plugin);
                
                addParagraphBreaks(messageBlock);
                updateUnresolvedInternalLinks(plugin, messageBlock);

                const copyCodeBlocks = messageBlock.querySelectorAll('.copy-code-button') as NodeListOf<HTMLElement>;
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

        addMessage(plugin, message.trim(), 'botMessage', settings, index);
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

// Fetch response from openai-based rest api url (stream)
export async function fetchRESTAPIURLResponseStream(plugin: BMOGPT, settings: DocscribeSettings, index: number) {
    const RESTAPIURL = settings.RESTAPIURLConnection.RESTAPIURL;

    if (!RESTAPIURL) {
        return;
    }

    const prompt = await getPrompt(plugin, settings);

    const url = RESTAPIURL + '/chat/completions';

    abortController = new AbortController();

    let message = '';

    let isScroll = false;

    const noImageMessageHistory = messageHistory.map(({ role, content }) => ({ role, content }));
    const filteredMessageHistory = filterMessageHistory(noImageMessageHistory);
    const messageHistoryAtIndex = removeConsecutiveUserRoles(filteredMessageHistory);

    const messageContainerEl = document.querySelector('#messageContainer');
    const messageContainerElDivs = document.querySelectorAll('#messageContainer div.userMessage, #messageContainer div.botMessage');

    const botMessageDiv = displayLoadingBotMessage(settings);

    messageContainerEl?.insertBefore(botMessageDiv, messageContainerElDivs[index+1]);
    botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    await getActiveFileContent(plugin, settings);
    const referenceCurrentNoteContent = getCurrentNoteContent();

    const submitButton = document.querySelector('.submit-button') as HTMLElement;

    // Change the submit button to a stop button
    setIcon(submitButton, 'square');
    submitButton.title = 'stop';

    submitButton.addEventListener('click', () => {
        if (submitButton.title === 'stop') {
            const controller = getAbortController();
            if (controller) {
                controller.abort();
            }
        }
    });

    try {
        const response = await fetch(url, {
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
                stream: true,
                temperature: parseInt(settings.general.temperature),
                max_tokens: parseInt(settings.general.max_tokens) || 4096,
            }),
            signal: abortController.signal
        })

        
        if (!response.ok) {
            new Notice(`HTTP error! Status: ${response.status}`);
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        if (!response.body) {
            new Notice('Response body is null or undefined.');
            throw new Error('Response body is null or undefined.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let reading = true;

        while (reading) {
            const { done, value } = await reader.read();
            if (done) {
                reading = false;
                break;
            }

            const chunk = decoder.decode(value, { stream: false }) || '';

            // // console.log('chunk',chunk);
            
            const parts = chunk.split('\n');

            // // console.log("parts", parts)

            for (const part of parts.filter(Boolean)) { // Filter out empty parts
                // Check if chunk contains 'data: [DONE]'
                if (part.includes('data: [DONE]')) {
                    break;
                }
                
                let parsedChunk;
                try {
                    parsedChunk = JSON.parse(part.replace(/^data: /, ''));
                    if ((parsedChunk.choices[0].finish_reason !== 'stop')) {
                        const content = parsedChunk.choices[0].delta.content;
                        message += content;
                    }
                } catch (err) {
                    console.error('Error parsing JSON:', err);
                    // console.log('Part with error:', part);
                    parsedChunk = {response: '{_e_}'};
                }
            }

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
        
                    // Clear the messageBlock for re-rendering
                    while (messageBlock.firstChild) {
                        messageBlock.removeChild(messageBlock.firstChild);
                    }
                    // DocumentFragment to render markdown off-DOM
                    const fragment = document.createDocumentFragment();
                    const tempContainer = document.createElement('div');
                    fragment.appendChild(tempContainer);
        
                    // Render the accumulated message to the temporary container
                    await MarkdownRenderer.render(plugin.app, message, tempContainer, '/', plugin);
        
                    // Once rendering is complete, move the content to the actual message block
                    while (tempContainer.firstChild) {
                        messageBlock.appendChild(tempContainer.firstChild);
                    }
        
                    addParagraphBreaks(messageBlock);
                    updateUnresolvedInternalLinks(plugin, messageBlock);

                    const copyCodeBlocks = messageBlock.querySelectorAll('.copy-code-button') as NodeListOf<HTMLElement>;
                    copyCodeBlocks.forEach((copyCodeBlock) => {
                        copyCodeBlock.textContent = 'Copy';
                        setIcon(copyCodeBlock, 'copy');
                    });
                }

                messageContainerEl.addEventListener('wheel', (event: WheelEvent) => {
                    // If the user scrolls up or down, stop auto-scrolling
                    if (event.deltaY < 0 || event.deltaY > 0) {
                        isScroll = true;
                    }
                });

                if (!isScroll) {
                    targetBotMessage?.scrollIntoView({ behavior: 'auto', block: 'start' });
                }
            }

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
        addMessage(plugin, messageDiv, 'botMessage', settings, index);
        
    } catch (error) {
        if (error.name === 'AbortError') {
            // Request was aborted
            if (messageContainerEl) {
                const targetUserMessage = messageContainerElDivs[index];
                const targetBotMessage = targetUserMessage.nextElementSibling;

                const messageBlock = targetBotMessage?.querySelector('.messageBlock');
                const loadingEl = targetBotMessage?.querySelector('#loading');

                if (messageBlock && loadingEl) {
                    targetBotMessage?.removeChild(loadingEl);
                    messageBlock.textContent = 'SYSTEM: Response aborted.';
                }
            }
        } else {
            // Handle other errors
            const targetUserMessage = messageContainerElDivs[index];
            const targetBotMessage = targetUserMessage.nextElementSibling;
            targetBotMessage?.remove();

            const messageContainer = document.querySelector('#messageContainer') as HTMLDivElement;
            const botMessageDiv = displayErrorBotMessage(plugin, settings, messageHistory, error);
            messageContainer.appendChild(botMessageDiv);
        }

        if (message.trim() === '') {
            const messageDiv = document.createElement('div');
            messageDiv.textContent = 'SYSTEM: Response aborted.';
            addMessage(plugin, messageDiv, 'botMessage', settings, index); // This will save mid-stream conversation.
        } else {
            const messageDiv = document.createElement('div');
            messageDiv.textContent = message.trim();
            addMessage(plugin, messageDiv, 'botMessage', settings, index); // This will save mid-stream conversation.
        }
        new Notice('Stream stopped.');
        console.error('Error fetching chat response from Ollama:', error);
    } finally {
        // Reset the abort controller
        abortController = null;
    }

    // Change the submit button back to a send button
    submitButton.textContent = 'send';
    setIcon(submitButton, 'arrow-up');
    submitButton.title = 'send';
}

// Fetch response from Anthropic
export async function fetchAnthropicResponse(plugin: BMOGPT, settings: DocscribeSettings, index: number) {
    const prompt = await getPrompt(plugin, settings);

    const noImageMessageHistory = messageHistory.map(({ role, content }) => ({ role, content }));
    const filteredMessageHistory = filterMessageHistory(noImageMessageHistory);
    const messageHistoryAtIndex = removeConsecutiveUserRoles(filteredMessageHistory);
    
    const messageContainerEl = document.querySelector('#messageContainer');
    const messageContainerElDivs = document.querySelectorAll('#messageContainer div.userMessage, #messageContainer div.botMessage');

    const botMessageDiv = displayLoadingBotMessage(settings);

    messageContainerEl?.insertBefore(botMessageDiv, messageContainerElDivs[index+1]);
    botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    await getActiveFileContent(plugin, settings);
    const referenceCurrentNoteContent = getCurrentNoteContent();

    abortController = new AbortController();

    const submitButton = document.querySelector('.submit-button') as HTMLElement;

    // Change button text to "Cancel"
    setIcon(submitButton, 'square');
    submitButton.title = 'stop';

    submitButton.addEventListener('click', async () => {
        if (submitButton.title === 'stop') {
            const controller = getAbortController();
            if (controller) {
                controller.abort();
            }
        }
    });

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

                await MarkdownRenderer.render(plugin.app, message || '', messageBlock as HTMLElement, '/', plugin);

                addParagraphBreaks(messageBlock);
                updateUnresolvedInternalLinks(plugin, messageBlock);

                const copyCodeBlocks = messageBlock.querySelectorAll('.copy-code-button') as NodeListOf<HTMLElement>;
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

        addMessage(plugin, message.trim(), 'botMessage', settings, index);
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
  index: number
) {
  const prompt = await getPrompt(plugin, settings);
  const filteredMessageHistory = filterMessageHistory(messageHistory);
  const messageHistoryAtIndex = removeConsecutiveUserRoles(filteredMessageHistory);

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

  abortController = new AbortController();
  const submitButton = document.querySelector('.submit-button') as HTMLElement;
  setIcon(submitButton, 'square');
  submitButton.title = 'stop';

  const handleStop = () => {
    if (submitButton.title === 'stop') {
      const controller = getAbortController();
      controller?.abort();
    }
  };
  submitButton.addEventListener('click', handleStop, { once: true });

  try {
    const API_KEY = settings.APIConnections.googleGemini.APIKey;
    const MODEL_NAME = settings.general.model.replace('models/', '');

    const ai = new GoogleGenAI({ apiKey: API_KEY });

    const generationConfig = {
      temperature: parseFloat(settings.general.temperature) || 0.7,
      maxOutputTokens: settings.general.max_tokens || 4096,
      topP: 0.8,
      topK: 10,
      // Optional: disable "thinking" for 2.5 models
      // thinkingConfig: { thinkingBudget: 0 }
    };

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
      await MarkdownRenderer.render(plugin.app, message, messageBlock as HTMLElement, '/', plugin);
      addParagraphBreaks(messageBlock);
      updateUnresolvedInternalLinks(plugin, messageBlock);

      const copyCodeBlocks = messageBlock.querySelectorAll('.copy-code-button') as NodeListOf<HTMLElement>;
      copyCodeBlocks.forEach(btn => {
        btn.textContent = 'Copy';
        setIcon(btn, 'copy');
      });
      targetBotMessage?.appendChild(messageBlock);
    }

    targetBotMessage?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const messageDiv = document.createElement('div');
    messageDiv.textContent = message.trim();
    addMessage(plugin, messageDiv, 'botMessage', settings, index);

  } catch (error) {
    handleError(error, plugin, settings, index, messageContainerElDivs);
  } finally {
    abortController = null;
    setIcon(submitButton, 'arrow-up');
    submitButton.title = 'send';
    submitButton.removeEventListener('click', handleStop);
  }
}

export async function fetchGoogleGeminiResponseStream(
  plugin: BMOGPT,
  settings: DocscribeSettings,
  index: number
) {
  const prompt = await getPrompt(plugin, settings);
  const filteredMessageHistory = filterMessageHistory(messageHistory);
  const messageHistoryAtIndex = removeConsecutiveUserRoles(filteredMessageHistory);

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

  abortController = new AbortController();
  const submitButton = document.querySelector('.submit-button') as HTMLElement;
  setIcon(submitButton, 'square');
  submitButton.title = 'stop';

  let isScroll = false;
  let accumulatedMessage = '';

  const handleStop = () => {
    if (submitButton.title === 'stop') {
      const controller = getAbortController();
      controller?.abort();
    }
  };
  submitButton.addEventListener('click', handleStop, { once: true });

  const onScroll = () => { isScroll = true; };
  messageContainerEl?.addEventListener('wheel', onScroll, { passive: true });

  try {
    const API_KEY = settings.APIConnections.googleGemini.APIKey;
    const MODEL_NAME = settings.general.model.replace('models/', '');

    const ai = new GoogleGenAI({ apiKey: API_KEY });

    const generationConfig = {
      temperature: parseFloat(settings.general.temperature) || 0.7,
      maxOutputTokens: settings.general.max_tokens || 4096,
      topP: 0.8,
      topK: 10,
      // thinkingConfig: { thinkingBudget: 0 } // optional
    };

    const stream = await ai.models.generateContentStream({
      model: MODEL_NAME,
      contents: geminiHistory,
      config: {
        systemInstruction: fullSystemPrompt,
      },
    });

    for await (const chunk of stream) {
      const text = chunk.text || '';
      if (!text) continue;

      accumulatedMessage += text;

      const targetUserMessage = messageContainerElDivs[index];
      const targetBotMessage = targetUserMessage.nextElementSibling;
      const messageBlock = targetBotMessage?.querySelector('.messageBlock');

      if (messageBlock) {
        const loadingEl = targetBotMessage?.querySelector('#loading');
        if (loadingEl) targetBotMessage?.removeChild(loadingEl);

        messageBlock.innerHTML = '';
        const tempDiv = document.createElement('div');
        await MarkdownRenderer.render(plugin.app, accumulatedMessage, tempDiv, '/', plugin);
        while (tempDiv.firstChild) messageBlock.appendChild(tempDiv.firstChild);

        addParagraphBreaks(messageBlock);
        updateUnresolvedInternalLinks(plugin, messageBlock);

        const copyCodeBlocks = messageBlock.querySelectorAll('.copy-code-button') as NodeListOf<HTMLElement>;
        copyCodeBlocks.forEach(btn => {
          btn.textContent = 'Copy';
          setIcon(btn, 'copy');
        });
      }

      if (!isScroll) {
        targetBotMessage?.scrollIntoView({ behavior: 'auto', block: 'start' });
      }
    }

    // Clean final message
    const regexPatterns = [
      /<block-rendered>[\s\S]*?<\/block-rendered>/g,
      /<note-rendered>[\s\S]*?<\/note-rendered>/g
    ];
    let cleanedMessage = accumulatedMessage;
    regexPatterns.forEach(pattern => {
      cleanedMessage = cleanedMessage.replace(pattern, '').trim();
    });

    const messageDiv = document.createElement('div');
    messageDiv.textContent = cleanedMessage;
    addMessage(plugin, messageDiv, 'botMessage', settings, index);

  } catch (error) {
    handleError(error, plugin, settings, index, messageContainerElDivs);
  } finally {
    abortController = null;
    setIcon(submitButton, 'arrow-up');
    submitButton.title = 'send';
    submitButton.removeEventListener('click', handleStop);
    messageContainerEl?.removeEventListener('wheel', onScroll);
  }
}

function handleError(
  error: any,
  plugin: BMOGPT,
  settings: DocscribeSettings,
  index: number,
  messageContainerElDivs: NodeListOf<Element>
) {
  const messageContainerEl = document.querySelector('#messageContainer');
  const submitButton = document.querySelector('.submit-button') as HTMLElement;

  if (error.name === 'AbortError') {
    const targetUserMessage = messageContainerElDivs[index];
    const targetBotMessage = targetUserMessage.nextElementSibling;
    const messageBlock = targetBotMessage?.querySelector('.messageBlock');
    const loadingEl = targetBotMessage?.querySelector('#loading');

    if (messageBlock && loadingEl) {
      targetBotMessage?.removeChild(loadingEl);
      messageBlock.textContent = 'SYSTEM: Response aborted.';
    }
  } else {
    const targetUserMessage = messageContainerElDivs[index];
    const targetBotMessage = targetUserMessage.nextElementSibling;
    targetBotMessage?.remove();

    const messageContainer = document.querySelector('#messageContainer') as HTMLDivElement;
    const botMessageDiv = displayErrorBotMessage(plugin, settings, messageHistory, error);
    messageContainer.appendChild(botMessageDiv);
  }
}

// Fetch response from Mistral
export async function fetchMistralResponse(plugin: BMOGPT, settings: DocscribeSettings, index: number) {
    const prompt = await getPrompt(plugin, settings);
    const noImageMessageHistory = messageHistory.map(({ role, content }) => ({ role, content }));
    const filteredMessageHistory = filterMessageHistory(noImageMessageHistory);
    const messageHistoryAtIndex = removeConsecutiveUserRoles(filteredMessageHistory);
    
    
    const messageContainerEl = document.querySelector('#messageContainer');
    const messageContainerElDivs = document.querySelectorAll('#messageContainer div.userMessage, #messageContainer div.botMessage');

    const botMessageDiv = displayLoadingBotMessage(settings);

    messageContainerEl?.insertBefore(botMessageDiv, messageContainerElDivs[index+1]);
    botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    await getActiveFileContent(plugin, settings);
    const referenceCurrentNoteContent = getCurrentNoteContent();

    abortController = new AbortController();

    const submitButton = document.querySelector('.submit-button') as HTMLElement;

    // Change button text to "Cancel"
    setIcon(submitButton, 'square');
    submitButton.title = 'stop';

    submitButton.addEventListener('click', async () => {
        if (submitButton.title === 'stop') {
            const controller = getAbortController();
            if (controller) {
                controller.abort();
            }
        }
    });

    try {
        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
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
            signal: abortController?.signal,
        });
            
        const data = await response.json();
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
                
                await MarkdownRenderer.render(plugin.app, message || '', messageBlock as HTMLElement, '/', plugin);
                
                addParagraphBreaks(messageBlock);
                updateUnresolvedInternalLinks(plugin, messageBlock);

                const copyCodeBlocks = messageBlock.querySelectorAll('.copy-code-button') as NodeListOf<HTMLElement>;
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

        addMessage(plugin, message.trim(), 'botMessage', settings, index);
        return;

    } catch (error) {
        if (error.name === 'AbortError') {
            // Request was aborted, handle accordingly
            // console.log('Request aborted');
            setIcon(submitButton, 'arrow-up');
            submitButton.title = 'send';

                        // Request was aborted
                        if (messageContainerEl) {
                            const targetUserMessage = messageContainerElDivs[index];
                            const targetBotMessage = targetUserMessage.nextElementSibling;
            
                            const messageBlock = targetBotMessage?.querySelector('.messageBlock');
                            const loadingEl = targetBotMessage?.querySelector('#loading');
            
                            if (messageBlock && loadingEl) {
                                targetBotMessage?.removeChild(loadingEl);
                                messageBlock.textContent = 'SYSTEM: Response aborted.';
                                const messageDiv = document.createElement('div');
                                messageDiv.textContent = 'SYSTEM: Response aborted.';
                                addMessage(plugin, messageDiv, 'botMessage', settings, index); // This will save mid-stream conversation.
                            }
                        }
        } else {
            // Handle other errors
            const targetUserMessage = messageContainerElDivs[index];
            const targetBotMessage = targetUserMessage.nextElementSibling;
            targetBotMessage?.remove();

            const messageContainer = document.querySelector('#messageContainer') as HTMLDivElement;
            const botMessageDiv = displayErrorBotMessage(plugin, settings, messageHistory, error);
            messageContainer.appendChild(botMessageDiv);
        }
    } finally {
        // Reset the abort controller
        abortController = null;
    }

}

// Fetch response Mistral (stream)
export async function fetchMistralResponseStream(plugin: BMOGPT, settings: DocscribeSettings, index: number) {
    abortController = new AbortController();
    const prompt = await getPrompt(plugin, settings);

    let message = '';

    let isScroll = false;

    const noImageMessageHistory = messageHistory.map(({ role, content }) => ({ role, content }));
    const filteredMessageHistory = filterMessageHistory(noImageMessageHistory);
    const messageHistoryAtIndex = removeConsecutiveUserRoles(filteredMessageHistory);

    const messageContainerEl = document.querySelector('#messageContainer');
    const messageContainerElDivs = document.querySelectorAll('#messageContainer div.userMessage, #messageContainer div.botMessage');

    const botMessageDiv = displayLoadingBotMessage(settings);

    messageContainerEl?.insertBefore(botMessageDiv, messageContainerElDivs[index+1]);
    botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    await getActiveFileContent(plugin, settings);
    const referenceCurrentNoteContent = getCurrentNoteContent();

    abortController = new AbortController();

    const submitButton = document.querySelector('.submit-button') as HTMLElement;

    // Change button text to "Cancel"
    setIcon(submitButton, 'square');
    submitButton.title = 'stop';

    submitButton.addEventListener('click', async () => {
        if (submitButton.title === 'stop') {
            const controller = getAbortController();
            if (controller) {
                controller.abort();
            }
        }
    });

    try {
        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.APIConnections.mistral.APIKey}`
            },
            body: JSON.stringify({
                model: settings.general.model,
                messages: [
                    { role: 'system', content: settings.general.system_role + prompt + referenceCurrentNoteContent},
                    ...messageHistoryAtIndex
                ],
                stream: true,
                temperature: parseInt(settings.general.temperature),
                max_tokens: parseInt(settings.general.max_tokens) || 4096,
            }),
            signal: abortController.signal
        })

        // Change the submit button to a stop button
        setIcon(submitButton, 'square');
        submitButton.title = 'stop';

        
        if (!response.ok) {
            new Notice(`HTTP error! Status: ${response.status}`);
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        if (!response.body) {
            new Notice('Response body is null or undefined.');
            throw new Error('Response body is null or undefined.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let reading = true;

        while (reading) {
            const { done, value } = await reader.read();
            if (done) {
                reading = false;
                break;
            }

            const chunk = decoder.decode(value, { stream: false }) || '';

            // // console.log('chunk',chunk);
            
            const parts = chunk.split('\n');

            // // console.log("parts", parts)

            for (const part of parts.filter(Boolean)) { // Filter out empty parts
                // Check if chunk contains 'data: [DONE]'
                if (part.includes('data: [DONE]')) {
                    break;
                }
                
                let parsedChunk;
                try {
                    parsedChunk = JSON.parse(part.replace(/^data: /, ''));
                    if ((parsedChunk.choices[0].finish_reason !== 'stop')) {
                        const content = parsedChunk.choices[0].delta.content;
                        message += content;
                    }
                } catch (err) {
                    console.error('Error parsing JSON:', err);
                    // console.log('Part with error:', part);
                    parsedChunk = {response: '{_e_}'};
                }
            }

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
        
                    // Clear the messageBlock for re-rendering
                    while (messageBlock.firstChild) {
                        messageBlock.removeChild(messageBlock.firstChild);
                    }
                    // DocumentFragment to render markdown off-DOM
                    const fragment = document.createDocumentFragment();
                    const tempContainer = document.createElement('div');
                    fragment.appendChild(tempContainer);

                    // Render the accumulated message to the temporary container
                    await MarkdownRenderer.render(plugin.app, message, tempContainer, '/', plugin);
        
                    // Once rendering is complete, move the content to the actual message block
                    while (tempContainer.firstChild) {
                        messageBlock.appendChild(tempContainer.firstChild);
                    }
        
                    addParagraphBreaks(messageBlock);
                    updateUnresolvedInternalLinks(plugin, messageBlock);

                    const copyCodeBlocks = messageBlock.querySelectorAll('.copy-code-button') as NodeListOf<HTMLElement>;
                    copyCodeBlocks.forEach((copyCodeBlock) => {
                        copyCodeBlock.textContent = 'Copy';
                        setIcon(copyCodeBlock, 'copy');
                    });
                }

                messageContainerEl.addEventListener('wheel', (event: WheelEvent) => {
                    // If the user scrolls up or down, stop auto-scrolling
                    if (event.deltaY < 0 || event.deltaY > 0) {
                        isScroll = true;
                    }
                });

                if (!isScroll) {
                    targetBotMessage?.scrollIntoView({ behavior: 'auto', block: 'start' });
                }
            }

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
        addMessage(plugin, messageDiv, 'botMessage', settings, index);
        
    } catch (error) {
        if (error.name === 'AbortError') {
            // Request was aborted
            if (messageContainerEl) {
                const targetUserMessage = messageContainerElDivs[index];
                const targetBotMessage = targetUserMessage.nextElementSibling;

                const messageBlock = targetBotMessage?.querySelector('.messageBlock');
                const loadingEl = targetBotMessage?.querySelector('#loading');

                if (messageBlock && loadingEl) {
                    targetBotMessage?.removeChild(loadingEl);
                    messageBlock.textContent = 'SYSTEM: Response aborted.';
                }
            }
        } else {
            // Handle other errors
            const targetUserMessage = messageContainerElDivs[index];
            const targetBotMessage = targetUserMessage.nextElementSibling;
            targetBotMessage?.remove();

            const messageContainer = document.querySelector('#messageContainer') as HTMLDivElement;
            const botMessageDiv = displayErrorBotMessage(plugin, settings, messageHistory, error);
            messageContainer.appendChild(botMessageDiv);
        }

        if (message.trim() === '') {
            const messageDiv = document.createElement('div');
            messageDiv.textContent = 'SYSTEM: Response aborted.';
            addMessage(plugin, messageDiv, 'botMessage', settings, index); // This will save mid-stream conversation.
        } else {
            const messageDiv = document.createElement('div');
            messageDiv.textContent = message.trim();
            addMessage(plugin, messageDiv, 'botMessage', settings, index); // This will save mid-stream conversation.
        }
        new Notice('Stream stopped.');
        console.error('Error fetching chat response from Mistral:', error);
    } finally {
        // Reset the abort controller
        abortController = null;
    }

    // Change the submit button back to a send button
    submitButton.textContent = 'send';
    setIcon(submitButton, 'arrow-up');
    submitButton.title = 'send';
}

// Fetch OpenAI-Based API
export async function fetchOpenAIAPIResponse(plugin: BMOGPT, settings: DocscribeSettings, index: number) {
    abortController = new AbortController();

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

    const submitButton = document.querySelector('.submit-button') as HTMLElement;

    // Change button text to "Cancel"
    setIcon(submitButton, 'square');
    submitButton.title = 'stop';

    submitButton.addEventListener('click', async () => {
        if (submitButton.title === 'stop') {
            const controller = getAbortController();
            if (controller) {
                controller.abort();
            }
        }
    });

    try {
        const response = await fetch(`${plugin.settings.APIConnections.openAI.openAIBaseUrl}/chat/completions`, {
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
            signal: abortController.signal,
        });
          
        const data = await response.json();
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

                await MarkdownRenderer.render(plugin.app, message || '', messageBlock as HTMLElement, '/', plugin);

                addParagraphBreaks(messageBlock);
                updateUnresolvedInternalLinks(plugin, messageBlock);

                const copyCodeBlocks = messageBlock.querySelectorAll('.copy-code-button') as NodeListOf<HTMLElement>;
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
            addMessage(plugin, message.trim(), 'botMessage', settings, index);
        }

    } catch (error) {
        if (error.name === 'AbortError') {
            // Request was aborted, handle accordingly
            // console.log('Request aborted');
            setIcon(submitButton, 'arrow-up');
            submitButton.title = 'send';

            // Request was aborted
            if (messageContainerEl) {
                const targetUserMessage = messageContainerElDivs[index];
                const targetBotMessage = targetUserMessage.nextElementSibling;

                const messageBlock = targetBotMessage?.querySelector('.messageBlock');
                const loadingEl = targetBotMessage?.querySelector('#loading');

                if (messageBlock && loadingEl) {
                    targetBotMessage?.removeChild(loadingEl);
                    messageBlock.textContent = 'SYSTEM: Response aborted.';
                    const messageDiv = document.createElement('div');
                    messageDiv.textContent = 'SYSTEM: Response aborted.';
                    addMessage(plugin, messageDiv, 'botMessage', settings, index); // This will save mid-stream conversation.
                }
            }
        } else {
            // Handle other errors
            const targetUserMessage = messageContainerElDivs[index];
            const targetBotMessage = targetUserMessage.nextElementSibling;
            targetBotMessage?.remove();

            const messageContainer = document.querySelector('#messageContainer') as HTMLDivElement;
            const botMessageDiv = displayErrorBotMessage(plugin, settings, messageHistory, error);
            messageContainer.appendChild(botMessageDiv);
        }
    } finally {
        // Reset the abort controller
        abortController = null;
    }
}

// Fetch OpenAI-Based API Stream
export async function fetchOpenAIAPIResponseStream(plugin: BMOGPT, settings: DocscribeSettings, index: number) {
    abortController = new AbortController();

    const prompt = await getPrompt(plugin, settings);

    let message = '';
    let isScroll = false;

    const filteredMessageHistory = filterMessageHistory(messageHistory);
    const messageHistoryAtIndex = removeConsecutiveUserRoles(filteredMessageHistory);

    const messageContainerEl = document.querySelector('#messageContainer');
    const messageContainerElDivs = document.querySelectorAll('#messageContainer div.userMessage, #messageContainer div.botMessage');

    const botMessageDiv = displayLoadingBotMessage(settings);

    messageContainerEl?.insertBefore(botMessageDiv, messageContainerElDivs[index+1]);
    botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const targetUserMessage = messageContainerElDivs[index];
    const targetBotMessage = targetUserMessage.nextElementSibling;

    await getActiveFileContent(plugin, settings);
    const referenceCurrentNoteContent = getCurrentNoteContent();

    const submitButton = document.querySelector('.submit-button') as HTMLElement;
    // Change the submit button to a stop button
    setIcon(submitButton, 'square');
    submitButton.title = 'stop';
    submitButton.addEventListener('click', () => {
        if (submitButton.title === 'stop') {
            const controller = getAbortController();
            if (controller) {
                controller.abort();
            }
        }
    });

    try {
        const response = await fetch(`${plugin.settings.APIConnections.openAI.openAIBaseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${plugin.settings.APIConnections.openAI.APIKey}`,
            },
            body: JSON.stringify({
              model: settings.general.model,
              max_tokens: parseInt(settings.general.max_tokens),
              stream: true,
              messages: [
                { role: 'system', content: settings.general.system_role + prompt + referenceCurrentNoteContent },
                ...messageHistoryAtIndex,
              ],
            }),
            signal: abortController.signal,
        });


        if (!response.ok) {
            new Notice(`HTTP error! Status: ${response.status}`);
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        if (!response.body) {
            new Notice('Response body is null or undefined.');
            throw new Error('Response body is null or undefined.');
}

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let reading = true;

        while (reading) {
            const { done, value } = await reader.read();
            if (done) {
                reading = false;
                break;
            }

            const chunk = decoder.decode(value, { stream: true }) || '';
            const parts = chunk.split('\n');


            for (const part of parts) {
                if (part.includes('data: [DONE]')) {
                    reading = false;
                    break;
                }
    
                try {
                    const trimmedPart = part.replace(/^data: /, '').trim();
                    if (trimmedPart) {
                        const data = JSON.parse(trimmedPart);
                        if (data.choices && data.choices[0].delta && data.choices[0].delta.content) {
                            const content = data.choices[0].delta.content;
                            message += content;
                        }
                    }
                } catch (err) {
                    console.error('Error parsing JSON:', err);
                    // console.log('Part with error:', part);
                }
            }

            if (messageContainerEl) {
                
                const messageBlock = targetBotMessage?.querySelector('.messageBlock');
                const loadingEl = targetBotMessage?.querySelector('#loading');

                if (messageBlock) {
                    if (loadingEl) {
                        targetBotMessage?.removeChild(loadingEl);
                    }
        
                    // Clear the messageBlock for re-rendering
                    while (messageBlock.firstChild) {
                        messageBlock.removeChild(messageBlock.firstChild);
                    }
                    // DocumentFragment to render markdown off-DOM
                    const fragment = document.createDocumentFragment();
                    const tempContainer = document.createElement('div');
                    fragment.appendChild(tempContainer);
        
                    // Render the accumulated message to the temporary container
                    await MarkdownRenderer.render(plugin.app, message, tempContainer, '/', plugin);
        
                    // Once rendering is complete, move the content to the actual message block
                    while (tempContainer.firstChild) {
                        messageBlock.appendChild(tempContainer.firstChild);
                    }
        
                    addParagraphBreaks(messageBlock);
                    updateUnresolvedInternalLinks(plugin, messageBlock);

                    const copyCodeBlocks = messageBlock.querySelectorAll('.copy-code-button') as NodeListOf<HTMLElement>;
                    copyCodeBlocks.forEach((copyCodeBlock) => {
                        copyCodeBlock.textContent = 'Copy';
                        setIcon(copyCodeBlock, 'copy');
                    });
                }

                messageContainerEl.addEventListener('wheel', (event: WheelEvent) => {
                    // If the user scrolls up or down, stop auto-scrolling
                    if (event.deltaY < 0 || event.deltaY > 0) {
                        isScroll = true;
                    }
                });

                if (!isScroll) {
                    targetBotMessage?.scrollIntoView({ behavior: 'auto', block: 'start' });
                }
            }
        
            if (abortController.signal.aborted) {
                new Notice('Stream stopped.');
                break;
            }
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
        addMessage(plugin, messageDiv, 'botMessage', settings, index);

    } catch (error) {
        if (error.name === 'AbortError') {
            // Request was aborted
            if (messageContainerEl) {
                const targetUserMessage = messageContainerElDivs[index];
                const targetBotMessage = targetUserMessage.nextElementSibling;

                const messageBlock = targetBotMessage?.querySelector('.messageBlock');
                const loadingEl = targetBotMessage?.querySelector('#loading');

                if (messageBlock && loadingEl) {
                    targetBotMessage?.removeChild(loadingEl);
                    messageBlock.textContent = 'SYSTEM: Response aborted.';
                }
            }
        } else {
            // Handle other errors
            const targetUserMessage = messageContainerElDivs[index];
            const targetBotMessage = targetUserMessage.nextElementSibling;
            targetBotMessage?.remove();

            const messageContainer = document.querySelector('#messageContainer') as HTMLDivElement;
            const botMessageDiv = displayErrorBotMessage(plugin, settings, messageHistory, error);
            messageContainer.appendChild(botMessageDiv);
        }

        if (message.trim() === '') {
            const messageDiv = document.createElement('div');
            messageDiv.textContent = 'SYSTEM: Response aborted.';
            addMessage(plugin, messageDiv, 'botMessage', settings, index); // This will save mid-stream conversation.
        } else {
            const messageDiv = document.createElement('div');
            messageDiv.textContent = message.trim();
            addMessage(plugin, messageDiv, 'botMessage', settings, index);// This will save mid-stream conversation.
        }
        new Notice('Stream stopped.');
        console.error('Error fetching chat response from OpenAI-Based Models:', error);
    } finally {
        // Reset the abort controller
        abortController = null;
    }

    // Change the submit button back to a send button
    submitButton.textContent = 'send';
    setIcon(submitButton, 'arrow-up');
    submitButton.title = 'send';
}

// Fetch response from OpenRouter
export async function fetchOpenRouterResponse(plugin: BMOGPT, settings: DocscribeSettings, index: number) {
    abortController = new AbortController();
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

    const submitButton = document.querySelector('.submit-button') as HTMLElement;

    // Change button text to "Cancel"
    setIcon(submitButton, 'square');
    submitButton.title = 'stop';

    submitButton.addEventListener('click', async () => {
        if (submitButton.title === 'stop') {
            const controller = getAbortController();
            if (controller) {
                controller.abort();
            }
        }
    });
 
    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
            signal: abortController.signal
        });
        
        const data = await response.json();
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

                await MarkdownRenderer.render(plugin.app, message || '', messageBlock as HTMLElement, '/', plugin);
                
                addParagraphBreaks(messageBlock);
                updateUnresolvedInternalLinks(plugin, messageBlock);

                const copyCodeBlocks = messageBlock.querySelectorAll('.copy-code-button') as NodeListOf<HTMLElement>;
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

        addMessage(plugin, message.trim(), 'botMessage', settings, index);
        return;

    } catch (error) {
        if (error.name === 'AbortError') {
            // Request was aborted, handle accordingly
            // console.log('Request aborted');
            setIcon(submitButton, 'arrow-up');
            submitButton.title = 'send';

            // Request was aborted
            if (messageContainerEl) {
                const targetUserMessage = messageContainerElDivs[index];
                const targetBotMessage = targetUserMessage.nextElementSibling;

                const messageBlock = targetBotMessage?.querySelector('.messageBlock');
                const loadingEl = targetBotMessage?.querySelector('#loading');

                if (messageBlock && loadingEl) {
                    targetBotMessage?.removeChild(loadingEl);
                    messageBlock.textContent = 'SYSTEM: Response aborted.';
                    const messageDiv = document.createElement('div');
                    messageDiv.textContent = 'SYSTEM: Response aborted.';
                    addMessage(plugin, messageDiv, 'botMessage', settings, index); // This will save mid-stream conversation.
                }
            }
        } else {
            // Handle other errors
            const targetUserMessage = messageContainerElDivs[index];
            const targetBotMessage = targetUserMessage.nextElementSibling;
            targetBotMessage?.remove();

            const messageContainer = document.querySelector('#messageContainer') as HTMLDivElement;
            const botMessageDiv = displayErrorBotMessage(plugin, settings, messageHistory, error);
            messageContainer.appendChild(botMessageDiv);
        }
    } finally {
        // Reset the abort controller
        abortController = null;
    }
}

// Fetch response from openai-based rest api url (stream)
export async function fetchOpenRouterResponseStream(plugin: BMOGPT, settings: DocscribeSettings, index: number) {
    const url = 'https://openrouter.ai/api/v1/chat/completions';

    abortController = new AbortController();

    const prompt = await getPrompt(plugin, settings);

    let message = '';

    let isScroll = false;

    const filteredMessageHistory = filterMessageHistory(messageHistory);
    const messageHistoryAtIndex = removeConsecutiveUserRoles(filteredMessageHistory);

    const messageContainerEl = document.querySelector('#messageContainer');
    const messageContainerElDivs = document.querySelectorAll('#messageContainer div.userMessage, #messageContainer div.botMessage');

    const botMessageDiv = displayLoadingBotMessage(settings);

    messageContainerEl?.insertBefore(botMessageDiv, messageContainerElDivs[index+1]);
    botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    await getActiveFileContent(plugin, settings);
    const referenceCurrentNoteContent = getCurrentNoteContent();

    const submitButton = document.querySelector('.submit-button') as HTMLElement;
    // Change the submit button to a stop button
    setIcon(submitButton, 'square');
    submitButton.title = 'stop';
    submitButton.addEventListener('click', () => {
        if (submitButton.title === 'stop') {
            const controller = getAbortController();
            if (controller) {
                controller.abort();
            }
        }
    });

    try {
        const response = await fetch(url, {
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
                stream: true,
                temperature: parseInt(settings.general.temperature),
                max_tokens: parseInt(settings.general.max_tokens) || 4096,
            }),
            signal: abortController.signal
        })
        
        if (!response.ok) {
            new Notice(`HTTP error! Status: ${response.status}`);
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        if (!response.body) {
            new Notice('Response body is null or undefined.');
            throw new Error('Response body is null or undefined.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let reading = true;

        while (reading) {
            const { done, value } = await reader.read();
            if (done) {
                reading = false;
                break;
            }

            const chunk = decoder.decode(value, { stream: false }) || '';

            // // console.log('chunk',chunk);
            
            const parts = chunk.split('\n');

            // // console.log("parts", parts)

            for (const part of parts.filter(Boolean)) { // Filter out empty parts
                // Check if chunk contains 'data: [DONE]'
                if (part.includes('data: [DONE]')) {
                    break;
                }
                
                let parsedChunk;
                try {
                    parsedChunk = JSON.parse(part.replace(/^data: /, ''));
                    if ((parsedChunk.choices[0].finish_reason !== 'stop')) {
                        const content = parsedChunk.choices[0].delta.content;
                        message += content;
                    }
                } catch (err) {
                    console.error('Error parsing JSON:', err);
                    // console.log('Part with error:', part);
                    parsedChunk = {response: '{_e_}'};
                }
            }

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
        
                    // Clear the messageBlock for re-rendering
                    while (messageBlock.firstChild) {
                        messageBlock.removeChild(messageBlock.firstChild);
                    }

                    // DocumentFragment to render markdown off-DOM
                    const fragment = document.createDocumentFragment();
                    const tempContainer = document.createElement('div');
                    fragment.appendChild(tempContainer);
        
                    // Render the accumulated message to the temporary container
                    await MarkdownRenderer.render(plugin.app, message, tempContainer, '/', plugin);
        
                    // Once rendering is complete, move the content to the actual message block
                    while (tempContainer.firstChild) {
                        messageBlock.appendChild(tempContainer.firstChild);
                    }
        
                    addParagraphBreaks(messageBlock);
                    updateUnresolvedInternalLinks(plugin, messageBlock);

                    const copyCodeBlocks = messageBlock.querySelectorAll('.copy-code-button') as NodeListOf<HTMLElement>;
                    copyCodeBlocks.forEach((copyCodeBlock) => {
                        copyCodeBlock.textContent = 'Copy';
                        setIcon(copyCodeBlock, 'copy');
                    });
                }

                messageContainerEl.addEventListener('wheel', (event: WheelEvent) => {
                    // If the user scrolls up or down, stop auto-scrolling
                    if (event.deltaY < 0 || event.deltaY > 0) {
                        isScroll = true;
                    }
                });

                if (!isScroll) {
                    targetBotMessage?.scrollIntoView({ behavior: 'auto', block: 'start' });
                }
            }

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
        addMessage(plugin, messageDiv, 'botMessage', settings, index);
        
    } catch (error) {
        const messageDiv = document.createElement('div');
        messageDiv.textContent = message.trim();
        addMessage(plugin, messageDiv, 'botMessage', settings, index); // This will save mid-stream conversation.
        new Notice('Stream stopped.');
        console.error(error);
    }

    // Change the submit button back to a send button
    submitButton.textContent = 'send';
    setIcon(submitButton, 'arrow-up');
    submitButton.title = 'send';
}

// Abort controller
export function getAbortController() {
    return abortController;
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