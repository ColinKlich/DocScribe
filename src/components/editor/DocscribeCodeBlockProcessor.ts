import { MarkdownPostProcessorContext, MarkdownRenderer, Plugin } from 'obsidian';
import { DocscribeSettings } from 'src/main';
import { fetchAnthropicResponseEditor, fetchOllamaResponseEditor, fetchRESTAPIURLDataEditor, fetchGoogleGeminiDataEditor, fetchMistralDataEditor, fetchOpenAIBaseAPIResponseEditor, fetchOpenRouterEditor } from '../FetchModelEditor';

export function DocscribeCodeBlockProcessor(plugin: Plugin, settings: DocscribeSettings) {
    let previousPrompt = '';
    let abortController: AbortController | null = null;
    
    return plugin.registerMarkdownCodeBlockProcessor('Docscribe', async (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {                
        // Abort any existing processes
        if (abortController) {
            abortController.abort();
        }
        
        // Create an AbortController at the beginning
        abortController = new AbortController();

        // Get the active file
        const file = plugin.app.workspace.getActiveFile();
        // Check if the file exists and the model is set
        if (file && settings.general.model !== '') {
            // Get the file content
            const fileContent = await plugin.app.vault.read(file);
            
            // Find all the code blocks in the file content
            const codeBlockRegex = /```Docscribe\n([\s\S]*?)```/g;
            let match;
            let updatedFileContent = fileContent;

            while ((match = codeBlockRegex.exec(fileContent)) !== null) {
                const originalCodeBlock = match[0];
                const codeBlockContent = match[1];

                if (!codeBlockContent.includes('MODEL ')) {
                    const updatedSource = 'MODEL ' + settings.general.model + '\n' + codeBlockContent;
                    
                    // Replace the code block in the file content
                    updatedFileContent = updatedFileContent.replace(originalCodeBlock, '```Docscribe\n' + updatedSource + '```');
                }
            }

            // Write the updated content back to the file if there were changes
            if (updatedFileContent !== fileContent) {
                await plugin.app.vault.modify(file, updatedFileContent);
            }
        }

        // Extract model name and content to render
        let modelName = 'No Model';
        let temperature = '1.0';
        let maxTokens = '';
        let contentToRender = '';

        // Extract model name
        const modelMatch = source.match(/MODEL\s+(.+)/);
        if (modelMatch) {
            modelName = modelMatch[1].trim();
        }

        // Extract temperature
        const temperatureMatch = source.match(/TEMPERATURE\s+(.+)/);
        if (temperatureMatch) {
            temperature = temperatureMatch[1].trim();
        }

        // Extract max tokens
        const maxTokensMatch = source.match(/MAX_TOKENS\s+(.+)/);
        if (maxTokensMatch) {
            maxTokens = maxTokensMatch[1].trim();
        }

        // Extract the prompt
        const promptMatch = source.match(/^(?:MODEL.*\n|TEMPERATURE.*\n|MAX_TOKENS.*\n)*([\s\S]*?)(?=\s*<response>|$)/);
        let prompt = '';
        if (promptMatch) {
            prompt = promptMatch[1].trim();
        }
    
        // Check if the prompt has changed
        if (prompt !== previousPrompt) {
            previousPrompt = prompt;
        }

        // Previous response content
        const responseMatch = source.match(/<response>([\s\S]*?)<\/response>/);
        if (responseMatch) {
            contentToRender = responseMatch[1].trim();
        }

        const container = el.createEl('div');
        container.style.position = 'relative';

        const DocscribeCodeBlockContainer = container.createEl('div', { cls: 'DocscribeCodeBlockContainer' });
        DocscribeCodeBlockContainer.dataset.callout = 'chat';
        DocscribeCodeBlockContainer.style.backgroundColor = settings.appearance.DocscribeGenerateBackgroundColor;
        DocscribeCodeBlockContainer.style.border = '1px solid #0a0f0a';
        DocscribeCodeBlockContainer.style.borderRadius = '5px';
        DocscribeCodeBlockContainer.style.padding = '10px';
        DocscribeCodeBlockContainer.style.marginBottom = '10px';

        const DocscribeCodeBlockContent = DocscribeCodeBlockContainer.createEl('div', { cls: 'DocscribeCodeBlockContent' });
        DocscribeCodeBlockContent.style.color = settings.appearance.DocscribeGenerateFontColor;
        DocscribeCodeBlockContent.style.whiteSpace = 'normal';

        const bottomContainer = container.createEl('div');
        bottomContainer.style.display = 'flex';
        bottomContainer.style.justifyContent = 'space-between';
        bottomContainer.style.alignItems = 'center';
        bottomContainer.style.marginTop = '10px';

        const modelText = bottomContainer.createEl('span');
        modelText.textContent = modelName;
        modelText.style.fontSize = '0.9em';
        modelText.style.color = '#666';
        modelText.style.fontWeight = 'bold';

        const loaderCircle = bottomContainer.createEl('div');
        loaderCircle.classList.add('loader-circle');
        loaderCircle.style.width = '20px';
        loaderCircle.style.height = '20px';
        loaderCircle.style.border = '2px solid #666';
        loaderCircle.style.borderTopColor = 'transparent';
        loaderCircle.style.borderRadius = '50%';
        loaderCircle.style.animation = 'spin 1s linear infinite';
        loaderCircle.style.display = 'none';

        const DocscribeGenerationNotice = bottomContainer.createEl('span');
        DocscribeGenerationNotice.textContent = 'Done!';
        DocscribeGenerationNotice.style.fontSize = '0.9em';
        DocscribeGenerationNotice.style.color = '#4caf50'; // Light green color
        DocscribeGenerationNotice.style.display = 'none';

        const button = bottomContainer.createEl('button');
        button.textContent = 'Generate';

        button.onclick = async () => {
            if (button.textContent === 'Cancel') {
                if (abortController) {
                    abortController.abort();
                    abortController = null;
                }
                button.textContent = 'Generate';
                loaderCircle.style.display = 'none';
                DocscribeGenerationNotice.textContent = 'Aborted.';
                DocscribeGenerationNotice.style.color = '#ff6666';
                DocscribeGenerationNotice.style.display = 'inline';
                setTimeout(() => {
                    DocscribeGenerationNotice.style.display = 'none';
                }, 2000);
                return;
            }

            // Change button text to "Cancel"
            button.textContent = 'Cancel';

            // Use the existing AbortController
            if (!abortController) {
                abortController = new AbortController();
            }
            const signal = abortController.signal;

            // Show the loader circle
            loaderCircle.style.display = 'block';

            let modelResponse = '';


            try {
                if (settings.OllamaConnection.ollamaModels.includes(modelName)) {
                    modelResponse = await fetchOllamaResponseEditor(settings, prompt, modelName, temperature, maxTokens, signal) || contentToRender;
                } else if (settings.RESTAPIURLConnection.RESTAPIURLModels.includes(modelName)) {
                    modelResponse = await fetchRESTAPIURLDataEditor(settings, prompt, modelName, temperature, maxTokens, signal) || contentToRender;
                } else if (settings.APIConnections.anthropic.anthropicModels.includes(modelName)) {
                    button.disabled = true;
                    modelResponse = await fetchAnthropicResponseEditor(settings, prompt, modelName, temperature, maxTokens, signal) || contentToRender;
                } else if (settings.APIConnections.googleGemini.geminiModels.includes(modelName)) {
                    modelResponse = await fetchGoogleGeminiDataEditor(settings, prompt, modelName, temperature, maxTokens, signal) || contentToRender;
                } else if (settings.APIConnections.mistral.mistralModels.includes(modelName)) {
                    modelResponse = await fetchMistralDataEditor(settings, prompt, modelName, temperature, maxTokens, signal) || contentToRender;
                } else if (settings.APIConnections.openAI.openAIBaseModels.includes(modelName)) {
                    modelResponse = await fetchOpenAIBaseAPIResponseEditor(settings, prompt, modelName, temperature, maxTokens, signal) || contentToRender;
                } else if (settings.APIConnections.openRouter.openRouterModels.includes(modelName)) {
                    modelResponse = await fetchOpenRouterEditor(settings, prompt, modelName, temperature, maxTokens, signal) || contentToRender;
                } else {
                    DocscribeGenerationNotice.textContent = 'Model not found.';
                    DocscribeGenerationNotice.style.color = '#ff6666';
                    DocscribeGenerationNotice.style.display = 'inline';
                    setTimeout(() => {
                        DocscribeGenerationNotice.style.display = 'none';
                        button.textContent = 'Generate';
                    }, 2000);
                }

                if (modelResponse !== '') {
                    // Replace backticks with escaped backticks if it doesn't already exist
                    if (!modelResponse.includes('\\`')) {
                        modelResponse = modelResponse.replace(/`/g, '\\`');
                    }

                    // Check if <response> tags exist in the source
                    const responseTagsExist = source.includes('<response>') && source.includes('</response>');

                    let updatedSource = source;
                    if (responseTagsExist) {
                        // Update the <response> content in the source
                        updatedSource = source.replace(
                            /<response>[\s\S]*?<\/response>/,
                            `<response>\n${modelResponse}\n</response>`
                        );
                    } else {
                        // Append <response> tags to the source
                        updatedSource = `${source}\n\n<response>\n${modelResponse}\n</response>`;
                    }

                    // Extract the new content to render
                    const newResponseMatch = updatedSource.match(/<response>([\s\S]*?)<\/response>/);
                    if (newResponseMatch) {
                        contentToRender = newResponseMatch[1].trim();
                    }

                    // Get the current file
                    const file = plugin.app.workspace.getActiveFile();
                    if (file) {
                        // Read the file content
                        const fileContent = await plugin.app.vault.read(file);

                        // Replace the code block content in the file
                        const updatedFileContent = fileContent.replace(source, updatedSource);

                        // Write the updated content back to the file
                        await plugin.app.vault.modify(file, updatedFileContent);
                    }
                }

                // Hide the loader circle
                loaderCircle.style.display = 'none';   

            } catch (error) {
                if (error.name === 'AbortError') {
                    console.log('Docscribe Generate Aborted.');
                    button.textContent = 'Generate';
                    loaderCircle.style.display = 'none';
                    DocscribeGenerationNotice.textContent = 'Aborted.';
                    DocscribeGenerationNotice.style.color = '#ff6666';
                    DocscribeGenerationNotice.style.display = 'inline';
                    setTimeout(() => {
                        DocscribeGenerationNotice.style.display = 'none';
                    }, 2000);
                    return;
                } else {
                    console.error('Generation error:', error);
                    DocscribeGenerationNotice.textContent = 'Error occurred.';
                    DocscribeGenerationNotice.style.color = '#ff6666';
                    DocscribeGenerationNotice.style.display = 'inline';
                    setTimeout(() => {
                        DocscribeGenerationNotice.style.display = 'none';
                    }, 2000);
                }
            }

        };

        // Render the filtered content as Markdown
        if (source.includes('<response>') && source.includes('</response>')) {
            await MarkdownRenderer.render(plugin.app, contentToRender, DocscribeCodeBlockContent, '/', plugin);
        } else {
            await MarkdownRenderer.render(plugin.app, prompt, DocscribeCodeBlockContent, '/', plugin);
        }
    });
}