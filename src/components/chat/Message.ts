import { fileNameMessageHistoryJson, messageHistory } from 'src/view';
import { displayAppendButton, displayBotCopyButton, displayBotEditButton } from './Buttons';
import DocscribeGPT, { DocscribeSettings } from 'src/main';
import { getCurrentNoteContent } from '../editor/ReferenceCurrentNote';
import {htmlToMarkdown, setIcon } from 'obsidian';

// Add a new message to the messageHistory array and save it to the file
export async function addMessage(plugin: DocscribeGPT, input: string, messageType: 'userMessage' | 'botMessage', settings: DocscribeSettings, index: number) {
    const messageObj: { role: string; content: string; images: Uint8Array[] | string[] } = {
        role: '',
        content: '',
        images: [],
    };


    const referenceCurrentNoteContent = getCurrentNoteContent() || '';
    const fullInput = referenceCurrentNoteContent + input;

    // // Initialize an array to hold the absolute URLs
    const imagesVaultPath: Uint8Array[] | string[] | null = [];

    if (plugin.settings.OllamaConnection.ollamaModels.includes(plugin.settings.general.model)) {
        // Extract image links from the input
        const imageMatch = fullInput.match(/!?\[\[(.*?)\]\]/g);
        const imageLink = imageMatch 
        ? imageMatch
            .map(item => item.startsWith('!') ? item.slice(3, -2) : item.slice(2, -2))
            .filter(link => /\.(jpg|jpeg|png|gif|webp|bmp|tiff|tif|svg)$/i.test(link))
        : [];

        // Loop through each image link to get the full path
        if (imageLink.length > 0) {
        imageLink.forEach(link => {
            const imageFile = this.app.metadataCache.getFirstLinkpathDest(link, '');
            const image = imageFile ? this.app.vault.adapter.getFullPath(imageFile.path) : null;
            if (image) {
                imagesVaultPath.push(image);
            }
        });
        }

        // console.log('Image path:', imagesVaultPath);
    }

    if (messageType === 'userMessage') {
        messageObj.role = 'user';
        messageObj.content = input;
        messageObj.images = imagesVaultPath;
    } else if (messageType === 'botMessage') {
        messageObj.role = 'assistant';  
        messageObj.content = input;

        // Add buttons to botMessage after fetching message
        const messageContainerElDivs = document.querySelectorAll('#messageContainer div.userMessage, #messageContainer div.botMessage');
        const targetUserMessage = messageContainerElDivs[index];
        const targetBotMessage = targetUserMessage.nextElementSibling;

        const botMessageToolBarDiv = targetBotMessage?.querySelector('.botMessageToolBar');
        const buttonContainerDiv = document.createElement('div');
        buttonContainerDiv.className = 'button-container';
        botMessageToolBarDiv?.appendChild(buttonContainerDiv);

        // Change submit button to send icon
        const submitButton = document.querySelector('.submit-button') as HTMLElement;
        submitButton.textContent = 'send';
        setIcon(submitButton, 'arrow-up');
        submitButton.title = 'send';
        
        if (!messageObj.content.includes('commandBotMessage') && !messageObj.content.includes('errorBotMessage')) {
            const editButton = displayBotEditButton(plugin, messageObj.content);
            const copyBotButton = displayBotCopyButton(settings, messageObj.content);
            const appendButton = displayAppendButton(plugin, settings, messageObj.content);
            buttonContainerDiv.appendChild(editButton);
            buttonContainerDiv.appendChild(copyBotButton);
            buttonContainerDiv.appendChild(appendButton);
        }

    }
    
    try {
        messageHistory.splice(index + 1, 0, messageObj);
        const jsonString = JSON.stringify(messageHistory, null, 4);
        await plugin.app.vault.adapter.write(fileNameMessageHistoryJson(plugin), jsonString);

        const messageContainerEl = document.getElementById('messageContainer');

        if (messageContainerEl) {

            // Get last botMessage div
            const lastBotMessage = messageContainerEl.querySelector('.botMessage:last-child');

            if (lastBotMessage) {
                const getBlockLanguage = lastBotMessage.querySelectorAll('div[class^="block-language-"]');
        
                const replacedLangaugeBlocks = new Set<string>();

                getBlockLanguage.forEach(async block => {
                    if (!block.querySelector('.rendered-markdown-output') && messageType === 'botMessage') {
                        const blockToMarkdown = htmlToMarkdown(block as HTMLElement || '');
                        const markdownNode = document.createElement('div');
                        markdownNode.classList.add('rendered-markdown-output');
                        markdownNode.textContent = `\n\n<block-rendered>\n${blockToMarkdown}\n</block-rendered>\n\n`;
                
                        let renderedMarkdownOutput = markdownNode.textContent;

                        // Replace []() with [[]] in the rendered markdown output
                        renderedMarkdownOutput = renderedMarkdownOutput.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, p1, p2) => {
                            // Extract the filename without the path and extension
                            const filename = p2.split('/').pop().replace('.md', '');
                            return `[[${filename}]]`;
                        });
                        
                        // console.log('renderedMarkdownOutput', renderedMarkdownOutput);
                
                        const extractBlocks = (message: string) => {
                            const regex = /```(\w+)\n([\s\S]*?)```(\s*(<block-rendered>[\s\S]*?<\/block-rendered>\s*)?)/g;
                            let updatedMessage = message;
                
                            for (const match of [...message.matchAll(regex)]) {
                                const oldBlock = match[0];
                                const blockContent = match[2].trim();
                
                                // Check if this block has already been replaced
                                if (replacedLangaugeBlocks.has(oldBlock)) {
                                    continue; // Skip if already replaced
                                }
                
                                // Format the new block with renderedMarkdownOutput
                                const newBlock = `\`\`\`${match[1]}\n${blockContent}\n\`\`\`${renderedMarkdownOutput}`;
                
                                // Replace only the first occurrence of oldBlock in updatedMessage with newBlock
                                updatedMessage = updatedMessage.replace(oldBlock, newBlock);
                                
                                // Mark this block as replaced
                                replacedLangaugeBlocks.add(newBlock);
                                break; // Stop the loop after updating the first eligible block
                            }
                
                            return updatedMessage;
                        };
                
                        const updatedMessageContent = extractBlocks(messageObj.content);
                        // console.log('updatedMessageContent', updatedMessageContent);
                
                        // Update the message content with the rendered markdown output
                        messageObj.content = updatedMessageContent;
                
                        // Save the updated message history
                        const updatedJsonString = JSON.stringify(messageHistory, null, 4);
                        await plugin.app.vault.adapter.write(fileNameMessageHistoryJson(plugin), updatedJsonString);
                    }
                });


                const getNoteContent = lastBotMessage.querySelectorAll('.internal-embed.markdown-embed.inline-embed.is-loaded');

                const replacedNoteBlocks = new Set<string>();

                getNoteContent.forEach(async link => {
                    if (!link.querySelector('.rendered-markdown-output')) {
                        const blockToMarkdown = htmlToMarkdown(link as HTMLElement || '');
                        const markdownNode = document.createElement('div');
                        markdownNode.classList.add('rendered-markdown-output');
                        markdownNode.textContent = `\n\n<note-rendered>\n${blockToMarkdown}\n</note-rendered>\n\n`;
                
                        const renderedMarkdownOutput = markdownNode.textContent;
                
                        const extractLinks = (message: string) => {
                            // Match the note link and the rendered markdown output (e.g ![[]] )
                            const regex = /(!\[\[.*?\]\])(\s*(<note-rendered>[\s\S]*?<\/note-rendered>\s*)?)/g;
                            let updatedMessage = message;
                
                            // console.log('message', message);
                
                            for (const match of [...message.matchAll(regex)]) {
                                const oldLink = match[0];
                                const noteLink = match[1];
                
                                // Check if this block has already been replaced
                                if (replacedNoteBlocks.has(oldLink)) {
                                    continue; // Skip if already replaced
                                }
                
                                // Format the new block with renderedMarkdownOutput
                                const newLink = `${noteLink}\n${renderedMarkdownOutput}`;
                
                                // Replace only the first occurrence of oldBlock in updatedMessage with newBlock
                                updatedMessage = updatedMessage.replace(oldLink, newLink);
                
                                // Mark this block as replaced
                                replacedNoteBlocks.add(newLink);
                                break; // Stop the loop after updating the first eligible block
                            }
                
                            return updatedMessage;
                        };
                
                        const updatedMessageContent = extractLinks(messageObj.content);
                        // console.log('updatedMessageContent', updatedMessageContent);
                
                        // Update the message content with the rendered markdown output
                        messageObj.content = updatedMessageContent;
                
                        // Save the updated message history
                        const updatedJsonString = JSON.stringify(messageHistory, null, 4);
                        await plugin.app.vault.adapter.write(fileNameMessageHistoryJson(plugin), updatedJsonString);
                    }
                });
                
                
            }   
        }
    } catch (error) {
        console.error('Error writing to message history file:', error);
    }
}

// Add line break between consecutive <p> elements
export function addParagraphBreaks(messageBlock: { querySelectorAll: (arg0: string) =>  NodeListOf<HTMLElement>; }) {
    const paragraphs = messageBlock.querySelectorAll('p');
    for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i];
        const nextSibling = p.nextElementSibling;
        if (nextSibling && nextSibling.nodeName === 'P') {
            const br = document.createElement('br');
            const parent = p.parentNode;
            if (parent) {
                parent.insertBefore(br, nextSibling);
            }
        }
    }
}

export function updateUnresolvedInternalLinks(plugin: DocscribeGPT, divBlock: Element) {
    const internalLinks = divBlock.querySelectorAll('a');

    internalLinks.forEach(link => {
        let linkHref = link.getAttribute('href') || link.getAttribute('data-href');
        
        if (linkHref) {
            // Get the content before the #
            if (linkHref.includes('#')) {
                linkHref = linkHref.split('#')[0];
            }

            const linkExists = plugin.app.metadataCache.getFirstLinkpathDest(linkHref, '');
            
            if (!linkExists) {
                link.style.color = 'grey';
            } 
        }
    });
}
